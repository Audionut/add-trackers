#!/usr/bin/env python3
"""Clone files and directory trees on Windows using ReFS block cloning. Needs ReFS volume and Windows 10 1709 or later for block cloning support, but will fall back to normal copying if needed."""

from __future__ import annotations

import argparse
import ctypes
import datetime
import os
import shutil
import stat
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Sequence

import msvcrt
from ctypes import wintypes


FSCTL_DUPLICATE_EXTENTS_TO_FILE = 0x00098344
FSCTL_SET_SPARSE = 0x000900C4
MAX_CLONE_CHUNK_SIZE = 1024 * 1024 * 1024
COPY_BUFFER_SIZE = 1024 * 1024
SCRIPT_BUILD = "refs_reflink.py debug build 2026-03-09-4"
FILE_ATTRIBUTE_SPARSE_FILE = 0x00000200
INVALID_FILE_ATTRIBUTES = 0xFFFFFFFF
FILE_BEGIN = 0

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

kernel32.GetVolumePathNameW.argtypes = [
    wintypes.LPCWSTR,
    wintypes.LPWSTR,
    wintypes.DWORD,
]
kernel32.GetVolumePathNameW.restype = wintypes.BOOL

kernel32.GetVolumeInformationW.argtypes = [
    wintypes.LPCWSTR,
    wintypes.LPWSTR,
    wintypes.DWORD,
    ctypes.POINTER(wintypes.DWORD),
    ctypes.POINTER(wintypes.DWORD),
    ctypes.POINTER(wintypes.DWORD),
    wintypes.LPWSTR,
    wintypes.DWORD,
]
kernel32.GetVolumeInformationW.restype = wintypes.BOOL

kernel32.GetDiskFreeSpaceW.argtypes = [
    wintypes.LPCWSTR,
    ctypes.POINTER(wintypes.DWORD),
    ctypes.POINTER(wintypes.DWORD),
    ctypes.POINTER(wintypes.DWORD),
    ctypes.POINTER(wintypes.DWORD),
]
kernel32.GetDiskFreeSpaceW.restype = wintypes.BOOL

kernel32.GetFileAttributesW.argtypes = [
    wintypes.LPCWSTR,
]
kernel32.GetFileAttributesW.restype = wintypes.DWORD

kernel32.SetFilePointerEx.argtypes = [
    wintypes.HANDLE,
    ctypes.c_longlong,
    ctypes.POINTER(ctypes.c_longlong),
    wintypes.DWORD,
]
kernel32.SetFilePointerEx.restype = wintypes.BOOL

kernel32.SetEndOfFile.argtypes = [
    wintypes.HANDLE,
]
kernel32.SetEndOfFile.restype = wintypes.BOOL

kernel32.DeviceIoControl.argtypes = [
    wintypes.HANDLE,
    wintypes.DWORD,
    wintypes.LPVOID,
    wintypes.DWORD,
    wintypes.LPVOID,
    wintypes.DWORD,
    ctypes.POINTER(wintypes.DWORD),
    wintypes.LPVOID,
]
kernel32.DeviceIoControl.restype = wintypes.BOOL


class DuplicateExtentsData(ctypes.Structure):
    _fields_ = [
        ("FileHandle", wintypes.HANDLE),
        ("SourceFileOffset", ctypes.c_longlong),
        ("TargetFileOffset", ctypes.c_longlong),
        ("ByteCount", ctypes.c_longlong),
    ]


class ReflinkError(RuntimeError):
    """Raised when a reflink operation cannot be completed."""


@dataclass
class FileCloneResult:
    source: Path
    clone_source: Path
    destination: Path
    method: str
    bytes_cloned: int
    bytes_copied: int


@dataclass
class CloneSummary:
    files: int = 0
    directories: int = 0
    reflinked_files: int = 0
    copied_files: int = 0
    bytes_cloned: int = 0
    bytes_copied: int = 0


def debug(message: str) -> None:
    timestamp = datetime.datetime.now().isoformat(timespec="seconds")
    print(f"[refs_reflink][{timestamp}] {message}", file=sys.stderr, flush=True)


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    debug(f"parse_args argv={list(argv)!r}")
    parser = argparse.ArgumentParser(
        description="Clone files on Windows using ReFS block cloning when possible."
    )
    parser.add_argument("source", help="Source file or directory")
    parser.add_argument("destination", help="Destination file or directory")
    parser.add_argument(
        "-r",
        "--recursive",
        action="store_true",
        help="Clone directory trees recursively",
    )
    parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="Overwrite existing destination files",
    )
    parser.add_argument(
        "--fallback-copy",
        action="store_true",
        help="Copy files normally when ReFS block cloning is unavailable",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned work without creating files",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Print each cloned file",
    )
    return parser.parse_args(argv)


