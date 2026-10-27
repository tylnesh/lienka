#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Michal Kohutek
# SPDX-License-Identifier: GPL-3.0-only

"""Local LLM runner auto-detection (/api/llm/detect): multi-port catalogue, urls override,
Ollama native /api/tags fallback, non-LLM endpoints ignored, env probe hosts honoured.

Self-contained: it boots fake runners on ephemeral ports and starts its own scratch server
(needs to set LIENKA_LLM_PROBE_HOSTS before boot), e.g.
    python3 tools/tests/llm_discover_test.py
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = "http://127.0.0.1:8502"
ok = True


def check(label, cond):
    global ok
    print(("PASS" if cond else "FAIL"), label)
    ok = ok and bool(cond)


def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


class Fake(BaseHTTPRequestHandler):
    routes = {}  # per-subclass: path -> (content-type, payload-bytes)

    def do_GET(self):  # noqa: N802
        hit = self.routes.get(self.path)
        if not hit:
            self.send_response(404)
            self.end_headers()
            return
        ctype, payload = hit
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *a):  # silence
        pass


def make_fake(routes):
    fake = type("Fake", (Fake,), {"routes": routes})
    srv = ThreadingHTTPServer(("127.0.0.1", 0), fake)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"


def main():
    data_dir = tempfile.mkdtemp(prefix="lienka-llm-test")
    ollama_routes = {"/api/tags": ("application/json", json.dumps(
        {"models": [{"name": "llama3.2:latest"}, {"name": "qwen3:4b"}]}).encode()),
        "/v1/models": ("application/json", b'{"data": []}')}
    openai_routes = {"/v1/models": ("application/json", json.dumps(
        {"data": [{"id": "fake-gpt"}, {"id": "fake-mini"}]}).encode())}
    garbage_routes = {"/v1/models": ("text/html", b"<html><body>nginx default</body></html>"),
                      "/api/tags": ("text/html", b"<html/>")}
    slow_routes = {"/v1/models": None}  # missing -> 404 fast; acts like a closed non-LLM port

    ollama, ollama_base = make_fake(ollama_routes)
    openai, openai_base = make_fake(openai_routes)
    garbage, garbage_base = make_fake(garbage_routes)
    slow, _ = make_fake(slow_routes)

    env = dict(os.environ, DATA_DIR=data_dir, PORT="8502", HTTP_PORT="0",
               LIENKA_LLM_PROBE_HOSTS=f"127.0.0.1:{ollama.server_address[1]},127.0.0.1:{openai.server_address[1]}")
    proc = subprocess.Popen([sys.executable, os.path.join(ROOT, "server.py")], env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(60):
            try:
                with urllib.request.urlopen(BASE + "/healthz", timeout=1):
                    break
            except Exception:
                time.sleep(0.25)

        # 1) explicit urls override: Ollama (native tags fallback) + OpenAI shape detected, HTML rejected
        st, d = call("POST", "/api/llm/detect", {"urls": [
            {"name": "OllamaTest", "base_url": ollama_base + "/v1"},
            {"name": "OpenAITest", "base_url": openai_base + "/v1"},
            {"name": "Garbage", "base_url": garbage_base + "/v1"},
        ]})
        names = [r["name"] for r in d.get("runners", [])]
        check("detect returns 200 with runners list", st == 200 and isinstance(d.get("runners"), list))
        check("only real runners detected (HTML garbage skipped)", names == ["OllamaTest", "OpenAITest"])
        by = {r["name"]: r for r in d["runners"]}
        check("ollama native /api/tags fallback lists models",
              by.get("OllamaTest", {}).get("models") == ["llama3.2:latest", "qwen3:4b"])
        check("openai-shape /models parsed", by.get("OpenAITest", {}).get("models") == ["fake-gpt", "fake-mini"])
        check("base_url echoed for the UI", by.get("OllamaTest", {}).get("base_url") == ollama_base + "/v1")
        check("legacy found/base_url = first runner", d.get("found") == ["llama3.2:latest", "qwen3:4b"] and d.get("base_url") == ollama_base + "/v1")

        # 2) default scan: LIENKA_LLM_PROBE_HOSTS ports discovered even without urls, standard closed ports ignored
        t0 = time.time()
        st, d2 = call("POST", "/api/llm/detect", {})
        bases = [r["base_url"] for r in d2.get("runners", [])]
        check("env LIENKA_LLM_PROBE_HOSTS probed", st == 200
              and ollama_base + "/v1" in bases and openai_base + "/v1" in bases)
        check(f"scan is fast even with 7 closed default ports ({time.time() - t0:.1f}s)", time.time() - t0 < 8)

        # 3) garbage only -> empty runners, no crash; junk urls body ignored -> falls back to default scan
        st, d3 = call("POST", "/api/llm/detect", {"urls": [{"name": "G", "base_url": garbage_base + "/v1"}]})
        check("garbage endpoint yields empty runners", st == 200 and d3.get("runners") == [])
        st, d4 = call("POST", "/api/llm/detect", {"urls": ["nonsense", 42, None]})
        check("junk urls body falls back to default scan", st == 200 and ollama_base + "/v1" in [r["base_url"] for r in d4.get("runners", [])])

        # 4) applying a detected runner through the normal settings save still round-trips
        st, d5 = call("POST", "/api/llm", {"provider": "custom", "base_url": openai_base + "/v1", "model": "fake-gpt"})
        check("applying a runner persists base/model", st == 200 and d5["llm"]["base_url"] == openai_base + "/v1" and d5["llm"]["model"] == "fake-gpt")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        for srv in (ollama, openai, garbage, slow):
            srv.shutdown()
        shutil.rmtree(data_dir, ignore_errors=True)
    print("RESULT:", "ALL OK" if ok else "FAILURES")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
