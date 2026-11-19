export async function onRequest(context) {
  const { request } = context;
  const cors = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  // For testing in browser
  if (request.method === "GET") {
    return new Response(JSON.stringify({ ok: true, msg: "Clean Admin API - No KV - Ready" }), { headers: cors });
  }

  try {
    const body = await request.json();
    const FIXED_PASSWORD = "SmarttechICTs1";
    
    // --- LOGIN ---
    if (body.action === "login" || body.password) {
      const entered = (body.password || "").trim();
      if (entered === FIXED_PASSWORD) {
        return new Response(JSON.stringify({ ok: true, message: "Login success" }), { headers: cors });
      } else {
        return new Response(JSON.stringify({ ok: false, error: "Wrong password, try again" }), { headers: cors });
      }
    }

    // --- REQUEST OTP FOR RESET ---
    if (body.action === "request-otp") {
      // Generate 6 digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      // In real setup, you would send this via WhatsApp API.
      // For now we return it + WhatsApp link
      const whatsappNumber = "0183465547";
      const waLink = `https://wa.me/254183465547?text=Your%20SmartTech%20Admin%20OTP%20is%20${otp}`;
      
      return new Response(JSON.stringify({ 
        ok: true, 
        otp: otp, // In production, remove this and only send via WhatsApp
        whatsapp: whatsappNumber,
        waLink: waLink,
        message: `OTP sent to WhatsApp ${whatsappNumber}` 
      }), { headers: cors });
    }

    // --- VERIFY OTP AND RESET ---
    if (body.action === "verify-otp") {
      // Since no KV, we just verify OTP length and allow reset to default
      // The actual new password logic should be handled in admin.html localStorage for this no-KV version
      if (body.otp && body.otp.length === 6) {
        return new Response(JSON.stringify({ ok: true, message: "OTP verified" }), { headers: cors });
      } else {
        return new Response(JSON.stringify({ ok: false, error: "Invalid OTP" }), { headers: cors });
      }
    }

    return new Response(JSON.stringify({ ok: false, error: "Invalid action" }), { headers: cors });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: cors });
  }
}