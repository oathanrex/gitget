import {detect,saveSys,clearSys,LABEL,ARCHL} from './detect.js';
import {pick,fmt} from './match.js';
import * as api from './api.js';
import {lib,setLib,get,set,hist,setHist,addHist} from './store.js';
import {files,tabs,dens} from './files.js';
import {gist} from './gist.js';
import {releases,stats} from './views.js';
import {md} from './md.js';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const av=f=>`https://avatars.githubusercontent.com/${f.split('/')[0]}?s=80`;
const CATS={all:'🌟 All',dev:'🛠️ Dev Tools',productivity:'📋 Productivity',media:'🎬 Media',security:'🔒 Security',utilities:'⚙️ Utilities'};
const FEAT=[
  ['VSCodium/vscodium','Code editor without telemetry or tracking','dev'],
  ['git-for-windows/git','Official Git VCS package for Windows','dev'],
  ['godotengine/godot','Multi-platform 2D & 3D game engine','dev'],
  ['neovim/neovim','Vim-fork focused on extensibility and speed','dev'],
  ['dbeaver/dbeaver','Universal multi-platform database manager & SQL client','dev'],
  ['nushell/nushell','Modern structured pipeline shell for all systems','dev'],
  ['obsidianmd/obsidian-releases','Local-first Markdown knowledge base & notes','productivity'],
  ['jgraph/drawio-desktop','Security-first desktop diagramming & flowchart tool','productivity'],
  ['marktext/marktext','Simple and elegant real-time Markdown editor','productivity'],
  ['logseq/logseq','Privacy-first, open-source outliner & second brain','productivity'],
  ['spacedriveapp/spacedrive','Cross-platform Virtual Distributed File System','productivity'],
  ['obsproject/obs-studio','Live video streaming & screen recording suite','media'],
  ['audacity/audacity','Multi-track audio editor, recorder and sound studio','media'],
  ['HandBrake/HandBrake','Fast, open-source multi-format video transcoder','media'],
  ['ShareX/ShareX','Screen capture, screen recording & productivity utility','media'],
  ['kovidgoyal/calibre','Comprehensive e-book library manager and viewer','media'],
  ['bitwarden/clients','Open-source encrypted password management client','security'],
  ['keepassxreboot/keepassxc','Secure, offline cross-platform password manager','security'],
  ['rustdesk/rustdesk','Open source remote desktop alternative to TeamViewer','security'],
  ['cryptomator/cryptomator','Client-side zero-knowledge cloud file encryption','security'],
  ['localsend/localsend','Cross-platform secure local file sharing (AirDrop alternative)','utilities'],
  ['balena-io/etcher','Flash OS images to SD cards & USB drives safely','utilities'],
  ['peazip/PeaZip','Fast archiver & file manager (7Z, RAR, TAR, ZIP, ZSTD)','utilities'],
  ['flameshot-org/flameshot','Powerful and intuitive in-app screenshot software','utilities'],
  ['notepad-plus-plus/notepad-plus-plus','Fast source code editor & Windows notepad replacement','utilities'],
  ['BleachBit/bleachbit','Clean disk space, wipe cache & preserve system privacy','utilities']
];
const main=$('#main'),dlg=$('#dlg');let sys,rt=0;
const toast=(m,e)=>{const t=document.createElement('div');t.className='toast'+(e?' err':'');t.setAttribute('role',e?'alert':'status');t.textContent=m;$('#toasts').append(t);setTimeout(()=>t.remove(),4500)};
const copy=async(t,m='Copied')=>{try{await navigator.clipboard.writeText(t);toast(m)}catch{toast('Copy blocked by the browser — select the text manually.',1)}};
const sysText=()=>LABEL[sys.os]+' · '+ARCHL[sys.arch];
const paintSys=()=>{$('#sys').textContent=sysText()};
const modal=(t,b,m)=>{dlg.setAttribute('aria-label',t);dlg.innerHTML=`<form method="dialog" class="dh"><h2>${t}</h2><button class="x" aria-label="Close">×</button></form><div class="db">${b}</div>`;m&&m();dlg.open||dlg.showModal()};
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
const seg=(id,vals,L,cur)=>`<div class="seg" id="${id}">${vals.map(v=>`<button type="button" data-v="${v}" aria-pressed="${v===cur}">${esc(L?L[v]:v)}</button>`).join('')}</div>`;
const segBind=(id,fn)=>{$('#'+id,dlg).onclick=e=>{const b=e.target.closest('button');if(!b)return;fn(b.dataset.v);$$('button',e.currentTarget).forEach(x=>x.setAttribute('aria-pressed',x===b))}};
function sysDlg(){let {os,arch}=sys;
  modal('Your system',`<p class="mut">Downloads are matched to this.</p><h3>Operating system</h3>${seg('os',Object.keys(LABEL),LABEL,os)}<h3>CPU</h3>${seg('ar',['x64','arm64','x86','arm'],ARCHL,arch)}<div class="row"><button class="btn" id="auto">Auto-detect</button><button class="btn pri" id="ok">Apply</button></div>`,()=>{
    segBind('os',v=>os=v);segBind('ar',v=>arch=v);
    $('#auto',dlg).onclick=async()=>{clearSys();sys=await detect();paintSys();dlg.close();route()};
    $('#ok',dlg).onclick=()=>{sys={os,arch};saveSys(sys);paintSys();dlg.close();route()}})}
