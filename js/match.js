const EXT={windows:{exe:50,msi:45,msix:30,zip:10},macos:{dmg:50,pkg:45,zip:10},linux:{appimage:70,deb:44,rpm:42,snap:30,flatpak:30,'tar.gz':12,'tar.xz':12,zip:6},android:{apk:50,aab:5},ios:{ipa:40}};
const OSW={windows:/(^|[^a-z])win(dows|32|64)?([^a-z]|$)|\.(exe|msi|msix)$|msvc/,macos:/(^|[^a-z])(mac(os)?|osx|darwin)([^a-z]|$)|\.(dmg|pkg)$/,linux:/linux|appimage|\.(deb|rpm|snap|flatpak)$|ubuntu|debian|fedora/,android:/android|\.(apk|aab)$/,ios:/\.ipa$|(^|[^a-z])ios([^a-z]|$)/};
const ARCH={x64:/x86[_-]?64|x64|amd64|win64/,x86:/(^|[^a-z0-9])(x86(?![_-]?64)|ia32|i[3-6]86|win32)([^a-z0-9]|$)/,arm64:/arm64|aarch64|armv8/,arm:/armv7|armhf|armeabi|(^|[^a-z0-9])arm([^a-z0-9]|$)/};
const JUNK=/\.(sha\d*|sig|asc|pem|sbom|blockmap|txt|json|jsonl|ya?ml|md|sum|minisig|pdb|dsym)$|checksums?|sha\d*sums?|symbols|[-_.]debug(?!.*\.apk)|source/;
const ext=n=>{for(const e of['tar.gz','tar.xz','tar.bz2'])if(n.endsWith('.'+e))return e;return n.split('.').pop()};
export function score(name,{os,arch}){
  const n=name.toLowerCase();if(JUNK.test(n))return -100;
  let s=EXT[os][ext(n)]??0;
  if(OSW[os].test(n))s+=15;else if(Object.keys(OSW).some(k=>k!==os&&OSW[k].test(n)))s-=60;
  const has=Object.keys(ARCH).filter(k=>ARCH[k].test(n));
  if(has.includes(arch))s+=25;else if(has.length&&arch!=='any')s-=40;else if(!has.length)s+=arch==='any'?10:arch==='x64'?3:-20;
  if((os==='macos'||os==='android')&&/universal/.test(n))s+=20;
  if(/setup|install/.test(n))s+=6;if(/portable|nosandbox/.test(n))s-=8;
  return s;
}
export function pick(assets,sys){
  const list=assets.map(a=>({a,s:score(a.name,sys)})).sort((x,y)=>y.s-x.s);
  return {best:list[0]&&list[0].s>=40?list[0].a:null,list};
}
export const fmt=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(0)+' KB':b<1073741824?(b/1048576).toFixed(1)+' MB':(b/1073741824).toFixed(2)+' GB';