def winerror(message: str) -> OSError:
    error = OSError(f"{message}: {ctypes.WinError(ctypes.get_last_error())}")
    debug(f"winerror message={message!r} error={error}")
    return error


def get_volume_root(path: Path) -> str:
    debug(f"get_volume_root path={path}")
    buffer = ctypes.create_unicode_buffer(260)
    resolved = str(path.resolve(strict=False))
    debug(f"get_volume_root resolved={resolved}")
    if not kernel32.GetVolumePathNameW(resolved, buffer, len(buffer)):
        raise winerror(f"Failed to get volume root for {path}")
    debug(f"get_volume_root result={buffer.value}")
    return buffer.value


def get_filesystem_name(volume_root: str) -> str:
    debug(f"get_filesystem_name volume_root={volume_root}")
    fs_name = ctypes.create_unicode_buffer(256)
    volume_name = ctypes.create_unicode_buffer(256)
    serial = wintypes.DWORD()
    max_component = wintypes.DWORD()
    flags = wintypes.DWORD()
    if not kernel32.GetVolumeInformationW(
        volume_root,
        volume_name,
        len(volume_name),
        ctypes.byref(serial),
        ctypes.byref(max_component),
        ctypes.byref(flags),
        fs_name,
        len(fs_name),
    ):
        raise winerror(f"Failed to get filesystem information for {volume_root}")
    debug(f"get_filesystem_name result={fs_name.value}")
    return fs_name.value


def get_cluster_size(volume_root: str) -> int:
    debug(f"get_cluster_size volume_root={volume_root}")
    sectors_per_cluster = wintypes.DWORD()
    bytes_per_sector = wintypes.DWORD()
    free_clusters = wintypes.DWORD()
    total_clusters = wintypes.DWORD()
    if not kernel32.GetDiskFreeSpaceW(
        volume_root,
        ctypes.byref(sectors_per_cluster),
        ctypes.byref(bytes_per_sector),
        ctypes.byref(free_clusters),
        ctypes.byref(total_clusters),
    ):
        raise winerror(f"Failed to get cluster size for {volume_root}")
    cluster_size = sectors_per_cluster.value * bytes_per_sector.value
    debug(
        "get_cluster_size sectors_per_cluster="
        f"{sectors_per_cluster.value} bytes_per_sector={bytes_per_sector.value} cluster_size={cluster_size}"
    )
    return cluster_size


def ensure_same_volume(source: Path, destination: Path) -> str:
    debug(f"ensure_same_volume source={source} destination={destination}")
    source_root = get_volume_root(source)
    destination_root = get_volume_root(destination.parent if destination.parent != Path("") else destination)
    debug(f"ensure_same_volume source_root={source_root} destination_root={destination_root}")
    if os.path.normcase(source_root) != os.path.normcase(destination_root):
        raise ReflinkError("source and destination must be on the same volume")
    return source_root


def ensure_refs_volume(volume_root: str) -> int:
    debug(f"ensure_refs_volume volume_root={volume_root}")
    filesystem_name = get_filesystem_name(volume_root)
    if filesystem_name.upper() != "REFS":
        raise ReflinkError(f"volume {volume_root} is {filesystem_name}, not ReFS")
    cluster_size = get_cluster_size(volume_root)
    debug(f"ensure_refs_volume cluster_size={cluster_size}")
    return cluster_size


def ensure_destination_parent(path: Path) -> None:
    debug(f"ensure_destination_parent path={path}")
    parent = path.parent
    if parent and not parent.exists():
        debug(f"ensure_destination_parent creating parent={parent}")
        parent.mkdir(parents=True, exist_ok=True)


def is_sparse_file(path: Path) -> bool:
    debug(f"is_sparse_file path={path}")
    attributes = kernel32.GetFileAttributesW(str(path))
    if attributes == INVALID_FILE_ATTRIBUTES:
        raise winerror(f"Failed to get file attributes for {path}")
    is_sparse = bool(attributes & FILE_ATTRIBUTE_SPARSE_FILE)
    debug(f"is_sparse_file attributes=0x{attributes:08X} is_sparse={is_sparse}")
    return is_sparse