function theme(v){document.documentElement.dataset.theme=v==='auto'?'':v;set('gg.theme',v)}
function cfg(){const th=get('gg.theme','auto');
  modal('Settings',`<h3>GitHub token <small>(optional)</small></h3><p class="mut">Raises GitHub’s API limit from 60 to 5,000 requests/hour. No scopes needed. Stored only in this browser.</p><div class="row"><input id="tk" type="password" autocomplete="off" aria-label="GitHub personal access token" placeholder="ghp_…"><button class="btn pri" id="tks">Save</button></div>${api.hasToken()?'<div class="row"><button class="btn" id="tkr">Remove saved token</button></div>':''}<h3>Theme</h3>${seg('th',['auto','light','dark'],null,th)}<h3>Density</h3>${seg('dd',['comfortable','compact'],null,get('gg.dens','comfortable'))}<h3>Data</h3><p class="mut">${lib().length} tracked app(s). Everything stays on this device.</p><button class="btn" id="cc">Clear cached GitHub data</button>`,()=>{
    segBind('th',theme);segBind('dd',dens);
    $('#tks',dlg).onclick=async()=>{const v=$('#tk',dlg).value.trim();if(!v)return;try{await api.setToken(v);toast('Token verified and saved');dlg.close()}catch(e){toast(e.message,1)}};
    $('#tkr',dlg)?.addEventListener('click',()=>{api.clearToken();toast('Token removed');dlg.close()});
    $('#cc',dlg).onclick=()=>{api.clearCache();toast('Cache cleared')}})}
const rec=(f,k='repo',h)=>addHist({k,full:f,label:f,hash:h||'#/r/'+f});
const ago=t=>{const s=(Date.now()-t)/1e3;return s<60?'just now':s<3600?Math.floor(s/60)+' min ago':s<86400?Math.floor(s/3600)+' h ago':Math.floor(s/86400)+' d ago'};
const KIND={repo:'Repository',files:'Files',gist:'Gist',zip:'ZIP download'},ICON={repo:'📦',files:'📁',gist:'◧',zip:'⬇'};
function histDlg(){const L=hist();
  modal('History',L.length?`<ul class="list" id="hl">${L.map((x,i)=>`<li><div><span aria-hidden="true">${ICON[x.k]||''}</span><span><a href="${esc(x.hash||'#/')}"><b>${esc(x.label||x.full)}</b></a><br><span class="mut">${KIND[x.k]||''}${x.k==='zip'?' · '+x.n+' files · '+fmt(x.size):''} · ${ago(x.t)}</span></span></div><button class="btn" data-i="${i}" aria-label="Remove from history">✕</button></li>`).join('')}</ul><div class="row"><button class="btn" id="hc">Clear all</button></div>`:'<p class="mut">Nothing here yet. Repos, files and gists you open will show up.</p>',()=>{
    $('#hl',dlg)?.addEventListener('click',e=>{if(e.target.closest('a'))return dlg.close();const b=e.target.closest('[data-i]');if(b){const A=hist();A.splice(+b.dataset.i,1);setHist(A);histDlg()}});
    $('#hc',dlg)?.addEventListener('click',()=>{setHist([]);dlg.close();toast('History cleared');if(!$('#q'))return;home()})})}
