const C='gitget-v11',A=['./','index.html','css/app.css','js/icons.js','js/app.js','js/api.js','js/detect.js','js/match.js','js/store.js','js/files.js','js/tree.js','js/cmd.js','js/zip.js','js/md.js','js/gist.js','js/preview.js','js/views.js','assets/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
e.respondWith(caches.open(C).then(async c=>{const hit=await c.match(r);const net=fetch(r).then(x=>{if(x.ok)c.put(r,x.clone());return x}).catch(()=>hit||(r.mode==='navigate'?c.match('index.html'):Response.error()));return hit||net}))});