def mark_file_sparse(file_handle: int, path: Path) -> None:
    debug(f"mark_file_sparse path={path} file_handle={file_handle}")
    returned = wintypes.DWORD()
    if not kernel32.DeviceIoControl(
        wintypes.HANDLE(file_handle),
        FSCTL_SET_SPARSE,
        None,
        0,
        None,
        0,
        ctypes.byref(returned),
        None,
    ):
        raise winerror(f"Failed to mark destination as sparse for {path}")
    debug("mark_file_sparse succeeded")


def set_file_end(file_handle: int, path: Path, size: int) -> None:
    debug(f"set_file_end path={path} file_handle={file_handle} size={size}")
    new_position = ctypes.c_longlong()
    if not kernel32.SetFilePointerEx(
        wintypes.HANDLE(file_handle),
        ctypes.c_longlong(size),
        ctypes.byref(new_position),
        FILE_BEGIN,
    ):
        raise winerror(f"Failed to seek destination EOF for {path}")
    debug(f"set_file_end positioned new_position={new_position.value}")
    if not kernel32.SetEndOfFile(wintypes.HANDLE(file_handle)):
        raise winerror(f"Failed to extend destination EOF for {path}")
    debug("set_file_end succeeded")


def resolve_source_path(source: Path) -> Path:
    debug(f"resolve_source_path source={source}")
    try:
        source_info = source.lstat()
    except FileNotFoundError:
        debug(f"resolve_source_path missing source={source}")
        raise
    except OSError as exc:
        debug(f"resolve_source_path lstat failed source={source} error={exc}")
        raise ReflinkError(f"failed to access source path: {source}: {exc}") from exc

    if not stat.S_ISLNK(source_info.st_mode):
        debug(f"resolve_source_path source is not symlink source={source}")
        return source

    try:
        resolved = source.resolve(strict=True)
        debug(f"resolve_source_path resolved symlink source={source} resolved={resolved}")
        return resolved
    except OSError as exc:
        debug(f"resolve_source_path resolve failed source={source} error={exc}")
        raise ReflinkError(f"failed to resolve source symlink: {source}: {exc}") from exc


def copy_file_data(source_handle, destination_handle, offset: int, length: int) -> None:
    debug(f"copy_file_data offset={offset} length={length}")
    if length <= 0:
        debug("copy_file_data nothing to copy")
        return

    source_handle.seek(offset)
    destination_handle.seek(offset)

    remaining = length
    while remaining > 0:
        chunk = source_handle.read(min(COPY_BUFFER_SIZE, remaining))
        if not chunk:
            raise ReflinkError("unexpected end of file while copying file tail")
        destination_handle.write(chunk)
        remaining -= len(chunk)
        debug(f"copy_file_data wrote chunk_size={len(chunk)} remaining={remaining}")


def duplicate_extent(target_handle: int, source_handle: int, source_offset: int, target_offset: int, byte_count: int) -> None:
    debug(
        "duplicate_extent "
        f"target_handle={target_handle} source_handle={source_handle} "
        f"source_offset={source_offset} target_offset={target_offset} byte_count={byte_count}"
    )
    data = DuplicateExtentsData(
        FileHandle=wintypes.HANDLE(source_handle),
        SourceFileOffset=source_offset,
        TargetFileOffset=target_offset,
        ByteCount=byte_count,
    )
    returned = wintypes.DWORD()
    if not kernel32.DeviceIoControl(
        wintypes.HANDLE(target_handle),
        FSCTL_DUPLICATE_EXTENTS_TO_FILE,
        ctypes.byref(data),
        ctypes.sizeof(data),
        None,
        0,
        ctypes.byref(returned),
        None,
    ):
        raise winerror("ReFS block clone failed")
    debug("duplicate_extent succeeded")


