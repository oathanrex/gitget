import {get,set} from './store.js';
const B='https://api.github.com',TTL=6e5;
export const rate={remaining:null,limit:null,reset:0};
export const hasToken=()=>!!get('gg.tok','');
export const parse=s=>{s=s.trim().replace(/[#?].*$/,'').replace(/^(https?:\/\/)?(www\.)?github\.com\//i,'').replace(/\.git$/,'');const m=s.match(/^([\w.-]+)\/([\w.-]+)/);return m?m[1]+'/'+m[2]:null};
export const clearCache=()=>{try{Object.keys(localStorage).filter(k=>k.startsWith('gg.c.')).forEach(k=>localStorage.removeItem(k))}catch{}};
const err=(m,c)=>Object.assign(new Error(m),{code:c});
function hdr(r){rate.remaining=+r.headers.get('x-ratelimit-remaining');rate.limit=+r.headers.get('x-ratelimit-limit');rate.reset=+r.headers.get('x-ratelimit-reset');dispatchEvent(new Event('gg:rl'))}
async function call(path){
  const h={Accept:'application/vnd.github+json'},t=get('gg.tok','');if(t)h.Authorization='Bearer '+t;
  let r;try{r=await fetch(B+path,{headers:h})}catch{throw err('Can’t reach GitHub. Check your connection and try again.','net')}
  if(r.headers.get('x-ratelimit-limit'))hdr(r);
  if(r.status===404)throw err('Not found. Check the spelling, or the repository may be private.','404');
  if(r.status===401)throw err('GitHub rejected your token. Remove or replace it in Settings.','401');
  if(r.status===403||r.status===429){const w=rate.reset?' Resets at '+new Date(rate.reset*1e3).toLocaleTimeString()+'.':'';throw err('GitHub API limit reached.'+w+' Add a free token in Settings for 5,000 requests/hour.','rate')}
  if(!r.ok)throw err('GitHub returned an error ('+r.status+'). Try again shortly.','http');
  return r.json();
}
async function get_(path,ttl=TTL){
  const k='gg.c.'+path,c=get(k,null);if(c&&Date.now()-c.t<ttl)return c.d;
  try{const d=await call(path);if(!set(k,{t:Date.now(),d})){clearCache();set(k,{t:Date.now(),d})}return d}
  catch(e){if(c&&e.code==='net')return c.d;throw e}
}
export const repo=(o,r)=>get_(`/repos/${o}/${r}`);
export const releases=(o,r)=>get_(`/repos/${o}/${r}/releases?per_page=20`);
export const latest=(o,r,force)=>get_(`/repos/${o}/${r}/releases/latest`,force?0:18e5);
export const search=q=>get_(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=8`,3e5);
export async function setToken(t){
  const r=await fetch(B+'/rate_limit',{headers:{Authorization:'Bearer '+t}}).catch(()=>null);
  if(!r)throw err('Can’t reach GitHub.','net');if(!r.ok)throw err('GitHub rejected this token.','401');
  set('gg.tok',t);clearCache();hdr(r);
}
export const clearToken=()=>{try{localStorage.removeItem('gg.tok')}catch{}};
