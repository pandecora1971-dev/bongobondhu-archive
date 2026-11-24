#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
python3 download_photos.py
read -r '?Press Return to close.'
