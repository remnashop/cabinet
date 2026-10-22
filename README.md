# remnashop-cabinet

Customer web cabinet and Telegram Mini App for [remnashop](https://github.com/remnashop).

## Development

```bash
npm ci
VITE_MOCKS=1 npm run dev   # MSW mocks, no backend needed (email code: 000000)
npm run dev                # against a local backend on 127.0.0.1:5000
```

Against a local backend the dev server proxies `/api` to `/api/v1`, cookie paths included, the same way the image does. The backend must run with `APP_SECURE_COOKIES=false`, otherwise the browser drops its `Secure` cookies on plain http.

Checks: `npx tsc -b && npm run lint && npm test && npm run build`, and `sh scripts/nginx-smoke.sh` for the image's proxy.

## Deployment

The image serves the SPA and proxies `/api/*` to the backend's `/api/v1/*`, so the browser talks to one origin: the refresh token stays in an httponly cookie and the backend's address never reaches the client.

| Variable | Value |
|---|---|
| `API_URL` | the remnashop API, no trailing slash: `http://remnashop:5000` on the same server, `https://api.example.com` on another one |
| `CABINET_PROXY_SECRET` | the same value as the backend's `CABINET_PROXY_SECRET`; the backend trusts the client IP the cabinet passes only with it |

The container refuses to start without either.

### Next to remnashop on the same server

```yaml
services:
  remnashop-cabinet:
    image: ghcr.io/remnashop/remnashop-cabinet:latest
    container_name: remnashop-cabinet
    restart: unless-stopped
    environment:
      API_URL: http://remnashop:5000
      CABINET_PROXY_SECRET: ${CABINET_PROXY_SECRET}
    ports:
      - 127.0.0.1:5010:80
    networks:
      - remnawave-network

networks:
  remnawave-network:
    external: true
```

Then a site in your reverse proxy, e.g. Caddy:

```
cabinet.example.com {
    reverse_proxy 127.0.0.1:5010
}
```

### On a separate server

The same, with `API_URL: https://api.example.com` (the public address of the remnashop API) and without the shared docker network.

### Checklist

- Publish the cabinet port on `127.0.0.1` only and put a reverse proxy in front. The image trusts `X-Forwarded-For` from private addresses, which is what that proxy is; exposed directly, a client could choose its own IP.
- On the backend: `CABINET_PROXY_SECRET` (same value), `CABINET_DOMAIN=cabinet.example.com`.
- Register `https://cabinet.example.com/login/callback/<provider>` as a redirect URI with Telegram OIDC, Google and Yandex.
- Behind Cloudflare's proxy, add Cloudflare's ranges to `set_real_ip_from` in `docker/default.conf.template`, or every client shares Cloudflare's addresses in the rate limits.
- A leaked `CABINET_PROXY_SECRET` lets its holder pick the client IP the backend sees (rate limits, staff IP allowlists), never a session. Rotate it on both sides if it leaks.
