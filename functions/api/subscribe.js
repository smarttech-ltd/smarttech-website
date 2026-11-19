export async function onRequestPost({ request, env }) {
  const sub = await request.json();
  const subs = await env.SMARTTECH_KV.get("subscriptions", "json") || [];
  subs.push(sub);
  await env.SMARTTECH_KV.put("subscriptions", JSON.stringify(subs));
  return new Response(JSON.stringify({ ok:true }));
}

export async function onRequestGet({ env }) {
  const last = await env.SMARTTECH_KV.get("last_notification", "json");
  return new Response(JSON.stringify(last || {}), { headers: { "Content-Type":"application/json" } });
}