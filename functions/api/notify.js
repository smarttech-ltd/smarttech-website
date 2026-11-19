export async function onRequestGet({ env }) {
  try {
    if (!env.SMARTTECH_KV) return new Response(JSON.stringify({}), { headers: { "Content-Type":"application/json" } });
    const last = await env.SMARTTECH_KV.get("last_notification", "json") || {};
    return new Response(JSON.stringify(last), { headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" } });
  } catch { return new Response(JSON.stringify({}), { headers: { "Content-Type":"application/json" } }); }
}