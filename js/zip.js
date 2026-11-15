const T=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[i]=c>>>0}return t})();
export const crc32=b=>{let c=-1;for(let i=0;i<b.length;i++)c=T[(c^b[i])&255]^(c>>>8);return(c^-1)>>>0};
const enc=new TextEncoder();
async function deflate(d){if(typeof CompressionStream==='undefined'||d.length<64)return null;
  try{const o=new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());return o.length<d.length?o:null}catch{return null}}
export async function createZip(entries,onProgress){
  if(entries.length>65534)throw new Error('Too many files for one ZIP (limit 65,534).');
  const L=[],C=[],n=new Date(),dt=(n.getHours()<<11|n.getMinutes()<<5|n.getSeconds()>>1)&0xffff,dd=(((Math.max(1980,n.getFullYear())-1980)<<9)|((n.getMonth()+1)<<5)|n.getDate())&0xffff;let off=0;
  for(let i=0;i<entries.length;i++){const e=entries[i];
    if(/(^|\/)\.\.(\/|$)/.test(e.path))throw new Error('Unsafe path in archive: '+e.path);
    const nm=enc.encode(e.path.replace(/^\/+/,'')),d=e.data,crc=crc32(d),z=await deflate(d),meth=z?8:0,p=z||d;
    const h=new Uint8Array(30+nm.length),v=new DataView(h.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(8,meth,true);v.setUint16(10,dt,true);v.setUint16(12,dd,true);v.setUint32(14,crc,true);v.setUint32(18,p.length,true);v.setUint32(22,d.length,true);v.setUint16(26,nm.length,true);h.set(nm,30);
    const c=new Uint8Array(46+nm.length),w=new DataView(c.buffer);
    w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(10,meth,true);w.setUint16(12,dt,true);w.setUint16(14,dd,true);w.setUint32(16,crc,true);w.setUint32(20,p.length,true);w.setUint32(24,d.length,true);w.setUint16(28,nm.length,true);w.setUint32(42,off,true);c.set(nm,46);
    L.push(h,p);C.push(c);off+=h.length+p.length;onProgress?.(i+1,entries.length)}
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,C.reduce((a,x)=>a+x.length,0),true);v.setUint32(16,off,true);
  return new Blob([...L,...C,end],{type:'application/zip'});
}
const seg=p=>p.split('/').map(encodeURIComponent).join('/');
export async function bundle(files,{o,r,ref,token,signal,onProgress,name=p=>p}){
  const ac=new AbortController();signal?.addEventListener('abort',()=>ac.abort());
  const out=new Array(files.length);let next=0,done=0,bytes=0;
  const fetchOne=async f=>{
    const res=await fetch(`https://raw.githubusercontent.com/${o}/${r}/${seg(ref)}/${seg(f.path)}`,{signal:ac.signal}).catch(e=>{if(e.name==='AbortError')throw e;return null});
    if(res?.ok)return new Uint8Array(await res.arrayBuffer());
    if(f.sha){const h={Accept:'application/vnd.github+json'};if(token)h.Authorization='Bearer '+token;
      const b=await fetch(`https://api.github.com/repos/${o}/${r}/git/blobs/${f.sha}`,{headers:h,signal:ac.signal}).catch(()=>null);
      if(b?.ok){const j=await b.json();return Uint8Array.from(atob(j.content.replace(/\n/g,'')),c=>c.charCodeAt(0))}}
    throw new Error('Could not fetch '+f.path+(res?' (HTTP '+res.status+')':' (network error)'));};
  const worker=async()=>{for(;;){const i=next++;if(i>=files.length)return;const d=await fetchOne(files[i]);out[i]={path:name(files[i].path),data:d};bytes+=d.length;onProgress?.(++done,files.length,bytes)}};
  try{await Promise.all(Array.from({length:Math.min(6,files.length)},worker))}catch(e){ac.abort();throw e}
  return createZip(out,(d,t)=>onProgress?.(d,t,bytes,'zip'));
}
export function saveBlob(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),6e4)}
