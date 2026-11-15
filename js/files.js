import * as api from './api.js';
import {build,matcher,files as nf} from './tree.js';
import {cmds} from './cmd.js';
import {bundle} from './zip.js';
import {fmt} from './match.js';
import {preview} from './preview.js';
import {get,set} from './store.js';
export const dens=v=>{document.documentElement.dataset.density=v==='compact'?'compact':'';set('gg.dens',v);const b=document.querySelector('#dn');if(b){b.setAttribute('aria-pressed',v==='compact');b.textContent=v==='compact'?'Compact ✓':'Compact'}};
const BUILT=[['Source only',['node_modules/','dist/','build/','*.lock','*.min.*','tests/','docs/','.github/']],['No build or vendor',['node_modules/','dist/','build/','vendor/','*.lock','*.min.*']],['No tests or docs',['tests/','test/','__tests__/','docs/']],['Nothing excluded',[]]];
const DEF=['node_modules/','.git/','*.lock'],PRE=['node_modules/','dist/','*.lock','*.min.*','tests/','docs/'],LIM=5e8;
export const tabs=(f,c)=>`<nav class="tabs" aria-label="Repository sections">${[['dl','','Download'],['fi','/files','Files'],['rl','/releases','Releases'],['st','/stats','Insights']].map(([k,p,l])=>`<a href="#/r/${f}${p}"${c===k?' aria-current="page"':''}>${l}</a>`).join('')}</nav>`;
export async function files(H,full,ref,path,alive){
  const {$,$$,esc,main,toast}=H,[o,r]=full.split('/');
  main.innerHTML='<div class="sk" aria-busy="true"><i></i><i></i><i></i></div>';
  let T,rf;
  try{const repo=await api.repo(o,r);rf=ref||repo.default_branch;
    try{T=await api.tree(o,r,rf)}catch(e){
      if(e.code!=='404'||!ref||!path)throw e;const sg=path.split('/');
      for(let i=1;i<=Math.min(4,sg.length)&&!T;i++){const c=ref+'/'+sg.slice(0,i).join('/');try{T=await api.tree(o,r,c);rf=c;path=sg.slice(i).join('/')}catch(x){if(x.code!=='404')throw x}}
      if(!T)throw e}}
  catch(e){return alive()&&H.fail(e,full)}
  if(!alive())return;H.rec(full,'files',location.hash);
  const blobs=new Map(T.tree.filter(i=>i.type==='blob').map(i=>[i.path,i]));
  let focus='';if(blobs.has(path)){focus=path;path=path.split('/').slice(0,-1).join('/')}
  const root=build(T.tree,path),idx=new Map();(function w(n){idx.set(n.path,n);n.dir&&n.kids.forEach(w)})(root);
  const hash=(p,x=rf)=>`#/r/${full}/files/${encodeURIComponent(x)}${p?'/'+p.split('/').map(encodeURIComponent).join('/'):''}`;
  document.title=full+' files – GitGet';
  let pats=get('gg.excl',DEF),m=matcher(pats),q='',sel=new Set(),open=new Set(),busy=null;
  const vis=n=>nf(n).filter(f=>!m(f.path)&&(!q||f.path.toLowerCase().includes(q))),
    chosen=()=>sel.size?[...sel].map(p=>blobs.get(p)).filter(f=>f&&!m(f.path)):vis(root);
  const crumb=[`<a href="${hash('')}">${esc(r)}</a>`,...path.split('/').filter(Boolean).map((s,i,a)=>`<a href="${hash(a.slice(0,i+1).join('/'))}">${esc(s)}</a>`)].join(' / ');
  main.innerHTML=`<p><a href="#/">← Back</a></p>${tabs(full,'fi')}<h1 class="h">${esc(full)}</h1><p>${crumb}</p>
<form class="row" id="rf"><label>Ref <input id="ref" type="search" list="refs" value="${esc(rf)}" aria-label="Branch, tag or commit"><datalist id="refs"></datalist></label><button class="btn">Switch</button></form>
${T.truncated?'<p class="note">GitHub returned a partial file list (very large repo). Some files may be missing — prefer the sparse-checkout command below.</p>':''}
${root.kids.size?`<div class="panel"><b>Exclude</b> <span class="mut">(applies to the tree and the ZIP)</span><div class="seg" id="ch">${PRE.map(p=>`<button type="button" data-v="${esc(p)}" aria-pressed="${pats.includes(p)}">${esc(p)}</button>`).join('')}</div><div class="row"><input id="ex" type="search" aria-label="Exclusion patterns, comma separated" value="${esc(pats.join(', '))}"></div><div class="row"><select id="pr" aria-label="Exclusion presets"></select><input id="pn" type="text" maxlength="40" placeholder="Save current as preset…" aria-label="Preset name"><button type="button" class="btn" id="ps">Save</button><button type="button" class="btn" id="pd" hidden>Delete</button><button type="button" class="btn" id="dn" aria-pressed="false">Compact</button></div></div>
<div class="row"><input id="flt" type="search" placeholder="Filter files…" aria-label="Filter files by name"><button class="btn" id="all">Select all</button><button class="btn" id="none">Clear</button></div>
<ul id="tr" class="tree" role="tree" aria-label="Files"></ul><div class="panel" id="sum"></div><div class="panel" id="pv" aria-live="polite" hidden></div>`:`<p class="note">No files at <code>${esc(path||'/')}</code> in <code>${esc(rf)}</code>. <a href="${hash('')}">Go to repository root</a></p>`}
<h2>Commands</h2><div id="cmd"></div>`;
  const kids=(n,d)=>[...n.kids.values()].sort((a,b)=>(b.dir?1:0)-(a.dir?1:0)||a.name.localeCompare(b.name)).map(k=>row(k,d)).join('');
  const row=(n,d)=>{
    if(n.dir){const F=vis(n);if(!F.length)return '';const c=F.filter(f=>sel.has(f.path)).length,o=open.has(n.path)||!!q;
      return `<li class="d${Math.min(d,9)}" role="treeitem" aria-level="${d+1}" aria-expanded="${o}"><span class="tr"><button class="lnk tg" data-t="${esc(n.path)}" aria-label="${o?'Collapse':'Expand'} ${esc(n.name)}">${o?'▾':'▸'}</button><input type="checkbox" data-p="${esc(n.path)}"${c===F.length?' checked':c?' data-ind':''} aria-label="Select folder ${esc(n.name)}"><b>${esc(n.name)}</b><span class="mut">${F.length} files</span><a href="${hash(n.path)}" aria-label="Open ${esc(n.name)} as root">↗</a></span></li>${o?kids(n,d+1):''}`}
    if(m(n.path)||(q&&!n.path.toLowerCase().includes(q)))return '';
    return `<li class="d${Math.min(d,9)}" role="treeitem" aria-level="${d+1}"><span class="tr"><input type="checkbox" data-p="${esc(n.path)}"${sel.has(n.path)?' checked':''} aria-label="Select ${esc(n.name)}"><button class="lnk fl" data-f="${esc(n.path)}"${focus===n.path?' aria-current="true"':''}>${esc(n.name)}</button><span class="mut">${fmt(n.size)}</span></span></li>`};
  const drawTree=()=>{const t=$('#tr');if(!t)return;t.innerHTML=kids(root,0)||'<li class="mut">Nothing matches the current filters.</li>';$$('[data-ind]',t).forEach(x=>x.indeterminate=true)};
  const drawCmd=()=>{$('#cmd').innerHTML=`<p class="mut">For <code>${esc(focus||path||r)}</code>${focus?'':' (folder)'} · POSIX shell syntax</p>`+cmds({o,r,ref:rf,path,file:focus}).map(([l,v])=>`<div class="cmd"><b>${esc(l)}</b><code>${esc(v)}</code><button class="btn" data-c="${esc(v)}">Copy</button></div>`).join('')};
  const drawSum=()=>{const s=$('#sum');if(!s)return;const L=chosen(),sz=L.reduce((a,f)=>a+(f.size||0),0),big=sz>LIM||L.length>2e4;
    s.innerHTML=`<b>${L.length.toLocaleString()} file${L.length===1?'':'s'}</b> · ${fmt(sz)} <span class="mut">${sel.size?'selected':q?'matching filter':'in this folder'}</span><div class="row"><button class="btn pri" id="dz"${!L.length||big||busy?' disabled':''}>⬇ Download ${sel.size?'selected':q?'matching':'folder'} (.zip)</button>${busy?'<button class="btn" id="cx">Cancel</button>':''}</div>${big?'<p class="note">Too large for an in-browser ZIP (limit 500 MB / 20,000 files). Use the sparse-checkout command below.</p>':''}<progress id="pg" hidden max="1" value="0"></progress><p id="pt" class="mut" role="status"></p>`;
    $('#dz').onclick=run;$('#cx')?.addEventListener('click',()=>busy.abort())};
  const run=async()=>{const L=chosen(),ac=busy=new AbortController(),rn=path?path.split('/').pop():r,pre=path?path+'/':'';drawSum();const pg=$('#pg'),pt=$('#pt');pg.hidden=false;
    try{const blob=await bundle(L,{o,r,ref:rf,token:get('gg.tok',''),signal:ac.signal,name:p=>rn+'/'+p.slice(pre.length),onProgress:(d,t,b,ph)=>{pg.max=t;pg.value=d;pt.textContent=(ph?'Compressing ':'Fetching ')+d+'/'+t+' files · '+fmt(b)}});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${rn}-${rf.replace(/[^\w.-]+/g,'_')}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),6e4);toast('ZIP ready · '+fmt(blob.size));H.hist?.({k:'zip',full,label:`${rn} (${rf})`,n:L.length,size:blob.size,hash:location.hash})}
    catch(e){e.name==='AbortError'?toast('Download cancelled'):toast(e.message,1)}
    busy=null;drawSum()};
  const refocus=(sel_,k)=>$$(sel_).find(x=>(x.dataset.t??x.dataset.p??x.dataset.f)===k)?.focus();
  drawCmd();
  api.refs(o,r).then(L=>{if(alive()&&$('#refs'))$('#refs').innerHTML=L.map(([n,t])=>`<option value="${esc(n)}" label="${t}">`).join('')}).catch(()=>{});
  const showPv=()=>preview($('#pv'),{o,r,ref:rf,path:focus,size:blobs.get(focus)?.size||0,esc,copy:H.copy});
  $('#rf').onsubmit=e=>{e.preventDefault();const v=$('#ref').value.trim();if(v)location.hash=hash(path,v)};
  if(!root.kids.size)return;
  const setP=p=>{pats=p;set('gg.excl',p);m=matcher(p);$('#ex').value=p.join(', ');$$('#ch button').forEach(b=>b.setAttribute('aria-pressed',p.includes(b.dataset.v)));drawTree();drawSum();drawPr('')};
  const drawPr=cur=>{const U=get('gg.presets',[]);$('#pr').innerHTML='<option value="">Presets…</option><optgroup label="Built-in">'+BUILT.map(([n],i)=>`<option value="b${i}">${esc(n)}</option>`).join('')+'</optgroup>'+(U.length?'<optgroup label="Yours">'+U.map((p,i)=>`<option value="u${i}">${esc(p.name)}</option>`).join('')+'</optgroup>':'');$('#pr').value=cur||'';$('#pd').hidden=!(cur||'').startsWith('u')};
  $('#pr').onchange=e=>{const v=e.target.value,p=v[0]==='b'?BUILT[+v.slice(1)][1]:v[0]==='u'?get('gg.presets',[])[+v.slice(1)]?.pats:null;if(p)setP([...p]);drawPr(v)};
  $('#ps').onclick=()=>{const n=$('#pn').value.trim();if(!n)return toast('Enter a preset name first.',1);const U=get('gg.presets',[]).filter(p=>p.name!==n);U.push({name:n,pats:[...pats]});set('gg.presets',U.slice(-20));$('#pn').value='';drawPr('u'+(Math.min(U.length,20)-1));toast('Preset saved')};
  $('#pd').onclick=()=>{const U=get('gg.presets',[]);U.splice(+$('#pr').value.slice(1),1);set('gg.presets',U);drawPr('');toast('Preset deleted')};
  $('#dn').onclick=()=>dens(document.documentElement.dataset.density==='compact'?'comfortable':'compact');dens(get('gg.dens','comfortable'));drawPr('');
  $('#ch').onclick=e=>{const b=e.target.closest('button');if(b)setP(pats.includes(b.dataset.v)?pats.filter(x=>x!==b.dataset.v):[...pats,b.dataset.v])};
  $('#ex').onchange=e=>setP(e.target.value.split(',').map(s=>s.trim()).filter(Boolean));
  $('#flt').oninput=e=>{q=e.target.value.trim().toLowerCase();drawTree();busy||drawSum()};
  $('#all').onclick=()=>{vis(root).forEach(f=>sel.add(f.path));drawTree();busy||drawSum()};
  $('#none').onclick=()=>{sel.clear();drawTree();busy||drawSum()};
  const tr=$('#tr');
  tr.onclick=e=>{const b=e.target.closest('[data-t]');
    if(b){const k=b.dataset.t;open.has(k)?open.delete(k):open.add(k);drawTree();refocus('[data-t]',k);return}
    const f=e.target.closest('[data-f]');if(f){focus=f.dataset.f;drawTree();drawCmd();showPv();refocus('[data-f]',focus)}};
  tr.onchange=e=>{const c=e.target.closest('[data-p]');if(!c)return;const k=c.dataset.p,n=idx.get(k);(n.dir?vis(n):[n]).forEach(f=>c.checked?sel.add(f.path):sel.delete(f.path));drawTree();busy||drawSum();refocus('[data-p]',k)};
  drawTree();drawSum();if(focus)showPv();
}
