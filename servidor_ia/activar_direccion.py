# -*- coding: utf-8 -*-
"""Activa la dirección pública (workers.dev) del servidor mega-cueva-ia, sin tocar la web de Cloudflare.
Pide el permiso de Cloudflare en la ventana (no se ve), registra el subdominio si falta y enciende workers.dev.
Uso: doble clic en ACTIVAR_DIRECCION.bat
"""
import getpass
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SCRIPT = "mega-cueva-ia"
SUBDOMINIO = "tradeitsimple"


def main():
    tok = getpass.getpass("Permiso de Cloudflare: pégalo con clic derecho y pulsa Enter (no se verá): ").strip()

    def api(metodo, ruta, cuerpo=None):
        req = urllib.request.Request("https://api.cloudflare.com/client/v4" + ruta, method=metodo,
                                     data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                                     headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            return json.loads(e.read() or b"{}")

    cuentas = api("GET", "/accounts").get("result") or []
    if not cuentas:
        print("Ese permiso no ve ninguna cuenta de Cloudflare.")
        sys.exit(1)
    cid = cuentas[0]["id"]
    sub = (api("GET", f"/accounts/{cid}/workers/subdomain").get("result") or {}).get("subdomain")
    if not sub:
        for intento in [SUBDOMINIO, SUBDOMINIO + "-tis", SUBDOMINIO + "solutions"]:
            r = api("PUT", f"/accounts/{cid}/workers/subdomain", {"subdomain": intento})
            if r.get("success"):
                sub = intento
                break
            print("No se pudo usar «" + intento + "»: " + "; ".join(e.get("message", "") for e in r.get("errors", [])))
    if not sub:
        print("No pude registrar el subdominio. Mándale a Claude una captura de esta ventana.")
        sys.exit(1)
    print("Subdominio: " + sub + ".workers.dev")
    r = api("POST", f"/accounts/{cid}/workers/scripts/{SCRIPT}/subdomain", {"enabled": True, "previews_enabled": False})
    if not r.get("success"):
        print("No pude encender workers.dev: " + "; ".join(e.get("message", "") for e in r.get("errors", [])))
        sys.exit(1)
    url = f"https://{SCRIPT}.{sub}.workers.dev"
    (RAIZ / "app" / "ia_remota.txt").write_text(url + "\n", encoding="utf-8")
    (RAIZ / "src" / "v6" / "ia_remota.js").write_text(f"window.MCT_IA_REMOTA={json.dumps(url)};\n", encoding="utf-8")
    print("\nLISTO. Dirección del servidor: " + url)
    print("Dile a Claude «ya».")


if __name__ == "__main__":
    main()
