export async function onRequest(context){
  const {request, env} = context;
  const cors={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
  if(request.method==="OPTIONS") return new Response(null,{headers:cors});
  const KV=env.SMARTTECH_KV;
  if(request.method==="GET"){
    const data=KV?await KV.get("smarttech_posts",{type:"json"}):[];
    return new Response(JSON.stringify(data||[]),{headers:cors});
  }
  if(request.method==="POST"){
    const post=await request.json();
    post.source="Originated from: https://smarttech-ltd.pages.dev";
    post.sourceUrl="https://smarttech-ltd.pages.dev";
    post.appUrl="https://smarttech-ltd.pages.dev";
    post.channelUrl="https://whatsapp.com/channel/0029Vb8g2IyLdQeduLS5MD3z";
    if(KV){const ex=await KV.get("smarttech_posts",{type:"json"})||[];ex.unshift(post);await KV.put("smarttech_posts",JSON.stringify(ex.slice(0,200)));}
    return new Response(JSON.stringify({ok:true}),{headers:cors});
  }
}