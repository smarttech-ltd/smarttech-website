export async function onRequest(context){
  const { request, env } = context;
  
  const cors = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const KV = env.SMARTTECH_KV;
  const APP_URL = "https://smarttech-ltd.pages.dev";
  const CHANNEL_URL = "https://whatsapp.com/channel/0029Vb8g2IyLdQeduLS5MD3z";
  const SOURCE = "Originated from: https://smarttech-ltd.pages.dev";

  // GET - Fetch all notifications/updates for homepage
  if (request.method === "GET") {
    try {
      const data = KV ? await KV.get("smarttech_notifications", { type: "json" }) : null;
      return new Response(JSON.stringify(data || []), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify([]), { headers: cors });
    }
  }

  // POST - Save new update + auto-link to App + Channel
  if (request.method === "POST") {
    try {
      const notif = await request.json();
      
      // Add required links to every update
      notif.source = SOURCE;
      notif.sourceUrl = APP_URL;
      notif.appUrl = APP_URL;
      notif.channelUrl = CHANNEL_URL;
      notif.appLink = APP_URL;
      notif.channelLink = CHANNEL_URL;
      
      if (!notif.created) notif.created = new Date().toISOString();
      if (!notif.id) notif.id = Date.now();

      // Save to KV (so it shows on App)
      if (KV) {
        const existing = await KV.get("smarttech_notifications", { type: "json" }) || [];
        existing.unshift(notif);
        // Keep last 200 updates
        await KV.put("smarttech_notifications", JSON.stringify(existing.slice(0, 200)));
      }

      // In real production, here you would call WhatsApp Channel API
      // For now, frontend will auto-open Channel URL after save

      return new Response(JSON.stringify({ 
        ok: true, 
        message: "Update saved to App and ready for Channel",
        appUrl: APP_URL,
        channelUrl: CHANNEL_URL,
        source: SOURCE,
        notif 
      }), { headers: cors });

    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { 
        headers: cors, status: 500 
      });
    }
  }

  return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { headers: cors });
}