export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const C={'#':/#[^\n]*/.source,'//':/\/\/[^\n]*|\/\*[\s\S]*?\*\//.source,'--':/--[^\n]*/.source,'<':/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//.source};
const S=/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\\n])*`/.source;
const KW=/^(?:as|async|await|break|case|catch|class|const|continue|def|default|do|elif|else|enum|except|export|extends|false|finally|fn|for|from|func|function|if|impl|import|in|interface|is|let|match|new|nil|none|null|pass|pub|raise|return|self|static|struct|super|switch|this|throw|true|try|type|use|var|void|while|with|yield)$/i;
export function hl(code,lang=''){
  if(!lang||/^(txt|text|md|markdown|log|csv)$/.test(lang))return esc(code);
  const cm=/^(py|python|rb|ruby|sh|bash|zsh|ya?ml|toml|r|pl|ps1|mk|conf|ini|dockerfile)$/.test(lang)?'#':/^(sql|lua|hs)$/.test(lang)?'--':/^(html?|xml|svg|css|scss|vue)$/.test(lang)?'<':'//';
  const rx=new RegExp(`(${C[cm]})|(${S})|(\\b\\d[\\w.]*)|([A-Za-z_]\\w*)|([\\s\\S])`,'g');let o='';
  for(const m of code.matchAll(rx)){const t=esc(m[0]);o+=m[1]?`<i class="c">${t}</i>`:m[2]?`<i class="s">${t}</i>`:m[3]?`<i class="n">${t}</i>`:m[4]&&KW.test(m[4])?`<i class="k">${t}</i>`:t}
  return o;
}
const TAGS=/<\/?(?:p|div|img|br|a|b|i|em|strong|picture|source|h[1-6]|ul|ol|li|details|summary|sup|sub|span|center|table|tr|td|th|thead|tbody|kbd|hr)\b[^>]*>/gi;
const link=(t,u)=>/^(https?:\/\/|mailto:|#)/i.test(u)?`<a href="${u}" rel="noopener nofollow">${t}</a>`:t;
const inl=s=>s.split(/(`[^`\n]+`)/).map((p,i)=>i%2?`<code>${esc(p.slice(1,-1))}</code>`:esc(p.replace(TAGS,''))
  .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g,(_,a,b)=>`<b>${a||b}</b>`)
  .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g,'$1<i>$2</i>')
  .replace(/!?\[([^\]]*)\]\(([^)\s]+)(?:\s+&#34;[^)]*&#34;)?\)/g,(_,t,u)=>link(t||u,u))
  .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,'$1<a href="$2" rel="noopener nofollow">$2</a>')).join('');
const cells=l=>l.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
const LI=/^\s*([-*+]|\d+[.)])\s+/;
export function md(src){
  const L=String(src).replace(/\r/g,'').replace(/<!--[\s\S]*?-->/g,'').split('\n'),P=[];let o='',i=0,m;
  const fl=()=>{if(P.length){o+='<p>'+inl(P.join(' '))+'</p>';P.length=0}};
  while(i<L.length){const l=L[i];
    if(m=l.match(/^\s*```\s*([\w+-]*)/)){fl();const b=[];i++;while(i<L.length&&!/^\s*```/.test(L[i]))b.push(L[i++]);i++;o+=`<pre class="code"><code>${hl(b.join('\n'),m[1].toLowerCase())}</code></pre>`;continue}
    if(m=l.match(/^(#{1,6})\s+(.*?)\s*#*$/)){fl();const n=Math.min(6,m[1].length+1);o+=`<h${n}>${inl(m[2])}</h${n}>`;i++;continue}
    if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)){fl();o+='<hr>';i++;continue}
    if(/^\s*>/.test(l)){fl();const b=[];while(i<L.length&&/^\s*>/.test(L[i]))b.push(L[i++].replace(/^\s*>\s?/,''));o+='<blockquote>'+md(b.join('\n'))+'</blockquote>';continue}
    if(LI.test(l)){fl();const ol=/^\s*\d/.test(l),b=[];while(i<L.length&&LI.test(L[i]))b.push(L[i++].replace(LI,''));
      o+=(ol?'<ol>':'<ul>')+b.map(x=>'<li>'+inl(x.replace(/^\[( |x)\]\s/i,(_,c)=>c===' '?'☐ ':'☑ '))+'</li>').join('')+(ol?'</ol>':'</ul>');continue}
    if(l.includes('|')&&/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(L[i+1]||'')){fl();const h=cells(l),R=[];i+=2;while(i<L.length&&L[i].trim()&&L[i].includes('|'))R.push(cells(L[i++]));
      o+=`<div class="tw"><table><thead><tr>${h.map(c=>`<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>${R.map(r=>`<tr>${r.map(c=>`<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;continue}
    if(!l.trim()){fl();i++;continue}
    P.push(l.trim());i++}
  fl();return o;
}
