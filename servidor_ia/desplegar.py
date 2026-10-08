# -*- coding: utf-8 -*-
"""Publica el servidor de IA (Gemini con tope) en tu cuenta de Cloudflare, en un paso.

1. Abre el navegador para que autorices Cloudflare (solo la primera vez).
2. Crea el contador (KV) si no existe y lo apunta en wrangler.toml.
3. Sube la clave de Gemini como SECRETO (la lee de C:\\Users\\trade\\casa\\.env sin mostrarla).
4. Publica el servidor y escribe su dirección en ../app/ia_remota.txt y en src/v6/ia_remota.js.
Uso: doble clic en DESPLEGAR_IA.bat (o: python servidor_ia/desplegar.py)
"""
import json
import re
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
ENV = Path(r"C:\Users\trade\casa\.env")
NPX = "npx.cmd" if sys.platform.startswith("win") else "npx"


import os
ENTORNO = dict(os.environ)


def wr(*args, entrada=None, capturar=True):
    r = subprocess.run([NPX, "--yes", "wrangler", *args], cwd=AQUI, input=entrada, text=True,
                       capture_output=capturar, encoding="utf-8", env=ENTORNO)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def main():
    code, out = wr("whoami")
    if "not authenticated" in out.lower() or code != 0:
        import getpass, urllib.request
        print("Permiso de Cloudflare (plantilla «Edit Cloudflare Workers»).")
        tok = getpass.getpass("Pégalo aquí con clic derecho y pulsa Enter (no se verá): ").strip()
        if not tok:
            print("Sin permiso de Cloudflare no puedo seguir.")
            sys.exit(1)
        def api(ruta):
            req = urllib.request.Request("https://api.cloudflare.com/client/v4" + ruta, headers={"Authorization": "Bearer " + tok})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        try:
            ok = api("/user/tokens/verify").get("success")
            cuentas = api("/accounts").get("result", [])
        except Exception as e:
            print("Cloudflare no acepta ese permiso: " + str(e)[:200])
            sys.exit(1)
        if not ok or not cuentas:
            print("El permiso no es válido o no ve ninguna cuenta.")
            sys.exit(1)
        ENTORNO["CLOUDFLARE_API_TOKEN"] = tok
        ENTORNO["CLOUDFLARE_ACCOUNT_ID"] = cuentas[0]["id"]
        print("Conectado a Cloudflare: " + cuentas[0].get("name", ""))
    else:
        print("Conectado a Cloudflare.")
    toml = (AQUI / "wrangler.toml").read_text(encoding="utf-8")
    if 'id = "PENDIENTE"' in toml:
        code, out = wr("kv", "namespace", "create", "CONTADOR")
        m = re.search(r'id\s*=\s*"([0-9a-f]{32})"', out) or re.search(r'"id"\s*:\s*"([0-9a-f]{32})"', out)
        if not m:
            print("No pude crear el contador:\n" + out[-800:])
            sys.exit(1)
        toml = toml.replace('id = "PENDIENTE"', f'id = "{m.group(1)}"')
        (AQUI / "wrangler.toml").write_text(toml, encoding="utf-8")
        print("Contador creado.")
    clave = ""
    for linea in ENV.read_text(encoding="utf-8", errors="ignore").splitlines():
        if linea.strip().startswith("GEMINI_API_KEY"):
            clave = linea.split("=", 1)[1].strip().strip('"').strip("'")
    if not clave:
        print("No encuentro GEMINI_API_KEY en " + str(ENV))
        sys.exit(1)
    code, out = wr("secret", "put", "GEMINI_API_KEY", entrada=clave + "\n")
    print("Clave de Gemini guardada como secreto." if code == 0 else "Error con el secreto:\n" + out[-500:])
    import getpass
    print("\nPermiso de GitHub para el buzón de feedback (crear Issues en mega-cueva-tester).")
    tok = getpass.getpass("Pégalo aquí y pulsa Enter (no se verá al escribir; Enter vacío = saltar): ").strip()
    if tok:
        code, out = wr("secret", "put", "GITHUB_TOKEN", entrada=tok + "\n")
        print("Permiso de GitHub guardado como secreto." if code == 0 else "Error con el permiso:\n" + out[-500:])
    code, out = wr("deploy")
    m = re.search(r"https://[a-z0-9.-]+\.workers\.dev", out)
    if code != 0 or not m:
        print("No se pudo publicar:\n" + out[-1200:])
        sys.exit(1)
    url = m.group(0)
    (RAIZ / "app" / "ia_remota.txt").write_text(url + "\n", encoding="utf-8")
    (RAIZ / "src" / "v6" / "ia_remota.js").write_text(f"window.MCT_IA_REMOTA={json.dumps(url)};\n", encoding="utf-8")
    print("\nLISTO. Servidor de IA publicado en: " + url)
    print("Ahora dile a Claude: «ya está la IA» para conectarla al tester y subirlo.")


if __name__ == "__main__":
    main()
