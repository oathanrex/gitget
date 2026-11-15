export const sq=s=>"'"+String(s).replace(/'/g,"'\\''")+"'";
const seg=p=>p.split('/').map(encodeURIComponent).join('/');
export const rawUrl=(o,r,ref,p)=>`https://raw.githubusercontent.com/${o}/${r}/${seg(ref)}/${seg(p)}`;
export function cmds({o,r,ref,path='',file=''}){
  const out=[],U=`https://github.com/${o}/${r}.git`,sha=/^[0-9a-f]{40}$/i.test(ref),br=sha?'':` --branch ${sq(ref)}`,co=sha?` ${sq(ref)}`:'';
  if(file){const raw=rawUrl(o,r,ref,file),n=file.split('/').pop();
    out.push(['Raw URL',raw],['jsDelivr CDN',`https://cdn.jsdelivr.net/gh/${o}/${r}@${encodeURIComponent(ref)}/${seg(file)}`],['Statically CDN',`https://cdn.statically.io/gh/${o}/${r}/${seg(ref)}/${seg(file)}`],
      ['curl',`curl -L -o ${sq(n)} ${sq(raw)}`],['wget',`wget -O ${sq(n)} ${sq(raw)}`],
      ['GitHub CLI',`gh api ${sq(`repos/${o}/${r}/contents/${seg(file)}?ref=${encodeURIComponent(ref)}`)} -H 'Accept: application/vnd.github.raw' > ${sq(n)}`])}
  out.push(path?['Sparse checkout (this folder)',`git clone --filter=blob:none --no-checkout${br} ${sq(U)} && cd ${sq(r)} && git sparse-checkout set --cone ${sq(path)} && git checkout${co}`]
    :['Shallow clone',sha?`git clone ${sq(U)} && cd ${sq(r)} && git checkout ${sq(ref)}`:`git clone --depth 1${br} ${sq(U)}`],
    ['degit (scaffold)',`npx degit ${sq(`${o}/${r}${path?'/'+path:''}#${ref}`)}`],['Whole-repo ZIP (link)',`https://codeload.github.com/${o}/${r}/zip/${seg(ref)}`]);
  return out;
}
