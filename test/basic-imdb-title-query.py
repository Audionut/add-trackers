#!/usr/bin/env python3
"""Query iMDB title data by IMDb ID."""

import json
import sys
from typing import Any, Dict

import requests


def build_query(imdb_id: str) -> Dict[str, Any]:
    return {
        "query": """
        query TitleQuery($id: ID!) {
            title(id: $id) {
                id
                titleText {
                    text
                }
                releaseYear {
                    year
                }
                runtime {
                    seconds
                }
            }
        }
        """,
        "variables": {
            "id": imdb_id,
        },
    }


def fetch_title_data(imdb_id: str) -> Dict[str, Any]:
    url = "https://api.graphql.imdb.com/"
    payload = build_query(imdb_id)

    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: basic-imdb-title-query.py <imdb_id>", file=sys.stderr)
        print("Example: basic-imdb-title-query.py tt0111161", file=sys.stderr)
        return 2

    imdb_id = sys.argv[1].strip()
    if not imdb_id:
        print("Error: imdb_id is required.", file=sys.stderr)
        return 2

    try:
        data = fetch_title_data(imdb_id)
    except requests.RequestException as exc:
        print(f"Request error: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(data, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
