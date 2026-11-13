import os
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")


@app.get("/")
def index():
    return send_from_directory(str(STATIC_DIR), "index.html")


@app.get("/health")
def health():
    return jsonify(
        status="ok",
        app="HandOff 360",
        version="1.0.0",
        storage="localStorage",
        sectors=["salud", "logistica", "retail"],
    )


@app.after_request
def no_cache(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host=host, port=port, debug=debug)
