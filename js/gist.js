import * as api from './api.js';
import {createZip,saveBlob} from './zip.js';
import {hl,md} from './md.js';
import {sq} from './cmd.js';
import {fmt} from './match.js';
const D=s=>s?new Date(s).toLocaleDateString():'—',ext=n=>n.includes('.')?n.split('.').pop().toLowerCase():'';
export async function gist(H,id,alive){
  const {$,$$,esc,main,toast}=H;main.innerHTML='<div class="sk" aria-busy="true"><i></i><i></i><i></i></div>';let g;
  try{g=await api.gist(id)}catch(e){return alive()&&H.fail(e,'gist '+id.slice(0,8))}
  if(!alive())return;
  const F=Object.values(g.files||{}),name=F[0]?.filename||id.slice(0,8),own=g.owner?.login||'anonymous',isMd=f=>/\.(md|markdown)$/i.test(f.filename),rend=F.map(isMd);
  document.title=name+' (gist) – GitGet';H.rec(name+' · gist','gist','#/g/'+id);
  const body=(f,i)=>f.encoding==='base64'?'<p class="note">Binary file — use Raw to download.</p>':f.truncated||f.content==null?'<p class="note">Large file — use Raw to view it in full.</p>':rend[i]?`<div class="md">${md(f.content)}</div>`:`<pre class="code"><code>${hl(f.content,ext(f.filename))}</code></pre>`;
  main.innerHTML=`<p><a href="#/">← Back</a></p><h1 class="h">${esc(name)}${F.length>1?` <small class="mut">+${F.length-1} more</small>`:''}</h1><p class="mut">${esc(g.description||'')}</p>
<div class="meta"><span>by <a href="${esc(g.owner?.html_url||g.html_url)}" rel="noopener">${esc(own)}</a></span><span>${g.public?'Public':'Secret'} gist</span><span>Created ${D(g.created_at)}</span><span>Updated ${D(g.updated_at)}</span><a href="${esc(g.html_url)}" rel="noopener">View on GitHub</a></div>
<div class="row"><button class="btn pri" id="gz"${F.length?'':' disabled'}>⬇ Download all (.zip)</button></div>
${F.map((f,i)=>`<details class="panel"${i<3?' open':''}><summary><b>${esc(f.filename)}</b> <span class="mut">${esc(f.language||'')} · ${fmt(f.size)}</span></summary><div class="row"><a class="btn" href="${esc(f.raw_url)}" rel="noopener">Raw</a><button class="btn" data-g="${i}">Copy</button>${isMd(f)?`<button class="btn" data-r="${i}" aria-pressed="${rend[i]}">Rendered</button>`:''}</div><div id="gf${i}">${body(f,i)}</div></details>`).join('')}
<h2>Commands</h2>${[['git clone',`git clone https://gist.github.com/${id}.git`],['GitHub CLI',`gh gist clone ${id}`],...F.slice(0,6).map(f=>['curl · '+f.filename,`curl -L -o ${sq(f.filename)} ${sq(f.raw_url)}`])].map(([l,v])=>`<div class="cmd"><b>${esc(l)}</b><code>${esc(v)}</code><button class="btn" data-c="${esc(v)}">Copy</button></div>`).join('')}`;
  main.onclick=e=>{const c=e.target.closest('[data-g]'),r=e.target.closest('[data-r]');
    if(c){const f=F[+c.dataset.g];f.content!=null&&f.encoding!=='base64'?H.copy(f.content):toast('Nothing to copy — use Raw.',1)}
    if(r){const i=+r.dataset.r;rend[i]=!rend[i];r.setAttribute('aria-pressed',rend[i]);$('#gf'+i).innerHTML=body(F[i],i)}};
  $('#gz')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;
    try{const E=[];for(const f of F){let d;
      if(f.encoding==='base64')d=Uint8Array.from(atob(f.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
      else if(!f.truncated&&f.content!=null)d=new TextEncoder().encode(f.content);
      else{const r=await fetch(f.raw_url);if(!r.ok)throw new Error('Could not fetch '+f.filename);d=new Uint8Array(await r.arrayBuffer())}
      E.push({path:`gist-${id.slice(0,8)}/${f.filename}`,data:d})}
      const blob=await createZip(E);saveBlob(blob,`gist-${id.slice(0,8)}.zip`);H.hist({k:'zip',full:'gist',label:name+' (gist)',n:F.length,size:blob.size,hash:location.hash});toast('ZIP ready · '+fmt(blob.size))}
    catch(x){toast(x.message,1)}b.disabled=false});
}
