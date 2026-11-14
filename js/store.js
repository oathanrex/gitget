export const get=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}};
export const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
export const lib=()=>get('gg.lib',[]);
export const setLib=v=>set('gg.lib',v);
