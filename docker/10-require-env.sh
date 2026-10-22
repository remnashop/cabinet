#!/bin/sh
set -eu
: "${API_URL:?API_URL must point at the remnashop backend, e.g. http://remnashop:5000}"
: "${CABINET_PROXY_SECRET:?CABINET_PROXY_SECRET must equal the backend's CABINET_PROXY_SECRET}"
