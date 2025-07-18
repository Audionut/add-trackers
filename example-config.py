# rename this file to config.py
# This file contains the configuration settings for the cross-seed helper script.
# Make sure to adjust the paths and settings according to your environment.

config = {
    'DEFAULT': {
        'default_torrent_client': 'qBittorrent'
    },
    'TORRENT_CLIENTS': {
        'qBittorrent': {
            'qbit_url': 'http://localhost',
            'qbit_port': 8080,
            'qbit_user': 'admin',
            'qbit_pass': 'adminadmin',
            'VERIFY_WEBUI_CERTIFICATE': False
        }
    },
    "file_path": "/path/to/torrent/files",  # Change this to your cross-seed "outputDir" files directory
    "hashes_path": "X:\\path\\to\\hashes.txt",  # Change this to your desired hashes file path
    "cross_seed_config_path": "C:\\Users\\USERNAME\\AppData\\Local\\cross-seed\\config.js"  # Change this to your desired cross-seed config file path
}
