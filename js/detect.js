import {get,set} from './store.js';
export const LABEL={windows:'Windows',macos:'macOS',linux:'Linux',android:'Android',ios:'iOS'};
export const ARCHL={x64:'64-bit (x64)',arm64:'ARM64',x86:'32-bit (x86)',arm:'ARM',any:'Intel / Apple Silicon'};
export const saveSys=s=>set('gg.sys',s);
export const clearSys=()=>{try{localStorage.removeItem('gg.sys')}catch{}};
export function guess(ua=navigator.userAgent,pf=navigator.userAgentData?.platform||navigator.platform||'',touch=navigator.maxTouchPoints||0){
  const s=pf+' '+ua;let os='windows';
  if(/android/i.test(ua))os='android';
  else if(/iphone|ipad|ipod/i.test(ua)||(/mac/i.test(pf)&&touch>1))os='ios';
  else if(/mac/i.test(s))os='macos';
  else if(/linux|x11|cros/i.test(s))os='linux';
  let arch=/arm|aarch64/i.test(s)?'arm64':'x64';
  if(os==='macos')arch='any'; // UA always says Intel on Apple Silicon
  return {os,arch};
}
export async function detect(){
  const s=get('gg.sys',null);if(s&&LABEL[s.os])return s;
  const g=guess();
  try{const h=await navigator.userAgentData?.getHighEntropyValues(['architecture','bitness']);
    if(h?.architecture){const a=h.architecture,b=h.bitness==='64';
      g.arch=a==='arm'?(b?'arm64':'arm'):a==='x86'?(b?'x64':'x86'):g.arch}}catch{}
  return g;
}