const go=(f,h)=>{location.hash=h||'#/r/'+f};
const fail=(e,f)=>{main.innerHTML=`<div class="err" role="alert"><h2>Couldn’t load ${esc(f||'data')}</h2><p>${esc(e.message)}</p><div class="row"><a class="btn" href="#/">Back home</a><button class="btn" id="retry">Try again</button></div></div>`;$('#retry').onclick=route;$('#live').textContent='Error: '+e.message};
const card=(f,d)=>`<a class="card" href="#/r/${esc(f)}"><img src="${esc(av(f))}" alt="" width="40" height="40" loading="lazy"><div><b>${esc(f.split('/')[1])}</b><span>${esc(d||'')}</span></div></a>`;
function home(){
  let curCat='all';
  const rc=hist().filter((x,i,a)=>x.k!=='zip'&&a.findIndex(y=>y.hash===x.hash&&y.k!=='zip')===i).slice(0,6);
  const renderGrid=c=>FEAT.filter(x=>c==='all'||x[2]===c).map(x=>card(x[0],x[1])).join('');
  main.innerHTML=`<section class="hero"><h1>The right GitHub download, instantly</h1><p>Paste a repository or search by name. GitGet picks the installer for your system, shows its checksum and keeps track of updates.</p>
<form id="sf" role="search"><div class="sbox"><input id="q" type="search" role="combobox" aria-expanded="false" aria-controls="sg" aria-autocomplete="list" placeholder="owner/repo, GitHub URL or app name   ( / )" autocomplete="off" spellcheck="false" aria-label="Search GitHub repositories"><button class="btn pri">Find</button></div><ul id="sg" role="listbox" aria-label="Suggestions" hidden></ul></form>
${rc.length?`<div class="chips" aria-label="Recent">${rc.map(x=>`<a href="${esc(x.hash)}">${esc(x.label||x.full)}</a>`).join('')}<button class="lnk" id="clr">Clear</button></div>`:''}</section>
<div id="res"></div>
<div class="row" style="justify-content:space-between;align-items:center;margin-top:2rem"><h2 style="margin:0">Popular apps</h2><span class="mut" id="app-cnt">${FEAT.length} apps</span></div>
<div class="seg" id="cf" style="margin:.6rem 0 1.2rem" role="tablist" aria-label="Filter apps by category">${Object.entries(CATS).map(([k,l])=>`<button type="button" data-c="${k}" aria-pressed="${k===curCat}">${l}</button>`).join('')}</div>
<div class="grid" id="ag">${renderGrid(curCat)}</div>
<h2>How it works</h2><div class="grid"><div class="panel"><b>1. We detect</b><p class="mut">Your OS and CPU, read from your browser. Wrong? Change it from the button at the top.</p></div><div class="panel"><b>2. We match</b><p class="mut">Every release file is scored; checksums, sources and other platforms are filtered out.</p></div><div class="panel"><b>3. You download</b><p class="mut">The link goes straight to GitHub. We host nothing and track nothing.</p></div></div>`;
  const q=$('#q'),sg=$('#sg');let sel=-1,items=[],tm,seq=0;
  const hide=()=>{sg.hidden=true;q.setAttribute('aria-expanded','false');sel=-1};
  const show=(a,msg)=>{items=a;sel=-1;sg.innerHTML=a.length?a.map((x,i)=>`<li role="option" id="o${i}" data-f="${esc(x.f)}" data-h="${esc(x.h||'')}">${esc(x.f)}${x.d?`<small>${esc(x.d)}</small>`:''}</li>`).join(''):`<li role="option" aria-disabled="true">${esc(msg||'No matches')}</li>`;sg.hidden=false;q.setAttribute('aria-expanded','true');$('#live').textContent=a.length?a.length+' suggestion'+(a.length>1?'s':'')+' available':(msg||'No matches')};
  q.oninput=()=>{clearTimeout(tm);const v=q.value.trim();if(v.length<2)return hide();const d=api.target(v);
    if(d)return show([{f:d.full||'Gist '+d.id.slice(0,8)+'…',h:d.hash,d:d.kind==='gist'?'Open gist':d.kind==='files'?'Browse files'+(d.path?' in '+d.path:''):'Open this repository'}]);
    tm=setTimeout(async()=>{const n=++seq;try{const r=await api.search(v);if(n===seq)show(r.items.map(i=>({f:i.full_name,d:i.description})))}catch(e){if(n===seq)show([],e.message)}},450)};
  q.onkeydown=e=>{if(sg.hidden||!items.length)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=(sel+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;$$('#sg li').forEach((l,i)=>l.setAttribute('aria-selected',i===sel));q.setAttribute('aria-activedescendant','o'+sel)}else if(e.key==='Escape')hide();else if(e.key==='Enter'&&sel>=0){e.preventDefault();go(items[sel].f,items[sel].h)}};
  sg.onmousedown=e=>{const l=e.target.closest('li[data-f]');if(l){e.preventDefault();go(l.dataset.f,l.dataset.h)}};
  q.onblur=()=>setTimeout(hide,120);
  $('#sf').onsubmit=async e=>{e.preventDefault();const v=q.value.trim();if(!v)return;const d=api.target(v);if(d)return go(d.full,d.hash);
    $('#res').innerHTML='<div class="sk"><i></i></div>';try{const r=await api.search(v);$('#res').innerHTML=r.items.length?`<h2>Results for “${esc(v)}”</h2><div class="grid">${r.items.map(i=>card(i.full_name,i.description)).join('')}</div>`:'<p class="note">No repositories found.</p>'}catch(x){$('#res').innerHTML=`<p class="err" role="alert">${esc(x.message)}</p>`}};
  $('#cf')?.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    curCat=b.dataset.c;
    $$('#cf button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
    const list=FEAT.filter(x=>curCat==='all'||x[2]===curCat);
    $('#ag').innerHTML=list.map(x=>card(x[0],x[1])).join('');
    $('#app-cnt').textContent=`${list.length} app${list.length===1?'':'s'}`;
  });
  $('#clr')?.addEventListener('click',()=>{setHist([]);home()});
}
async function detail(full,t){
  main.innerHTML='<div class="sk" aria-busy="true"><i></i><i></i><i></i></div>';const [o,r]=full.split('/');let repo,rels;
  try{[repo,rels]=await Promise.all([api.repo(o,r),api.releases(o,r)])}catch(e){return t===rt&&fail(e,full)}
  if(t!==rt)return;full=repo.full_name;rec(full);document.title=full+' – GitGet';
  const all=rels.filter(x=>!x.draft);let inc=false,tag=null;
  const draw=foc=>{
    const pool=(inc?all:all.filter(x=>!x.prerelease));const P=pool.length?pool:all,rel=P.find(x=>x.tag_name===tag)||P[0];if(rel)tag=rel.tag_name;
    const tr=lib().find(x=>x.full===full);let body='';
    if(!rel)body=`<div class="note">No published releases yet. <a href="${esc(repo.html_url)}" rel="noopener">Open on GitHub</a></div>`;
    else{const {best,list}=pick(rel.assets,sys),dl=a=>a.browser_download_url,sha=(best?.digest||'').replace('sha256:',''),
      cmd=a=>(sys.os==='windows'?'curl.exe':'curl')+` -L -o "${a.name}" "${dl(a)}"`;
      body=`<div class="panel">${best?`<a class="btn pri big" href="${esc(dl(best))}" rel="noopener">⬇ Download for ${esc(sysText())}<small>${esc(best.name)} · ${fmt(best.size)}</small></a>${sha?`<p class="sha"><b>SHA-256</b> <code>${esc(sha)}</code> <button class="lnk" data-c="${esc(sha)}">Copy</button></p>`:''}<div class="row"><button class="btn" data-c="${esc(cmd(best))}">Copy download command</button></div>`:rel.assets.length?`<p class="note">No file clearly matches ${esc(sysText())}. Choose below or <button class="lnk" id="sysb">change system</button>.</p>`:`<p class="note">This release has no prebuilt files. <a href="${esc(rel.html_url)}" rel="noopener">Release page</a> · <a href="${esc(rel.zipball_url)}" rel="noopener">Source (zip)</a></p>`}
${rel.assets.length?`<details class="all"><summary>All files (${rel.assets.length})</summary><ul>${list.map(x=>`<li><a href="${esc(dl(x.a))}" rel="noopener">${esc(x.a.name)}</a><span>${fmt(x.a.size)} · ${x.a.download_count.toLocaleString()} downloads</span></li>`).join('')}</ul></details>`:''}</div>
${rel.body?`<h2>Release notes</h2><div class="md">${md(rel.body.slice(0,6000))}${rel.body.length>6000?'<p>…</p>':''}</div><p><a href="${esc(rel.html_url)}" rel="noopener">Full notes on GitHub</a></p>`:''}`}
    main.innerHTML=`<p><a href="#/">← Back</a></p>${tabs(full,'dl')}<div class="rh"><img src="${esc(av(full))}" alt="" width="64" height="64"><div><h1>${esc(full)}</h1><p>${esc(repo.description||'')}</p></div></div>
<div class="meta"><span>★ ${repo.stargazers_count.toLocaleString()}</span>${repo.license?.spdx_id&&repo.license.spdx_id!=='NOASSERTION'?`<span>${esc(repo.license.spdx_id)}</span>`:''}${repo.language?`<span>${esc(repo.language)}</span>`:''}${rel?`<span>Released ${esc(new Date(rel.published_at).toLocaleDateString())}</span>`:''}${repo.archived?'<span class="up">Archived</span>':''}</div>
<div class="row">${rel?`<select id="ver" aria-label="Version">${P.slice(0,20).map(x=>`<option value="${esc(x.tag_name)}"${x===rel?' selected':''}>${esc(x.name||x.tag_name)}${x.prerelease?' (pre-release)':''}</option>`).join('')}</select><label class="chk"><input type="checkbox" id="pre"${inc?' checked':''}> Pre-releases</label>`:''}<button class="btn" id="trk">${tr?'✓ Tracking — stop':'☆ Track updates'}</button><button class="btn" data-c="${esc(location.origin+location.pathname+'#/r/'+full)}">Copy link</button></div>${body}`;
    $('#ver')?.addEventListener('change',e=>{tag=e.target.value;draw('ver')});$('#pre')?.addEventListener('change',e=>{inc=e.target.checked;draw('pre')});$('#sysb')?.addEventListener('click',sysDlg);
    $('#trk').onclick=()=>{const L=lib();if(tr)setLib(L.filter(x=>x.full!==full));else{const st=all.find(x=>!x.prerelease)||rel;setLib([...L,{full,tag:rel?rel.tag_name:'',latest:st?st.tag_name:'',desc:repo.description||'',checked:Date.now()}])}badge();toast(tr?'Removed from library':'Tracking '+full);draw('trk')};
    if(foc)$('#'+foc)?.focus();};
  draw();$('#live').textContent='Loaded '+full;
}
function badge(){const n=lib().filter(x=>x.latest&&x.latest!==x.tag).length;const b=$('#badge');b.textContent=n;b.hidden=!n}
async function check(force){const L=lib(),u={};
  await Promise.all(L.map(async x=>{try{const [o,r]=x.full.split('/'),l=await api.latest(o,r,force);u[x.full]={latest:l.tag_name,checked:Date.now()}}catch{}}));
  setLib(lib().map(x=>({...x,...(u[x.full]||{})})));badge();return Object.keys(u).length}
