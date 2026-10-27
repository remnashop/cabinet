#!/bin/sh
set -eu
: "${API_URL:?API_URL must point at the remnashop backend, e.g. http://remnashop:5000}"
: "${CABINET_PROXY_SECRET:?CABINET_PROXY_SECRET must equal the backend's CABINET_PROXY_SECRET}"

# the secret lands inside a quoted nginx string: "$" or a quote would break it
case "$CABINET_PROXY_SECRET" in
  *[!A-Za-z0-9_-]*)
    echo "CABINET_PROXY_SECRET may hold only letters, digits, _ and -, e.g. openssl rand -hex 32" >&2
    exit 1
    ;;
esac

# plain http only to a docker-network name (no dot): elsewhere it carries the
# proxy secret and session tokens across the network in clear
case "$API_URL" in
  https://*) ;;
  http://*.*)
    echo "API_URL must be https:// unless it names a container on the docker network" >&2
    exit 1
    ;;
  http://*) ;;
  *)
    echo "API_URL must start with http:// or https://" >&2
    exit 1
    ;;
esac
