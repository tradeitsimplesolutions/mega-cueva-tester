// Servidor de IA de MEGA CUEVA TESTER (Cloudflare Worker, plan gratuito).
// Recibe la petición del tester (formato OpenAI) y la pasa a Gemini con la clave guardada como secreto.
// Límites: TOPE_DIA peticiones al día en total y TOPE_IP_DIA por persona (IP). La clave nunca llega al navegador.
//
// Secretos/variables (wrangler.toml + `wrangler secret put GEMINI_API_KEY`):
//   GEMINI_API_KEY  · clave de Google AI Studio (secreto)
//   MODELO          · p. ej. "gemini-2.5-flash"
//   TOPE_DIA        · p. ej. "1000"
//   TOPE_IP_DIA     · p. ej. "30"
//   CONTADOR        · KV namespace para los contadores

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const ORIGENES = ["https://tradeitsimplesolutions.github.io", "null", "http://127.0.0.1:8642", "http://localhost:8642"];

function cors(origen) {
  const o = ORIGENES.includes(origen) || (origen || "").startsWith("file://") ? origen || "*" : ORIGENES[0];
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(obj, estado, origen) {
  return new Response(JSON.stringify(obj), { status: estado, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origen) } });
}

async function contar(env, clave, tope) {
  if (!env.CONTADOR) return { ok: true, n: 0 };
  const n = parseInt((await env.CONTADOR.get(clave)) || "0", 10);
  if (n >= tope) return { ok: false, n };
  await env.CONTADOR.put(clave, String(n + 1), { expirationTtl: 60 * 60 * 30 });
  return { ok: true, n: n + 1 };
}

export default {
  async fetch(req, env) {
    const origen = req.headers.get("Origin");
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origen) });

    const dia = new Date().toISOString().slice(0, 10);
    const topeDia = parseInt(env.TOPE_DIA || "1000", 10), topeIp = parseInt(env.TOPE_IP_DIA || "30", 10);

    if (req.method === "GET" && url.pathname === "/estado") {
      const usados = env.CONTADOR ? parseInt((await env.CONTADOR.get("dia:" + dia)) || "0", 10) : 0;
      return json({ ok: true, motor: "gemini", modelo: env.MODELO || "gemini-3.5-flash", restantes_hoy: Math.max(0, topeDia - usados) }, 200, origen);
    }
    if (req.method === "POST" && url.pathname === "/feedback") {
      if (!env.GITHUB_TOKEN) return json({ error: "El buzón de feedback no está activado." }, 503, origen);
      let f;
      try { f = await req.json(); } catch { return json({ error: "JSON no válido" }, 400, origen); }
      const texto = String(f.texto || "").trim().slice(0, 4000);
      if (texto.length < 3) return json({ error: "Escribe tu comentario." }, 400, origen);
      const ipf = req.headers.get("CF-Connecting-IP") || "?";
      const lim = await contar(env, "fb:" + dia + ":" + ipf, parseInt(env.TOPE_FEEDBACK_IP || "5", 10));
      if (!lim.ok) return json({ error: "Ya enviaste varios comentarios hoy. ¡Gracias!" }, 429, origen);
      const email = String(f.email || "").trim().slice(0, 120);
      const cuerpo = [texto, "", "---",
        "Pantalla: " + String(f.vista || "?").slice(0, 60),
        "Estrategia: " + String(f.estrategia || "?").slice(0, 120),
        "Email: " + (email || "(no lo dejó)"),
        "Navegador: " + String(req.headers.get("User-Agent") || "").slice(0, 160),
        "Fecha: " + new Date().toISOString()].join("
");
      const gh = await fetch("https://api.github.com/repos/" + (env.REPO_FEEDBACK || "tradeitsimplesolutions/mega-cueva-tester") + "/issues", {
        method: "POST",
        headers: { Authorization: "Bearer " + env.GITHUB_TOKEN, Accept: "application/vnd.github+json", "User-Agent": "mega-cueva-tester", "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Feedback: " + texto.replace(/\s+/g, " ").slice(0, 70), body: cuerpo, labels: ["feedback"] }),
      });
      if (!gh.ok) return json({ error: "No se pudo guardar el comentario (" + gh.status + "). Inténtalo más tarde." }, 502, origen);
      return json({ ok: true }, 200, origen);
    }
    if (req.method !== "POST" || url.pathname !== "/v1/chat/completions") return json({ error: "ruta desconocida" }, 404, origen);

    let cuerpo;
    try { cuerpo = await req.json(); } catch { return json({ error: "JSON no válido" }, 400, origen); }
    if (!Array.isArray(cuerpo.messages) || JSON.stringify(cuerpo.messages).length > 40000) return json({ error: "petición no válida" }, 400, origen);

    const ip = req.headers.get("CF-Connecting-IP") || "?";
    const porIp = await contar(env, "ip:" + dia + ":" + ip, topeIp);
    if (!porIp.ok) return json({ error: "Has llegado al límite de traducciones de hoy. Usa «Traducir aquí» o tu agente 03." }, 429, origen);
    const total = await contar(env, "dia:" + dia, topeDia);
    if (!total.ok) return json({ error: "Se ha agotado el cupo de IA de hoy. Usa «Traducir aquí» o tu agente 03." }, 429, origen);

    const peticion = {
      model: env.MODELO || "gemini-3.5-flash",
      messages: cuerpo.messages,
      temperature: typeof cuerpo.temperature === "number" ? cuerpo.temperature : 0.1,
      max_tokens: Math.min(cuerpo.max_tokens || 2500, 4000),
      response_format: { type: "json_object" },
    };
    const r = await fetch(GEMINI, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.GEMINI_API_KEY },
      body: JSON.stringify(peticion),
    });
    const texto = await r.text();
    return new Response(texto, { status: r.status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origen) } });
  },
};
