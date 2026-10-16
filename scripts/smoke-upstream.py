# Stub backend for scripts/nginx-smoke.sh: echoes the path and headers it got.
import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class Echo(BaseHTTPRequestHandler):
    server_version = "uvicorn"
    sys_version = ""

    def _answer(self) -> None:
        if self.path == "/api/v1/cabinet/redirect":
            self.send_response(307)
            self.send_header("Location", "http://smoke-upstream:8000/api/v1/cabinet/me")
            self.end_headers()
            return
        body = json.dumps({"path": self.path, "headers": {k.lower(): v for k, v in self.headers.items()}}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        if self.path == "/api/v1/cabinet/auth/refresh":
            self.send_header("Set-Cookie", "cabinet_refresh_token=x; Path=/api/v1/cabinet/auth; HttpOnly")
        self.end_headers()
        self.wfile.write(body)

    do_GET = _answer
    do_POST = _answer

    def log_message(self, *_args: object) -> None:
        pass


HTTPServer(("0.0.0.0", 8000), Echo).serve_forever()