def clone_file_refs(source: Path, clone_source: Path, destination: Path, overwrite: bool) -> FileCloneResult:
    debug(
        f"clone_file_refs source={source} clone_source={clone_source} "
        f"destination={destination} overwrite={overwrite}"
    )
    if destination.exists():
        if destination.is_dir():
            raise ReflinkError(f"destination is a directory: {destination}")
        if not overwrite:
            raise ReflinkError(f"destination already exists: {destination}")

    ensure_destination_parent(destination)
    volume_root = ensure_same_volume(clone_source, destination)
    cluster_size = ensure_refs_volume(volume_root)
    source_size = clone_source.stat().st_size
    source_is_sparse = is_sparse_file(clone_source)
    debug(
        f"clone_file_refs volume_root={volume_root} cluster_size={cluster_size} "
        f"source_size={source_size} source_is_sparse={source_is_sparse}"
    )

    source_mode = "rb"
    destination_mode = "w+b"
    with clone_source.open(source_mode) as src_handle, destination.open(destination_mode) as dst_handle:
        source_win_handle = msvcrt.get_osfhandle(src_handle.fileno())
        destination_win_handle = msvcrt.get_osfhandle(dst_handle.fileno())
        debug(f"clone_file_refs opened files source={clone_source} destination={destination}")
        debug(
            f"clone_file_refs source_win_handle={source_win_handle} "
            f"destination_win_handle={destination_win_handle}"
        )

        if source_is_sparse:
            mark_file_sparse(destination_win_handle, destination)

        set_file_end(destination_win_handle, destination, source_size)
        debug(f"clone_file_refs extended destination EOF to {source_size} bytes")

        cloneable_size = source_size - (source_size % cluster_size)
        debug(f"clone_file_refs cloneable_size={cloneable_size}")
        offset = 0
        while offset < cloneable_size:
            chunk_size = min(MAX_CLONE_CHUNK_SIZE, cloneable_size - offset)
            debug(f"clone_file_refs duplicating chunk offset={offset} chunk_size={chunk_size}")
            duplicate_extent(
                target_handle=destination_win_handle,
                source_handle=source_win_handle,
                source_offset=offset,
                target_offset=offset,
                byte_count=chunk_size,
            )
            offset += chunk_size

        tail_size = source_size - cloneable_size
        debug(f"clone_file_refs tail_size={tail_size}")
        if tail_size:
            copy_file_data(src_handle, dst_handle, cloneable_size, tail_size)

    shutil.copystat(clone_source, destination, follow_symlinks=False)
    method = "reflink" if cloneable_size == source_size else "reflink+copy-tail"
    debug(f"clone_file_refs completed method={method}")
    return FileCloneResult(
        source=source,
        clone_source=clone_source,
        destination=destination,
        method=method,
        bytes_cloned=cloneable_size,
        bytes_copied=source_size - cloneable_size,
    )


def clone_file(source: Path, destination: Path, overwrite: bool, fallback_copy: bool) -> FileCloneResult:
    debug(
        f"clone_file source={source} destination={destination} overwrite={overwrite} fallback_copy={fallback_copy}"
    )
    clone_source = resolve_source_path(source)
    source_was_symlink = clone_source != source
    debug(f"clone_file clone_source={clone_source} source_was_symlink={source_was_symlink}")

    try:
        return clone_file_refs(source, clone_source, destination, overwrite=overwrite)
    except Exception as exc:
        debug(f"clone_file reflink failure error={exc}")
        if source_was_symlink:
            raise ReflinkError(
                f"{source} -> {destination}: reflink failed for resolved symlink source {clone_source}: {exc}"
            ) from exc
        if destination.exists() and not overwrite:
            raise
        if not fallback_copy:
            raise ReflinkError(f"{source} -> {destination}: {exc}") from exc

        ensure_destination_parent(destination)
        if destination.exists() and overwrite:
            debug(f"clone_file removing existing destination={destination}")
            destination.unlink()
        debug(f"clone_file falling back to copy clone_source={clone_source} destination={destination}")
        shutil.copy2(clone_source, destination)
        size = clone_source.stat().st_size
        debug(f"clone_file fallback copy completed size={size}")
        return FileCloneResult(
            source=source,
            clone_source=clone_source,
            destination=destination,
            method="copy",
            bytes_cloned=0,
            bytes_copied=size,
        )


def format_result(result: FileCloneResult) -> str:
    debug(f"format_result result_method={result.method} source={result.source} clone_source={result.clone_source}")
    message = f"{result.method}: {result.source} -> {result.destination}"
    if result.clone_source != result.source:
        message += f" (resolved source: {result.clone_source})"
    return message


def iter_directory_files(source_root: Path) -> Iterator[tuple[Path, Path]]:
    debug(f"iter_directory_files source_root={source_root}")
    for root, dirs, files in os.walk(source_root):
        root_path = Path(root)
        relative_root = root_path.relative_to(source_root)
        for directory in dirs:
            debug(f"iter_directory_files yielding directory={root_path / directory}")
            yield root_path / directory, relative_root / directory
        for file_name in files:
            debug(f"iter_directory_files yielding file={root_path / file_name}")
            yield root_path / file_name, relative_root / file_name


