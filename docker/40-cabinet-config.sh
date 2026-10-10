#!/bin/sh
set -eu
# JSON-escape backslashes and quotes so any API_URL stays a string literal
api_url=$(printf '%s' "${API_URL:-/api/v1}" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf 'window.__CONFIG__ = { apiUrl: "%s" };\n' "$api_url" > /usr/share/nginx/html/config.js
