const CACHE="smarttech-v3";
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));

self.addEventListener('push',e=>{
  const data=e.data ? e.data.json() : {title:'SmartTech Update',body:'New update posted!'};
  e.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/logo.png',badge:'/logo.png'}));
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.openWindow('/notifications.html'));
});

// Background poll every 1 min - if new post, show notification
setInterval(async()=>{
  try{
    const res=await fetch('/api/notify');
    const last=await res.json();
    if(!last.id) return;
    const prev=await self.registration ? null : null;
    const saved=await caches.match('/last-notif-id');
    // Simplified: always notify if permission granted
    const clientsList=await self.clients.matchAll();
    if(clientsList.length===0){
      self.registration.showNotification(last.title,{body:last.body,icon:'/logo.png'});
    }
  }catch(e){}
},60000);