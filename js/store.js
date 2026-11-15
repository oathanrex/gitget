export const get=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}};
export const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
export const lib=()=>get('gg.lib',[]);
export const setLib=v=>set('gg.lib',v);
export const hist=()=>get('gg.hist',[]);
export const setHist=v=>set('gg.hist',v);
export const addHist=e=>setHist([{...e,t:Date.now()},...hist().filter(x=>e.k==='zip'||!(x.hash===e.hash&&x.k===e.k))].slice(0,50));
