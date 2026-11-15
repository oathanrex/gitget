import * as api from './api.js';
import {tabs} from './files.js';
import {md} from './md.js';
import {pick,fmt} from './match.js';
const SK='<div class="sk" aria-busy="true"><i></i><i></i><i></i></div>',D=s=>s?new Date(s).toLocaleDateString():'—',N=v=>typeof v==='number'?v.toLocaleString():v??'—';
export async function releases(H,full,alive){
  const {$,esc,main}=H,[o,r]=full.split('/');main.innerHTML=SK;let page=1,all=[],more=false;
  const load=async()=>{const x=await api.releases(o,r,page);more=x.length>=20;all=all.concat(x.filter(y=>!y.draft))};
  try{await load()}catch(e){return alive()&&H.fail(e,full)}
  if(!alive())return;document.title=`${full} releases – GitGet`;const lat=all.find(x=>!x.prerelease);
  const draw=()=>{main.innerHTML=`<p><a href="#/">← Back</a></p>${tabs(full,'rl')}<h1 class="h">${esc(full)}</h1>`+(all.length?all.map((x,i)=>{
    const {best}=pick(x.assets,H.sys),dl=x.assets.reduce((a,b)=>a+b.download_count,0);
    return `<article class="panel"><h2>${esc(x.name||x.tag_name)} ${x===lat?'<span class="badge ok">Latest</span>':''}${x.prerelease?'<span class="badge">Pre-release</span>':''}</h2><p class="mut">${esc(x.tag_name)} · ${D(x.published_at)} · ${x.assets.length} file(s) · ${dl.toLocaleString()} downloads</p>${best?`<a class="btn pri" href="${esc(best.browser_download_url)}" rel="noopener">⬇ ${esc(best.name)} <small>${fmt(best.size)}</small></a>`:''}${x.body?`<details${i===0?' open':''}><summary>Release notes</summary><div class="md">${md(x.body.slice(0,8000))}</div></details>`:''}${x.assets.length?`<details class="all"><summary>All files</summary><ul>${x.assets.map(a=>`<li><a href="${esc(a.browser_download_url)}" rel="noopener">${esc(a.name)}</a><span>${fmt(a.size)} · ${a.download_count.toLocaleString()} ↓</span></li>`).join('')}</ul></details>`:''}</article>`}).join(''):'<p class="note">No releases published.</p>')+(more?'<div class="row"><button class="btn" id="more">Load more</button></div>':'');
    $('#more')?.addEventListener('click',async e=>{e.target.disabled=true;page++;try{await load();if(alive())draw()}catch(x){e.target.disabled=false;H.toast(x.message,1)}})};
  draw();
}
export async function stats(H,full,alive){
  const {esc,main}=H,[o,r]=full.split('/');main.innerHTML=SK;
  const R=await Promise.allSettled([api.repo(o,r),api.langs(o,r),api.activity(o,r),api.contribs(o,r),api.commits(o,r)]);
  if(!alive())return;if(R[0].status==='rejected')return H.fail(R[0].reason,full);
  const [rp,lg,ac,co,cm]=R.map(x=>x.value),bad=(i,n)=>R[i].status==='rejected'?`<p class="mut">Couldn’t load ${n}: ${esc(R[i].reason.message)}</p>`:'';
  document.title=`${full} insights – GitGet`;
  const lic=rp.license?.spdx_id&&rp.license.spdx_id!=='NOASSERTION'?rp.license.spdx_id:rp.license?.name;
  const facts=[['★ Stars',rp.stargazers_count],['Forks',rp.forks_count],['Watchers',rp.subscribers_count],['Open issues & PRs',rp.open_issues_count],['Size',fmt((rp.size||0)*1024)],['Default branch',rp.default_branch],['Created',D(rp.created_at)],['Last push',D(rp.pushed_at)],['License',lic]];
  const tot=lg?Object.values(lg).reduce((a,b)=>a+b,0):0,LG=lg&&tot?Object.entries(lg).sort((a,b)=>b[1]-a[1]).slice(0,8):[];let x=0;
  const bar=LG.map(([n,b],i)=>{const w=b/tot*100,s=`<rect class="p${i}" x="${x.toFixed(2)}" width="${w.toFixed(2)}" height="8"><title>${esc(n)}</title></rect>`;x+=w;return s}).join('');
  const W=Array.isArray(ac)?ac:[],mx=Math.max(1,...W.map(w=>w.total)),sum=W.reduce((a,w)=>a+w.total,0);
  main.innerHTML=`<p><a href="#/">← Back</a></p>${tabs(full,'st')}<h1 class="h">${esc(full)}</h1><p>${esc(rp.description||'')}</p>
<div class="grid">${facts.map(([k,v])=>`<div class="panel"><span class="mut">${k}</span><br><b>${esc(N(v))}</b></div>`).join('')}</div>
${rp.topics?.length?`<div class="chips">${rp.topics.map(t=>`<span class="badge">${esc(t)}</span>`).join('')}</div>`:''}
<h2>Languages</h2>${LG.length?`<svg class="lbar" viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label="Language breakdown">${bar}</svg><ul class="legend">${LG.map(([n,b],i)=>`<li><svg width="10" height="10" aria-hidden="true"><rect class="p${i}" width="10" height="10"/></svg> ${esc(n)} <span class="mut">${(b/tot*100).toFixed(1)}%</span></li>`).join('')}</ul>`:bad(1,'languages')||'<p class="mut">No language data.</p>'}
<h2>Commit activity <small>last 52 weeks${W.length?' · '+sum.toLocaleString()+' commits':''}</small></h2>${W.length?`<svg class="act" viewBox="0 0 520 80" role="img" aria-label="Commits per week over the last 52 weeks, ${sum} in total">${W.map((w,i)=>{const h=Math.max(1,Math.round(w.total/mx*70));return `<rect class="bar" x="${i*10}" y="${76-h}" width="8" height="${h}"><title>Week of ${D(w.week*1e3)}: ${w.total} commits</title></rect>`}).join('')}</svg>`:bad(2,'activity')||'<p class="mut">GitHub is still computing this — reload in a minute.</p>'}
<h2>Top contributors</h2>${Array.isArray(co)&&co.length?`<ul class="list">${co.map(c=>`<li><div><img class="av" src="${esc(c.avatar_url)}" alt="" width="40" height="40" loading="lazy"><a href="${esc(c.html_url)}" rel="noopener">${esc(c.login)}</a></div><span class="mut">${c.contributions.toLocaleString()} commits</span></li>`).join('')}</ul>`:bad(3,'contributors')||'<p class="mut">No contributor data.</p>'}
<h2>Recent commits</h2>${Array.isArray(cm)&&cm.length?`<ul class="list">${cm.map(c=>`<li><div><span><b>${esc((c.commit.message||'').split('\n')[0].slice(0,120))}</b><br><span class="mut">${esc(c.commit.author?.name||'')} · ${D(c.commit.author?.date)}</span></span></div><a href="${esc(c.html_url)}" rel="noopener"><code>${esc(c.sha.slice(0,7))}</code></a></li>`).join('')}</ul>`:bad(4,'commits')||'<p class="mut">No commits.</p>'}`;
}
