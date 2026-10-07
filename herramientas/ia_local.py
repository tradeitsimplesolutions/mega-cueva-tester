# -*- coding: utf-8 -*-
"""IA local para MEGA CUEVA TESTER: un servidor mínimo en tu ordenador (127.0.0.1:8787).

El tester (index.html) lo detecta solo y le manda la idea; este programa la reenvía a:
  - DeepSeek (por defecto), con la clave leída de tu ordenador (variable DEEPSEEK_API_KEY o un .env),
  - o Claude Code local (`--claude`): usa tu sesión de Claude Code con `claude -p`, sin clave.
La clave NUNCA sale de tu ordenador hacia el tester: solo viaja de aquí a DeepSeek.

Uso:  python herramientas/ia_local.py                 (DeepSeek, clave de DEEPSEEK_API_KEY o de --env)
      python herramientas/ia_local.py --env C:/ruta/.env
      python herramientas/ia_local.py --claude          (Claude Code local)
"""
from __future__ import annotations
import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PUERTO = 8787
DEEPSEEK = "https://api.deepseek.com/chat/completions"
ENV_POR_DEFECTO = r"C:\Users\trade\casa\.env"


def clave_deepseek(ruta_env: str | None) -> str:
    k = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if k:
        return k
    for ruta in [ruta_env, ENV_POR_DEFECTO]:
        if ruta and os.path.exists(ruta):
            for linea in open(ruta, encoding="utf-8", errors="ignore"):
                if linea.strip().startswith("DEEPSEEK_API_KEY"):
                    return linea.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def via_claude(cuerpo: dict) -> dict:
    exe = shutil.which("claude") or shutil.which("claude.cmd")
    if not exe:
        raise RuntimeError("No encuentro el comando 'claude' (Claude Code) en este ordenador.")
    partes = []
    for m in cuerpo.get("messages", []):
        partes.append(f"[{m.get('role', 'user').upper()}]\n{m.get('content', '')}")
    partes.append("[INSTRUCCIÓN FINAL]\nResponde SOLO con el objeto JSON pedido, sin texto antes ni después, sin ```.")
    r = subprocess.run([exe, "-p", "\n\n".join(partes), "--output-format", "text"], capture_output=True,
                       text=True, encoding="utf-8", timeout=170)
    if r.returncode != 0:
        raise RuntimeError("Claude Code devolvió un error: " + (r.stderr or r.stdout)[:300])
    txt = r.stdout.strip()
    if txt.startswith("```"):
        txt = txt.strip("`")
        txt = txt[txt.find("{"):]
    return {"choices": [{"message": {"role": "assistant", "content": txt}}], "usage": {}, "model": "claude-code-local"}


class Manejador(BaseHTTPRequestHandler):
    motor = "deepseek"
    clave = ""

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type, authorization")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _json(self, codigo: int, obj: dict):
        datos = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(datos)))
        self.end_headers()
        self.wfile.write(datos)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/estado"):
            self._json(200, {"ok": True, "motor": self.motor})
        else:
            self._json(404, {"error": "ruta desconocida"})

    def do_POST(self):
        if not self.path.startswith("/v1/chat/completions"):
            self._json(404, {"error": "ruta desconocida"})
            return
        n = int(self.headers.get("Content-Length", "0") or 0)
        try:
            cuerpo = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            self._json(400, {"error": "JSON no válido"})
            return
        try:
            if self.motor == "claude":
                self._json(200, via_claude(cuerpo))
                return
            req = urllib.request.Request(DEEPSEEK, data=json.dumps(cuerpo).encode("utf-8"), method="POST",
                                         headers={"Content-Type": "application/json",
                                                  "Authorization": "Bearer " + self.clave})
            with urllib.request.urlopen(req, timeout=60) as r:
                self._json(r.status, json.loads(r.read() or b"{}"))
        except urllib.error.HTTPError as e:
            try:
                det = json.loads(e.read() or b"{}")
            except Exception:
                det = {}
            self._json(e.code, {"error": det or str(e)})
        except Exception as e:
            self._json(502, {"error": str(e)})

    def log_message(self, fmt, *args):
        sys.stdout.write("  " + (fmt % args) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--claude", action="store_true", help="usar Claude Code local en vez de DeepSeek")
    ap.add_argument("--env", default=None, help="ruta a un .env con DEEPSEEK_API_KEY")
    a = ap.parse_args()
    Manejador.motor = "claude" if a.claude else "deepseek"
    if not a.claude:
        Manejador.clave = clave_deepseek(a.env)
        if not Manejador.clave:
            print("No encuentro DEEPSEEK_API_KEY (ni en el entorno ni en el .env). Usa --env o --claude.")
            sys.exit(1)
    print(f"IA local lista ({Manejador.motor}) en http://127.0.0.1:{PUERTO} — deja esta ventana abierta.")
    print("Abre el tester (app/index.html): verás «IA local conectada».")
    ThreadingHTTPServer(("127.0.0.1", PUERTO), Manejador).serve_forever()


if __name__ == "__main__":
    main()