def clone_tree(
    source_root: Path,
    destination_root: Path,
    overwrite: bool,
    fallback_copy: bool,
    dry_run: bool,
    verbose: bool,
) -> CloneSummary:
    debug(
        f"clone_tree source_root={source_root} destination_root={destination_root} "
        f"overwrite={overwrite} fallback_copy={fallback_copy} dry_run={dry_run} verbose={verbose}"
    )
    summary = CloneSummary()
    destination_root.mkdir(parents=True, exist_ok=True)
    summary.directories += 1

    for source_path, relative_path in iter_directory_files(source_root):
        destination_path = destination_root / relative_path
        if source_path.is_dir():
            debug(f"clone_tree directory source_path={source_path} destination_path={destination_path}")
            if dry_run:
                if verbose:
                    print(f"mkdir {destination_path}")
            else:
                destination_path.mkdir(parents=True, exist_ok=True)
            summary.directories += 1
            continue

        summary.files += 1
        debug(f"clone_tree file source_path={source_path} destination_path={destination_path}")
        if dry_run:
            print(f"clone {source_path} -> {destination_path}")
            continue

        result = clone_file(
            source=source_path,
            destination=destination_path,
            overwrite=overwrite,
            fallback_copy=fallback_copy,
        )
        apply_result(summary, result)
        if verbose:
            print(format_result(result))

    return summary


def apply_result(summary: CloneSummary, result: FileCloneResult) -> None:
    debug(f"apply_result method={result.method} bytes_cloned={result.bytes_cloned} bytes_copied={result.bytes_copied}")
    if result.method.startswith("reflink"):
        summary.reflinked_files += 1
    else:
        summary.copied_files += 1
    summary.bytes_cloned += result.bytes_cloned
    summary.bytes_copied += result.bytes_copied


def validate_source(source: Path, recursive: bool) -> None:
    debug(f"validate_source source={source} recursive={recursive}")
    if not source.exists():
        raise FileNotFoundError(f"source does not exist: {source}")
    if source.is_dir() and not recursive:
        raise ReflinkError("source is a directory, use --recursive")


def clone_path(
    source: Path,
    destination: Path,
    recursive: bool,
    overwrite: bool,
    fallback_copy: bool,
    dry_run: bool,
    verbose: bool,
) -> CloneSummary:
    debug(
        f"clone_path source={source} destination={destination} recursive={recursive} "
        f"overwrite={overwrite} fallback_copy={fallback_copy} dry_run={dry_run} verbose={verbose}"
    )
    validate_source(source, recursive)

    if source.is_file():
        debug("clone_path handling single file source")
        summary = CloneSummary(files=1)
        target = destination
        if destination.exists() and destination.is_dir():
            target = destination / source.name
        debug(f"clone_path single file target={target}")

        if dry_run:
            print(f"clone {source} -> {target}")
            return summary

        result = clone_file(
            source=source,
            destination=target,
            overwrite=overwrite,
            fallback_copy=fallback_copy,
        )
        apply_result(summary, result)
        if verbose:
            print(format_result(result))
        return summary

    target_root = destination / source.name if destination.exists() and destination.is_dir() else destination
    debug(f"clone_path handling directory target_root={target_root}")
    return clone_tree(
        source_root=source,
        destination_root=target_root,
        overwrite=overwrite,
        fallback_copy=fallback_copy,
        dry_run=dry_run,
        verbose=verbose,
    )


def print_summary(summary: CloneSummary, dry_run: bool) -> None:
    debug(f"print_summary dry_run={dry_run} summary={summary}")
    prefix = "Planned" if dry_run else "Completed"
    print(
        f"{prefix}: {summary.files} file(s), {summary.directories} director"
        f"{'ies' if summary.directories != 1 else 'y'}, "
        f"{summary.reflinked_files} reflinked, {summary.copied_files} copied, "
        f"{summary.bytes_cloned} byte(s) cloned, {summary.bytes_copied} byte(s) copied"
    )


def main(argv: Sequence[str] | None = None) -> int:
    debug(f"SCRIPT START build={SCRIPT_BUILD} argv={sys.argv!r} cwd={Path.cwd()} pid={os.getpid()}")
    if os.name != "nt":
        print("This tool only supports Windows.", file=sys.stderr)
        return 2

    args = parse_args(argv or sys.argv[1:])
    debug(f"main parsed_args={args}")
    source = Path(args.source)
    destination = Path(args.destination)
    debug(f"main source={source} destination={destination}")

    try:
        summary = clone_path(
            source=source,
            destination=destination,
            recursive=args.recursive,
            overwrite=args.force,
            fallback_copy=args.fallback_copy,
            dry_run=args.dry_run,
            verbose=args.verbose,
        )
    except Exception as exc:
        debug(f"main error={exc}")
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print_summary(summary, dry_run=args.dry_run)
    debug("main completed successfully")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
