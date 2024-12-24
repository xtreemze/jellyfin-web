#!/bin/bash

TARGET_DIR="/Volumes/root/usr/share/jellyfin/web"
SOURCE_DIR="/Users/carlosvelasco/Repositories/jellyfin-web/dist"

echo "Checking if target directory exists..."
if [ -d "$TARGET_DIR" ]; then
  echo "Target directory exists. Clearing contents..."
  if sudo rm -rf "$TARGET_DIR"/*; then
    echo "Contents cleared successfully."
  else
    echo "Failed to clear contents. Exiting."
    exit 1
  fi

  echo "Copying new files to target directory with progress meter..."
  if sudo rsync -a --progress "$SOURCE_DIR"/ "$TARGET_DIR"/; then
    echo "Files copied successfully."
  else
    echo "Failed to copy files. Exiting."
    exit 1
  fi
else
  echo "Target directory does not exist. Exiting."
  exit 1
fi