#!/usr/bin/env bash
# Regenerate openapi.json from the remnashop core source — no running stack,
# Traefik, or SWAGGER_ENABLED needed. Imports the public router directly and
# asks FastAPI for its schema. Override the core location with REMNASHOP_DIR
# if it is not ../remnashop.
set -euo pipefail

core_dir="${REMNASHOP_DIR:-../remnashop}"
out="$(pwd)/openapi.json"

cd "$core_dir"
uv run python -c "
import json
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from src.__version__ import __version__
from src.web.endpoints import public_router

app = FastAPI(title='Remnashop API', version=__version__)
app.include_router(public_router)
schema = get_openapi(title='Remnashop API', version=__version__, routes=app.routes)
print(json.dumps(schema, ensure_ascii=False, indent=2))
" > "$out"
echo "wrote $out"
