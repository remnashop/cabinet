#!/bin/sh
# Builds the image and checks the /api proxy against a stub backend.
set -eu
NET=cabinet-smoke
cleanup() { docker rm -f smoke-cabinet smoke-upstream >/dev/null 2>&1 || true; docker network rm "$NET" >/dev/null 2>&1 || true; }
fail() { echo "FAIL: $1"; echo "$2"; exit 1; }
cleanup
docker build -q -t remnashop-cabinet:smoke . >/dev/null
docker network create "$NET" >/dev/null
trap cleanup EXIT
docker run -d --name smoke-upstream --network "$NET" -v "$PWD/scripts/smoke-upstream.py:/app.py:ro" \
  python:3.12-alpine python /app.py >/dev/null
docker run -d --name smoke-cabinet --network "$NET" -e API_URL=http://smoke-upstream:8000 \
  -e CABINET_PROXY_SECRET=s3cret remnashop-cabinet:smoke >/dev/null
sleep 2
# a "front proxy" container on the same private network appends the real client last
req() { docker run --rm --network "$NET" curlimages/curl:8.10.1 -s -i "$@"; }

out=$(req -X POST http://smoke-cabinet/api/auth/refresh -H "X-Forwarded-For: 6.6.6.6, 203.0.113.7" \
  -H "X-Cabinet-Proxy-Secret: forged" -H "X-Cabinet-Client-IP: 6.6.6.6")
echo "$out" | grep -q '"path": "/api/v1/auth/refresh"' || fail "path rewrite" "$out"
echo "$out" | grep -q '"x-cabinet-proxy-secret": "s3cret"' || fail "secret overwrite" "$out"
echo "$out" | grep -q '"x-cabinet-client-ip": "203.0.113.7"' || fail "client ip" "$out"
echo "$out" | grep -qi 'set-cookie: cabinet_refresh_token=x; Path=/api/auth' || fail "cookie path" "$out"
if echo "$out" | grep -qi 'uvicorn'; then fail "backend server header leaked" "$out"; fi

out=$(req http://smoke-cabinet/api/redirect)
echo "$out" | grep -qi '^location: /api/users/me' || fail "redirect rewrite" "$out"

out=$(req -X POST "http://smoke-cabinet/api/unsubscribe?token=t")
echo "$out" | grep -q '"path": "/api/v1/unsubscribe?token=t"' || fail "unsubscribe path" "$out"

out=$(req http://smoke-cabinet/login)
echo "$out" | grep -q "frame-ancestors 'self' https://web.telegram.org" || fail "csp" "$out"

asset=$(req http://smoke-cabinet/ | grep -o '/assets/[^"]*\.js' | head -1)
out=$(req -o /dev/null -D - -H "Accept-Encoding: gzip" "http://smoke-cabinet$asset")
echo "$out" | grep -qi '^content-encoding: gzip' || fail "gzip" "$out"

if docker run --rm -e API_URL= -e CABINET_PROXY_SECRET= remnashop-cabinet:smoke >/dev/null 2>&1; then
  fail "missing env accepted" ""
fi
echo "nginx smoke OK"