function library(t){
  const draw=()=>{const L=lib(),only=$('#onl')?.checked;const show=only?L.filter(x=>x.latest&&x.latest!==x.tag):L;
    $('#ll').innerHTML=show.length?show.map(x=>{const up=x.latest&&x.latest!==x.tag;return `<li><div><img class="av" src="${esc(av(x.full))}" alt="" width="40" height="40"><span><a href="#/r/${esc(x.full)}"><b>${esc(x.full)}</b></a><br>${up?`<b class="up">Update: ${esc(x.tag||'?')} → ${esc(x.latest)}</b>`:`<span class="ok">Up to date${x.tag?' · '+esc(x.tag):''}</span>`}</span></div><span class="row">${up?`<button class="btn" data-a="mark" data-f="${esc(x.full)}">Mark updated</button>`:''}<a class="btn pri" href="#/r/${esc(x.full)}">Open</a><button class="btn" data-a="del" data-f="${esc(x.full)}" aria-label="Remove ${esc(x.full)}">✕</button></span></li>`}).join(''):`<li><p class="mut">${only?'Everything is up to date.':'Nothing tracked yet. Open an app and press “Track updates”.'} <a href="#/">Discover apps</a></p></li>`;
    $('#st').textContent=`${L.length} app(s) · ${L.filter(x=>x.latest&&x.latest!==x.tag).length} update(s)`;badge()};
  main.innerHTML=`<div class="lh"><h1>My Library</h1><div class="row"><button class="btn" id="chk">↻ Check updates</button><button class="btn" id="exp">Export</button><button class="btn" id="impb">Import</button><input id="imp" type="file" accept=".json,application/json" hidden></div></div><p class="mut" id="st" role="status"></p><label class="chk"><input type="checkbox" id="onl"> Only show updates</label><ul class="list" id="ll"></ul>`;
  draw();$('#onl').onchange=draw;
  $('#chk').onclick=async e=>{e.target.disabled=true;const n=await check(true);e.target.disabled=false;draw();toast(n?'Checked '+n+' app(s)':'Nothing to check',!n&&lib().length>0)};
  $('#ll').onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const f=b.dataset.f;setLib(b.dataset.a==='del'?lib().filter(x=>x.full!==f):lib().map(x=>x.full===f?{...x,tag:x.latest}:x));draw()};
  $('#exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({version:1,apps:lib().map(({full,tag})=>({full,tag}))},null,1)],{type:'application/json'}));a.download='gitget-library.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
  $('#impb').onclick=()=>$('#imp').click();
  $('#imp').onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text()),have=new Set(lib().map(x=>x.full)),add=(j.apps||[]).filter(x=>/^[\w.-]+\/[\w.-]+$/.test(x?.full)&&!have.has(x.full)).map(x=>({full:x.full,tag:String(x.tag||''),latest:'',desc:''}));setLib([...lib(),...add]);draw();toast('Imported '+add.length+' app(s)');if(add.length){await check(true);draw()}}catch{toast('That file isn’t a valid GitGet library.',1)}e.target.value=''};
  if(lib().some(x=>!x.checked||Date.now()-x.checked>36e5))check(false).then(()=>t===rt&&$('#ll')&&draw());
}
let booted=false;
const dec=s=>{try{return decodeURIComponent(s)}catch{return s}};
const H={$,$$,esc,main,toast,copy,fail,rec,hist:addHist,get sys(){return sys}};
function route(){const t=++rt,h=location.hash.slice(1)||'/',m=h.match(/^\/r\/([\w.-]+\/[\w.-]+)(\/(files|releases|stats)(?:\/([^/]*))?(?:\/(.*))?)?/);
  const cur=h.startsWith('/library')?'library':'home';$$('nav a').forEach(a=>a.toggleAttribute('aria-current',a.dataset.r===cur));
  document.title='GitGet – Download the right GitHub release for your device';
  const ok=()=>t===rt;if(m&&m[3]==='files')files(H,m[1],dec(m[4]||''),dec(m[5]||''),ok);else if(m&&m[3]==='releases')releases(H,m[1],ok);else if(m&&m[3]==='stats')stats(H,m[1],ok);else if(m)detail(m[1],t);else if(/^\/g\/[0-9a-f]{20,40}/i.test(h))gist(H,h.slice(3).match(/^[0-9a-f]+/i)[0].toLowerCase(),ok);else if(h.startsWith('/library')){document.title='My Library – GitGet';library(t)}else home();
  scrollTo(0,0);if(booted)main.focus({preventScroll:true});booted=true;setTimeout(()=>{if(t===rt)$('#live').textContent=document.title},500)}
(async()=>{theme(get('gg.theme','auto'));dens(get('gg.dens','comfortable'));sys=await detect();paintSys();
  $('#sys').onclick=sysDlg;$('#hst').onclick=histDlg;$('#cfg').onclick=cfg;$('#theme').onclick=()=>{const o=['auto','light','dark'],n=o[(o.indexOf(get('gg.theme','auto'))+1)%3];theme(n);toast('Theme: '+n)};
  main.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b)copy(b.dataset.c)});
  addEventListener('hashchange',route);
  addEventListener('offline',()=>toast('You’re offline — cached data only.',1));addEventListener('online',()=>toast('Back online'));
  addEventListener('gg:rl',()=>{const r=api.rate;$('#rl').textContent=`GitHub API: ${r.remaining}/${r.limit} requests left this hour`});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!dlg.open){e.preventDefault();if(!$('#q')){location.hash='#/';setTimeout(()=>$('#q')?.focus(),50)}else $('#q').focus()}});
  route();badge();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
