export function build(items,base){
  const root={name:base.split('/').pop(),path:base,dir:1,kids:new Map()};
  for(const it of items){if(it.type!=='blob'||(base&&!it.path.startsWith(base+'/')))continue;
    const parts=(base?it.path.slice(base.length+1):it.path).split('/');let n=root;
    for(const p of parts.slice(0,-1)){let k=n.kids.get(p);if(!k){k={name:p,path:(n.path?n.path+'/':'')+p,dir:1,kids:new Map()};n.kids.set(p,k)}n=k}
    n.kids.set(parts.at(-1),{name:parts.at(-1),path:it.path,size:it.size||0,sha:it.sha})}
  return root;
}
export const files=n=>n._f??(n._f=n.dir?[...n.kids.values()].flatMap(files):[n]);
const g2r=g=>g.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*\*/g,'\0').replace(/\*/g,'[^/]*').replace(/\?/g,'[^/]').replace(/\0/g,'.*');
export function matcher(pats){
  const R=pats.map(p=>p.trim()).filter(Boolean).map(p=>{const dir=p.endsWith('/');p=p.replace(/\/$/,'').replace(/^\//,'');
    return new RegExp((p.includes('/')?'^':'(^|/)')+g2r(p)+(dir?'/':'($|/)'))});
  return path=>R.some(x=>x.test(path));
}
