#!/usr/bin/env bash
# Cut the film clips into the frame strip the page scrubs through.
# Usage: ./cut-frames.sh clip-1.mp4 clip-2.mp4 clip-3.mp4   (needs ffmpeg)
set -euo pipefail
cd "$(dirname "$0")"
fps=12
tmp=$(mktemp -d)
n=0
bounds="0"
i=0
for clip in "$@"; do
  i=$((i + 1))
  mkdir "$tmp/$i"
  ffmpeg -loglevel error -i "$clip" -vf "fps=$fps,scale=720:960:force_original_aspect_ratio=increase,crop=720:960" -c:v libwebp -quality 72 "$tmp/$i/%04d.webp"
  for f in "$tmp/$i"/*.webp; do
    mv "$f" "$tmp/$(printf 'f-%03d.webp' "$n")"
    n=$((n + 1))
  done
  bounds="$bounds,$((n - 1))"
done
mkdir -p frames
find frames -name 'f-*.webp' -exec mv {} "$tmp/$i/" \;
mv "$tmp"/f-*.webp frames/
echo "const FILM = /*FILM*/{\"count\":$n,\"bounds\":[$bounds]}/*END*/;"
