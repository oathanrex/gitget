import {hl,md} from './md.js';
import {rawUrl} from './cmd.js';
import {fmt} from './match.js';
const IMG=/\.(png|jpe?g|gif|webp|svg|ico|avif|bmp)$/i,MAX=3e5;let tok=0;
const lang=n=>{const l=n.toLowerCase();return l==='dockerfile'?l:l==='makefile'?'mk':l.includes('.')?l.split('.').pop():''};
export async function preview(el,{o,r,ref,path,size,esc,copy}){
  const t=++tok,url=rawUrl(o,r,ref,path),n=path.split('/').pop(),isMd=/\.(md|markdown)$/i.test(n);
  const head=`<div class="ph"><b>${esc(n)}</b><span class="mut">${fmt(size)}</span><span class="row"><a class="btn" href="${esc(url)}" rel="noopener">Raw</a><button class="btn" id="cpy" disabled>Copy</button>${isMd?'<button class="btn" id="vr" aria-pressed="true">Rendered</button><button class="btn" id="vs" aria-pressed="false">Source</button>':''}</span></div>`;
  el.hidden=false;
  if(IMG.test(n)){el.innerHTML=head+`<img class="pimg" src="${esc(url)}" alt="${esc(n)}">`;return}
  if(size>MAX){el.innerHTML=head+`<p class="note">Too large to preview (${fmt(size)}). Use Raw or download.</p>`;return}
  el.innerHTML=head+'<div class="sk"><i></i></div>';let txt;
  try{const res=await fetch(url);if(!res.ok)throw 0;const b=new Uint8Array(await res.arrayBuffer());if(t!==tok)return;
    if(b.subarray(0,8000).includes(0)){el.innerHTML=head+'<p class="note">Binary file — no preview. Use Raw to download.</p>';return}txt=new TextDecoder().decode(b)}
  catch{if(t===tok)el.innerHTML=head+'<p class="note">Couldn’t load this file.</p>';return}
  const view=m=>m==='r'?`<div class="md">${md(txt)}</div>`:`<pre class="code"><code>${hl(txt,lang(n))}</code></pre>`;
  el.innerHTML=head+`<div id="pb">${view(isMd?'r':'s')}</div>`;
  const q=s=>el.querySelector(s);q('#cpy').disabled=false;q('#cpy').onclick=()=>copy(txt);
  if(isMd)for(const [id,m] of [['#vr','r'],['#vs','s']])q(id).onclick=()=>{q('#pb').innerHTML=view(m);q('#vr').setAttribute('aria-pressed',m==='r');q('#vs').setAttribute('aria-pressed',m==='s')};
}
