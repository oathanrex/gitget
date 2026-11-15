import {get,set} from './store.js';
const B='https://api.github.com',TTL=6e5;
export const rate={remaining:null,limit:null,reset:0};
export const hasToken=()=>!!get('gg.tok','');
const mk=(full,ref,path)=>({full,ref,path,kind:'files',hash:`#/r/${full}/files/${encodeURIComponent(ref)}${path?'/'+path.split('/').map(encodeURIComponent).join('/'):''}`});
export function target(s){
  s=s.trim().replace(/[#?].*$/,'');
  const gm=s.match(/^(?:https?:\/\/)?gist\.github\.com\/(?:[\w.-]+\/)?([0-9a-f]{20,40})(?:\/.*)?$/i)||s.match(/^([0-9a-f]{32})$/i);
  if(gm)return {kind:'gist',id:gm[1].toLowerCase(),hash:'#/g/'+gm[1].toLowerCase()};
  const w=s.match(/^(?:https?:\/\/)?raw\.githubusercontent\.com\/([\w.-]+)\/([\w.-]+)\/([^/]+)\/(.+)$/i);
  if(w)return mk(w[1]+'/'+w[2],w[3],w[4]);
  const m=s.replace(/^(https?:\/\/)?(www\.)?github\.com\//i,'').match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/(.*))?$/);
  if(!m)return null;const full=m[1]+'/'+m[2],x=(m[3]||'').split('/').filter(Boolean);
  if((x[0]==='tree'||x[0]==='blob')&&x[1])return mk(full,x[1],x.slice(2).join('/'));
  return {full,kind:'repo',hash:'#/r/'+full};
}
export const parse=s=>target(s)?.full||null;
export const gist=id=>get_(`/gists/${id}`);
const TM=new Map();
export async function tree(o,r,ref){const k=o+'/'+r+'@'+ref;if(TM.has(k))return TM.get(k);const d=await call(`/repos/${o}/${r}/git/trees/${encodeURIComponent(ref)}?recursive=1`);TM.set(k,d);return d}
export const clearCache=()=>{try{Object.keys(localStorage).filter(k=>k.startsWith('gg.c.')).forEach(k=>localStorage.removeItem(k))}catch{}};
const err=(m,c)=>Object.assign(new Error(m),{code:c});
function hdr(r){rate.remaining=+r.headers.get('x-ratelimit-remaining');rate.limit=+r.headers.get('x-ratelimit-limit');rate.reset=+r.headers.get('x-ratelimit-reset');dispatchEvent(new Event('gg:rl'))}
async function call(path){
  const h={Accept:'application/vnd.github+json'},t=get('gg.tok','');if(t)h.Authorization='Bearer '+t;
  let r;try{r=await fetch(B+path,{headers:h})}catch{throw err('Can’t reach GitHub. Check your connection and try again.','net')}
  if(r.headers.get('x-ratelimit-limit'))hdr(r);
  if(r.status===202)return {pending:true};if(r.status===204)return [];
  if(r.status===404)throw err('Not found. Check the spelling, or the repository may be private.','404');
  if(r.status===401)throw err('GitHub rejected your token. Remove or replace it in Settings.','401');
  if(r.status===403||r.status===429){const w=rate.reset?' Resets at '+new Date(rate.reset*1e3).toLocaleTimeString()+'.':'';throw err('GitHub API limit reached.'+w+' Add a free token in Settings for 5,000 requests/hour.','rate')}
  if(!r.ok)throw err('GitHub returned an error ('+r.status+'). Try again shortly.','http');
  return r.json();
}
async function get_(path,ttl=TTL){
  const k='gg.c.'+path,c=get(k,null);if(c&&Date.now()-c.t<ttl)return c.d;
  try{const d=await call(path);if(d?.pending)return d;if(!set(k,{t:Date.now(),d})){clearCache();set(k,{t:Date.now(),d})}return d}
  catch(e){if(c&&e.code==='net')return c.d;throw e}
}
export const repo=(o,r)=>get_(`/repos/${o}/${r}`);
export const releases=(o,r,pg=1)=>get_(`/repos/${o}/${r}/releases?per_page=20&page=${pg}`);
export const langs=(o,r)=>get_(`/repos/${o}/${r}/languages`);
export const contribs=(o,r)=>get_(`/repos/${o}/${r}/contributors?per_page=10`);
export const commits=(o,r)=>get_(`/repos/${o}/${r}/commits?per_page=8`);
export const refs=async(o,r)=>{const [b,t]=await Promise.all([get_(`/repos/${o}/${r}/branches?per_page=100`),get_(`/repos/${o}/${r}/tags?per_page=100`)]);return[...b.map(x=>[x.name,'branch']),...t.map(x=>[x.name,'tag'])]};
export async function activity(o,r){for(let i=0;i<4;i++){const d=await get_(`/repos/${o}/${r}/stats/commit_activity`,6e5);if(Array.isArray(d))return d;await new Promise(x=>setTimeout(x,1500))}return[]}
export const latest=(o,r,force)=>get_(`/repos/${o}/${r}/releases/latest`,force?0:18e5);
export const search=q=>get_(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=8`,3e5);
export async function setToken(t){
  const r=await fetch(B+'/rate_limit',{headers:{Authorization:'Bearer '+t}}).catch(()=>null);
  if(!r)throw err('Can’t reach GitHub.','net');if(!r.ok)throw err('GitHub rejected this token.','401');
  set('gg.tok',t);clearCache();hdr(r);
}
export const clearToken=()=>{try{localStorage.removeItem('gg.tok')}catch{}};
