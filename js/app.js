import {detect,saveSys,clearSys,LABEL,ARCHL} from './detect.js';
import {pick,score,fmt} from './match.js';
import * as api from './api.js';
import {lib,setLib,get,set,hist,setHist,addHist} from './store.js';
import {files,tabs,dens} from './files.js';
import {gist} from './gist.js';
import {releases,stats} from './views.js';
import {md} from './md.js';
import {ICONS} from './icons.js';

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const av=f=>`https://avatars.githubusercontent.com/${f.split('/')[0]}?s=80`;

const CATS={
  all:{name:'All Apps',icon:ICONS.catAll},
  dev:{name:'Developer Tools',icon:ICONS.catDev},
  productivity:{name:'Productivity',icon:ICONS.catProd},
  media:{name:'Media & Audio',icon:ICONS.catMedia},
  security:{name:'Security & Privacy',icon:ICONS.catSecurity},
  utilities:{name:'Utilities',icon:ICONS.catUtils}
};

const OS_ICONS={
  windows:ICONS.windows,
  macos:ICONS.macos,
  linux:ICONS.linux,
  android:ICONS.android,
  ios:ICONS.ios
};

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

const toast=(m,e)=>{
  const t=document.createElement('div');
  t.className='toast'+(e?' err':'');
  t.setAttribute('role',e?'alert':'status');
  t.innerHTML=`<span>${m}</span>`;
  $('#toasts').append(t);
  setTimeout(()=>t.remove(),4500);
};

const copy=async(t,m='Copied to clipboard')=>{
  try{
    await navigator.clipboard.writeText(t);
    toast(m);
  }catch{
    toast('Copy blocked by browser — please select and copy manually.',1);
  }
};

const sysText=()=>LABEL[sys.os]+' · '+ARCHL[sys.arch];

const paintSys=()=>{
  const ico=OS_ICONS[sys.os]||ICONS.logo;
  const shortArch=ARCHL[sys.arch]?ARCHL[sys.arch].split(' ')[0]:sys.arch;
  $('#sys').innerHTML=`${ico} <span>${esc(LABEL[sys.os])} · ${esc(shortArch)}</span> ${ICONS.chevronDown}`;
};

const paintThemeIcon=t=>{
  const thEl=$('#theme');
  if(!thEl)return;
  thEl.innerHTML=t==='dark'?ICONS.moon:ICONS.sun;
  thEl.setAttribute('aria-label',`Theme: ${t}`);
};

const modal=(t,b,m)=>{
  dlg.setAttribute('aria-label',t);
  dlg.innerHTML=`<form method="dialog" class="dh"><h2>${t}</h2><button class="x" aria-label="Close dialog" type="submit">${ICONS.close}</button></form><div class="db">${b}</div>`;
  m&&m();
  dlg.open||dlg.showModal();
};

dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});

const seg=(id,vals,L,cur)=>`<div class="seg" id="${id}">${vals.map(v=>`<button type="button" data-v="${v}" aria-pressed="${v===cur}">${esc(L?L[v]:v)}</button>`).join('')}</div>`;

const segBind=(id,fn)=>{
  $('#'+id,dlg).onclick=e=>{
    const b=e.target.closest('button');
    if(!b)return;
    fn(b.dataset.v);
    $$('button',e.currentTarget).forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
  };
};

const PKG_MAP = {
  'obsidianmd/obsidian-releases': {
    winget: 'winget install Obsidian.Obsidian',
    brew: 'brew install --cask obsidian',
    flatpak: 'flatpak install flathub md.obsidian.Obsidian',
    scoop: 'scoop install obsidian'
  },
  'neovim/neovim': {
    winget: 'winget install Neovim.Neovim',
    brew: 'brew install neovim',
    flatpak: 'flatpak install flathub io.neovim.nvim',
    scoop: 'scoop install neovim',
    apt: 'sudo apt install neovim'
  },
  'VSCodium/vscodium': {
    winget: 'winget install VSCodium.VSCodium',
    brew: 'brew install --cask vscodium',
    flatpak: 'flatpak install flathub com.vscodium.codium',
    scoop: 'scoop install vscodium'
  },
  'git-for-windows/git': {
    winget: 'winget install Git.Git',
    scoop: 'scoop install git'
  },
  'godotengine/godot': {
    winget: 'winget install GodotEngine.GodotEngine',
    brew: 'brew install --cask godot',
    flatpak: 'flatpak install flathub org.godotengine.Godot',
    scoop: 'scoop install godot'
  },
  'obsproject/obs-studio': {
    winget: 'winget install OBSProject.OBSStudio',
    brew: 'brew install --cask obs',
    flatpak: 'flatpak install flathub com.obsproject.Studio',
    scoop: 'scoop install obs-studio'
  },
  'HandBrake/HandBrake': {
    winget: 'winget install HandBrake.HandBrake',
    brew: 'brew install --cask handbrake',
    flatpak: 'flatpak install flathub fr.handbrake.ghb',
    scoop: 'scoop install handbrake'
  },
  'dbeaver/dbeaver': {
    winget: 'winget install dbeaver.dbeaver',
    brew: 'brew install --cask dbeaver-community',
    flatpak: 'flatpak install flathub io.dbeaver.DBeaverCommunity'
  },
  'nushell/nushell': {
    winget: 'winget install Nushell.Nushell',
    brew: 'brew install nushell',
    cargo: 'cargo install nu',
    scoop: 'scoop install nu'
  },
  'bitwarden/clients': {
    winget: 'winget install Bitwarden.Bitwarden',
    brew: 'brew install --cask bitwarden',
    flatpak: 'flatpak install flathub com.bitwarden.desktop'
  },
  'keepassxreboot/keepassxc': {
    winget: 'winget install KeePassXCTeam.KeePassXC',
    brew: 'brew install --cask keepassxc',
    flatpak: 'flatpak install flathub org.keepassxc.KeePassXC'
  },
  'termux/termux-app': {
    adb: 'adb install termux-app.apk'
  }
};

function getPkgCommands(repoFullName, bestFile){
  const mapped = PKG_MAP[repoFullName] || {};
  const repoName = (repoFullName.split('/')[1] || repoFullName).toLowerCase();
  const cmds = [];
  if(mapped.winget) cmds.push({ mgr: 'winget', cmd: mapped.winget });
  else cmds.push({ mgr: 'winget', cmd: `winget install ${repoName}` });

  if(mapped.brew) cmds.push({ mgr: 'brew', cmd: mapped.brew });
  else cmds.push({ mgr: 'brew', cmd: `brew install ${repoName}` });

  if(mapped.flatpak) cmds.push({ mgr: 'flatpak', cmd: mapped.flatpak });

  if(bestFile && bestFile.name.endsWith('.apk')){
    cmds.push({ mgr: 'adb', cmd: `adb install "${bestFile.name}"` });
  }
  return cmds;
}

async function verifyFileHash(file, expectedSha){
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash, isMatch: hash.toLowerCase() === expectedSha.toLowerCase().trim() };
}

function openPalette(){
  let palDlg = $('#palette-dlg');
  if(!palDlg){
    palDlg = document.createElement('dialog');
    palDlg.id = 'palette-dlg';
    document.body.appendChild(palDlg);
  }

  const items = [
    { group: 'Views', label: 'Home Page', hint: 'Browse Open-Source Apps', icon: ICONS.repo, action: () => { location.hash = '#/'; } },
    { group: 'Views', label: 'My Library', hint: 'Tracked Updates & Releases', icon: ICONS.star, action: () => { location.hash = '#/lib'; } },
    { group: 'Views', label: 'Recent History', hint: 'Past Visits & Downloads', icon: ICONS.history, action: () => histDlg() },
    { group: 'Views', label: 'Settings & GitHub Token', hint: 'API Quotas & Token', icon: ICONS.gear, action: () => cfg() },

    { group: 'Switch Target Operating System', label: 'Switch to Windows (x64)', hint: 'Standard PCs & Laptops', icon: ICONS.windows, action: () => { sys = { os: 'windows', arch: 'x64' }; saveSys(sys); paintSys(); route(); } },
    { group: 'Switch Target Operating System', label: 'Switch to macOS (Apple Silicon)', hint: 'M1 / M2 / M3 / M4 Macs', icon: ICONS.macos, action: () => { sys = { os: 'macos', arch: 'arm64' }; saveSys(sys); paintSys(); route(); } },
    { group: 'Switch Target Operating System', label: 'Switch to Linux (x86_64)', hint: 'Standard PC & Servers', icon: ICONS.linux, action: () => { sys = { os: 'linux', arch: 'x64' }; saveSys(sys); paintSys(); route(); } },
    { group: 'Switch Target Operating System', label: 'Switch to Android (ARM64)', hint: 'Modern 64-bit Phones (v8a)', icon: ICONS.android, action: () => { sys = { os: 'android', arch: 'arm64' }; saveSys(sys); paintSys(); route(); } },
    { group: 'Switch Target Operating System', label: 'Switch to iOS (.ipa)', hint: 'iPhone & iPad Sideloading', icon: ICONS.ios, action: () => { sys = { os: 'ios', arch: 'arm64' }; saveSys(sys); paintSys(); route(); } },

    { group: 'Preferences & Actions', label: 'Toggle Appearance Theme', hint: 'Light / Dark Mode', icon: ICONS.moon, action: () => {
      const o = ['auto', 'light', 'dark'];
      const n = o[(o.indexOf(get('gg.theme', 'auto')) + 1) % 3];
      theme(n);
    }},
    { group: 'Preferences & Actions', label: 'Auto-detect Current Device', hint: 'Live System Scan', icon: ICONS.crosshair, action: async () => {
      clearSys();
      sys = await detect();
      paintSys();
      route();
    }},

    ...FEAT.map(([full, desc]) => ({
      group: 'Popular Apps',
      label: full.split('/')[1] || full,
      hint: desc,
      icon: ICONS.download,
      action: () => { location.hash = `#/r/${full}`; }
    }))
  ];

  let selectedIndex = 0;
  let filtered = [...items];

  const render = () => {
    let currentGroup = '';
    const bodyHtml = filtered.length ? filtered.map((item, idx) => {
      let groupHeader = '';
      if(item.group !== currentGroup){
        currentGroup = item.group;
        groupHeader = `<div class="palette-group-title">${esc(currentGroup)}</div>`;
      }
      return `${groupHeader}
        <button type="button" class="palette-item ${idx === selectedIndex ? 'active' : ''}" data-idx="${idx}">
          ${item.icon || ICONS.repo}
          <span class="palette-label">${esc(item.label)}</span>
          <span class="palette-hint">${esc(item.hint)}</span>
        </button>`;
    }).join('') : '<div style="padding:1.5rem;text-align:center;color:var(--mut)">No matching commands or apps</div>';

    $('#palette-body', palDlg).innerHTML = bodyHtml;
    const activeEl = $('.palette-item.active', palDlg);
    if(activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  };

  palDlg.innerHTML = `
    <div class="palette-header">
      ${ICONS.search}
      <input type="text" class="palette-input" id="palette-input" placeholder="Type a command, app name, or action..." autocomplete="off">
      <span class="palette-esc">ESC</span>
    </div>
    <div class="palette-body" id="palette-body"></div>
  `;

  if(!palDlg.open) palDlg.showModal();
  render();

  const inp = $('#palette-input', palDlg);
  inp.focus();

  inp.addEventListener('input', () => {
    const q = inp.value.toLowerCase().trim();
    if(!q){
      filtered = [...items];
    } else {
      filtered = items.filter(it => it.label.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q) || (it.group && it.group.toLowerCase().includes(q)));
    }
    selectedIndex = 0;
    render();
  });

  palDlg.addEventListener('keydown', e => {
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % Math.max(1, filtered.length);
      render();
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + filtered.length) % Math.max(1, filtered.length);
      render();
    } else if(e.key === 'Enter'){
      e.preventDefault();
      if(filtered[selectedIndex]){
        palDlg.close();
        filtered[selectedIndex].action();
      }
    } else if(e.key === 'Escape'){
      palDlg.close();
    }
  });

  $('#palette-body', palDlg).addEventListener('click', e => {
    const btn = e.target.closest('.palette-item');
    if(!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    if(filtered[idx]){
      palDlg.close();
      filtered[idx].action();
    }
  });

  palDlg.addEventListener('click', e => {
    if(e.target === palDlg) palDlg.close();
  });
}

const OS_ARCH_MAP = {
  windows: [
    { id: 'x64', label: '64-bit (x64)', hint: 'Standard PCs & Laptops' },
    { id: 'arm64', label: 'ARM64', hint: 'Snapdragon X / Surface Pro' },
    { id: 'x86', label: '32-bit (x86)', hint: 'Legacy Windows PCs' }
  ],
  macos: [
    { id: 'arm64', label: 'Apple Silicon', hint: 'M1 / M2 / M3 / M4 Macs' },
    { id: 'x64', label: 'Intel Mac', hint: '64-bit Intel Macs' },
    { id: 'any', label: 'Universal', hint: 'Runs on Intel & Apple Silicon' }
  ],
  linux: [
    { id: 'x64', label: 'x86_64', hint: 'Standard Linux PC & Servers' },
    { id: 'arm64', label: 'ARM64 (aarch64)', hint: 'Raspberry Pi 4/5, Servers' },
    { id: 'arm', label: 'ARM 32-bit (armhf)', hint: 'Older Embedded Systems' }
  ],
  android: [
    { id: 'arm64', label: 'Modern Phones (ARM64)', hint: 'v8a · 95%+ of Android Devices' },
    { id: 'any', label: 'Universal APK', hint: 'Works on all Android phones' },
    { id: 'arm', label: 'Legacy Phones (ARM)', hint: 'v7a · Older/Budget phones' },
    { id: 'x64', label: 'PC Emulators (x86_64)', hint: 'BlueStacks, WSA, Emulators' }
  ],
  ios: [
    { id: 'arm64', label: '64-bit (ARM64)', hint: 'iPhone & iPad Sideloading (.ipa)' }
  ]
};

async function sysDlg(){
  let {os,arch}=sys;
  const live=await detect();

  const renderArch=(targetOs, selectedArch)=>{
    const list=OS_ARCH_MAP[targetOs]||OS_ARCH_MAP.windows;
    return list.map(item=>`
      <button type="button" class="ar-card" data-v="${item.id}" aria-pressed="${item.id===selectedArch}">
        <span class="ar-top">${ICONS.cpu} <span>${esc(item.label)}</span></span>
        <span class="ar-hint">${esc(item.hint)}</span>
      </button>
    `).join('');
  };

  const osButtons=Object.keys(LABEL).map(k=>`
    <button type="button" data-v="${k}" aria-pressed="${k===os}">
      ${OS_ICONS[k]||''}
      <span>${esc(LABEL[k])}</span>
    </button>
  `).join('');

  modal(
    'Target System & Architecture',
    `<div class="detected-device-card">
       <div class="ddc-info">
         <span class="ddc-pulse"></span>
         <span>Live Device: <b>${esc(LABEL[live.os]||'Auto')} · ${esc(live.arch.toUpperCase())}</b></span>
       </div>
       <button type="button" class="btn sm" id="use-live">${ICONS.crosshair} Use this device</button>
     </div>
     <p class="db-sub">GitGet scores and picks release assets matching your chosen configuration.</p>
     <div class="db-label">Operating System</div>
     <div class="os-grid" id="os-seg">${osButtons}</div>
     <div class="db-label">CPU Architecture</div>
     <div class="ar-grid" id="ar-seg">${renderArch(os, arch)}</div>
     <div class="modal-footer">
       <button type="button" class="btn" id="auto">${ICONS.crosshair} Auto-detect</button>
       <button type="button" class="btn pri" id="ok">${ICONS.check} Apply Changes</button>
     </div>`,
    ()=>{
      const updateArchSeg=()=>{
        const list=OS_ARCH_MAP[os]||OS_ARCH_MAP.windows;
        if(!list.some(x=>x.id===arch))arch=list[0].id;
        const el=$('#ar-seg',dlg);
        if(el)el.innerHTML=renderArch(os,arch);
      };

      $('#os-seg',dlg).addEventListener('click',e=>{
        const b=e.target.closest('[data-v]');
        if(!b)return;
        os=b.dataset.v;
        $$('#os-seg button',dlg).forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
        updateArchSeg();
      });

      $('#ar-seg',dlg).addEventListener('click',e=>{
        const b=e.target.closest('[data-v]');
        if(!b)return;
        arch=b.dataset.v;
        $$('#ar-seg .ar-card',dlg).forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
      });

      $('#use-live',dlg).onclick=()=>{
        os=live.os;
        arch=live.arch;
        $$('#os-seg button',dlg).forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===os?'true':'false'));
        updateArchSeg();
      };

      $('#auto',dlg).onclick=async()=>{
        clearSys();
        sys=await detect();
        paintSys();
        dlg.close();
        route();
      };

      $('#ok',dlg).onclick=()=>{
        sys={os,arch};
        saveSys(sys);
        paintSys();
        dlg.close();
        route();
      };
    }
  );
}

function theme(v){
  document.documentElement.dataset.theme=v==='auto'?'':v;
  set('gg.theme',v);
  paintThemeIcon(v);
}

function cfg(){
  const th=get('gg.theme','auto');
  modal(
    'Settings',
    `<h3>GitHub Token <small>(optional)</small></h3>
     <p class="mut">Raises GitHub’s unauthenticated rate limit from 60 to 5,000 requests/hour. No scopes needed. Stored strictly in this browser.</p>
     <div class="row">
       <input id="tk" type="password" autocomplete="off" aria-label="GitHub personal access token" placeholder="ghp_…">
       <button class="btn pri" id="tks">${ICONS.check} Save Token</button>
     </div>
     ${api.hasToken()?'<div class="row"><button class="btn" id="tkr">Remove saved token</button></div>':''}
     <h3>Appearance Theme</h3>
     ${seg('th',['auto','light','dark'],null,th)}
     <h3>Layout Density</h3>
     ${seg('dd',['comfortable','compact'],null,get('gg.dens','comfortable'))}
     <h3>Data & Privacy</h3>
     <p class="mut">${lib().length} tracked app(s). Everything stays locally on this device.</p>
     <div class="row">
       <button class="btn" id="cc">Clear cached data</button>
     </div>`,
    ()=>{
      segBind('th',theme);
      segBind('dd',dens);
      $('#tks',dlg).onclick=async()=>{
        const v=$('#tk',dlg).value.trim();
        if(!v)return;
        try{
          await api.setToken(v);
          toast('Token verified and saved');
          dlg.close();
        }catch(e){
          toast(e.message,1);
        }
      };
      $('#tkr',dlg)?.addEventListener('click',()=>{
        api.clearToken();
        toast('Token removed');
        dlg.close();
      });
      $('#cc',dlg).onclick=()=>{
        api.clearCache();
        toast('Cache cleared');
      };
    }
  );
}

const rec=(f,k='repo',h)=>addHist({k,full:f,label:f,hash:h||'#/r/'+f});
const ago=t=>{const s=(Date.now()-t)/1e3;return s<60?'just now':s<3600?Math.floor(s/60)+' min ago':s<86400?Math.floor(s/3600)+' h ago':Math.floor(s/86400)+' d ago'};
const KIND={repo:'Repository',files:'Files',gist:'Gist',zip:'ZIP download'};
const KIND_ICON={repo:ICONS.repo,files:ICONS.files,gist:ICONS.gist,zip:ICONS.download};

function histDlg(){
  const L=hist();
  modal(
    'History',
    L.length?`
      <ul class="list" id="hl">
        ${L.map((x,i)=>`
          <li>
            <div>
              <span aria-hidden="true">${KIND_ICON[x.k]||ICONS.repo}</span>
              <span>
                <a href="${esc(x.hash||'#/')}"><b>${esc(x.label||x.full)}</b></a><br>
                <span class="mut">${KIND[x.k]||''}${x.k==='zip'?' · '+x.n+' files · '+fmt(x.size):''} · ${ago(x.t)}</span>
              </span>
            </div>
            <button class="btn ib" data-i="${i}" aria-label="Remove from history">${ICONS.close}</button>
          </li>
        `).join('')}
      </ul>
      <div class="modal-footer">
        <button class="btn" id="hc">Clear All History</button>
      </div>
    `:'<p class="mut">Nothing in history yet. Repositories and releases you open will appear here.</p>',
    ()=>{
      $('#hl',dlg)?.addEventListener('click',e=>{
        if(e.target.closest('a'))return dlg.close();
        const b=e.target.closest('[data-i]');
        if(b){
          const A=hist();
          A.splice(+b.dataset.i,1);
          setHist(A);
          histDlg();
        }
      });
      $('#hc',dlg)?.addEventListener('click',()=>{
        setHist([]);
        dlg.close();
        toast('History cleared');
        if(!$('#q'))return;
        home();
      });
    }
  );
}

const go=(f,h)=>{location.hash=h||'#/r/'+f};
const fail=(e,f)=>{
  main.innerHTML=`<div class="err" role="alert"><h2>Couldn’t load ${esc(f||'data')}</h2><p>${esc(e.message)}</p><div class="row"><a class="btn" href="#/">Back home</a><button class="btn" id="retry">Try again</button></div></div>`;
  $('#retry').onclick=route;
  $('#live').textContent='Error: '+e.message;
};

const card=(f,d,cat)=>`
  <a class="card" href="#/r/${esc(f)}">
    <img src="${esc(av(f))}" alt="" width="44" height="44" loading="lazy">
    <div class="card-content">
      <div class="card-title-row">
        <b>${esc(f.split('/')[1])}</b>
        ${cat&&CATS[cat]?`<span class="card-cat-badge">${esc(CATS[cat].name.split(' ')[0])}</span>`:''}
      </div>
      <span>${esc(d||'')}</span>
    </div>
  </a>`;

function home(){
  let curCat='all';
  const rc=hist().filter((x,i,a)=>x.k!=='zip'&&a.findIndex(y=>y.hash===x.hash&&y.k!=='zip')===i).slice(0,6);
  const renderGrid=c=>FEAT.filter(x=>c==='all'||x[2]===c).map(x=>card(x[0],x[1],x[2])).join('');

  main.innerHTML=`
    <section class="hero">
      <div class="hero-tag">${ICONS.logo} Open-Source Binary Finder</div>
      <h1>The right GitHub download, instantly</h1>
      <p>Paste any repository or search by name. GitGet picks the matching installer for your OS and CPU, displays verified checksums, and tracks updates.</p>
      <form id="sf" role="search">
        <div class="sbox">
          <div class="search-input-wrap">
            <span class="search-icon-svg">${ICONS.search}</span>
            <input id="q" type="search" role="combobox" aria-expanded="false" aria-controls="sg" aria-autocomplete="list" placeholder="Search repositories, e.g. 'obsidian' or 'microsoft/vscode'..." autocomplete="off" spellcheck="false" aria-label="Search GitHub repositories">
            <span class="kbd-hint" id="cmd-k-trigger" style="cursor:pointer" title="Open Command Palette (Cmd+K)">⌘K</span>
          </div>
          <button class="btn pri">Find</button>
        </div>
        <ul id="sg" role="listbox" aria-label="Suggestions" hidden></ul>
      </form>
      ${rc.length?`<div class="chips" aria-label="Recent searches">${rc.map(x=>`<a href="${esc(x.hash)}">${esc(x.label||x.full)}</a>`).join('')}<button class="lnk" id="clr">Clear</button></div>`:''}
    </section>

    <div id="res"></div>

    <div class="row" style="justify-content:space-between;align-items:center;margin-top:2.2rem">
      <h2 style="margin:0">Popular Open-Source Apps</h2>
      <span class="mut" id="app-cnt">${FEAT.length} apps</span>
    </div>

    <div class="cats-bar" id="cf" role="tablist" aria-label="Filter apps by category">
      ${Object.entries(CATS).map(([k,item])=>`
        <button type="button" class="cat-pill" data-cat="${k}" aria-pressed="${k===curCat}">
          ${item.icon}
          <span>${esc(item.name)}</span>
        </button>
      `).join('')}
    </div>

    <div class="grid" id="ag">${renderGrid(curCat)}</div>

    <h2>How it works</h2>
    <div class="grid">
      <div class="panel">
        <b>1. Smart Detection</b>
        <p class="mut">Reads your OS and CPU architecture directly from the browser. Need another build? Click the platform badge in the header.</p>
      </div>
      <div class="panel">
        <b>2. Intelligent Matching</b>
        <p class="mut">Every release asset is scored for compatibility; debug symbols, checksums, and incompatible platforms are filtered out.</p>
      </div>
      <div class="panel">
        <b>3. Direct Downloads</b>
        <p class="mut">All links connect directly to GitHub's release servers. Zero file hosting, zero telemetry, and 100% private.</p>
      </div>
    </div>`;

  const q=$('#q'),sg=$('#sg');let sel=-1,items=[],tm,seq=0;
  const hide=()=>{sg.hidden=true;q.setAttribute('aria-expanded','false');sel=-1};
  const show=(a,msg)=>{
    items=a;sel=-1;
    sg.innerHTML=a.length?a.map((x,i)=>`<li role="option" id="o${i}" data-f="${esc(x.f)}" data-h="${esc(x.h||'')}">${esc(x.f)}${x.d?`<small>${esc(x.d)}</small>`:''}</li>`).join(''):`<li role="option" aria-disabled="true">${esc(msg||'No matches')}</li>`;
    sg.hidden=false;
    q.setAttribute('aria-expanded','true');
    $('#live').textContent=a.length?a.length+' suggestion'+(a.length>1?'s':'')+' available':(msg||'No matches');
  };

  q.oninput=()=>{
    clearTimeout(tm);
    const v=q.value.trim();
    if(v.length<2)return hide();
    const d=api.target(v);
    if(d)return show([{f:d.full||'Gist '+d.id.slice(0,8)+'…',h:d.hash,d:d.kind==='gist'?'Open gist':d.kind==='files'?'Browse files'+(d.path?' in '+d.path:''):'Open this repository'}]);
    tm=setTimeout(async()=>{
      const n=++seq;
      try{
        const r=await api.search(v);
        if(n===seq)show(r.items.map(i=>({f:i.full_name,d:i.description})));
      }catch(e){
        if(n===seq)show([],e.message);
      }
    },450);
  };

  q.onkeydown=e=>{
    if(sg.hidden||!items.length)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      sel=(sel+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
      $$('#sg li').forEach((l,i)=>l.setAttribute('aria-selected',i===sel));
      q.setAttribute('aria-activedescendant','o'+sel);
    }else if(e.key==='Escape')hide();
    else if(e.key==='Enter'&&sel>=0){
      e.preventDefault();
      go(items[sel].f,items[sel].h);
    }
  };

  sg.onmousedown=e=>{
    const l=e.target.closest('li[data-f]');
    if(l){
      e.preventDefault();
      go(l.dataset.f,l.dataset.h);
    }
  };

  q.onblur=()=>setTimeout(hide,120);

  $('#sf').onsubmit=async e=>{
    e.preventDefault();
    const v=q.value.trim();
    if(!v)return;
    const d=api.target(v);
    if(d)return go(d.full,d.hash);
    $('#res').innerHTML='<div class="sk"><i></i></div>';
    try{
      const r=await api.search(v);
      $('#res').innerHTML=r.items.length?`<h2>Search results for “${esc(v)}”</h2><div class="grid">${r.items.map(i=>card(i.full_name,i.description)).join('')}</div>`:'<p class="note">No repositories found.</p>';
    }catch(x){
      $('#res').innerHTML=`<p class="err" role="alert">${esc(x.message)}</p>`;
    }
  };

  // Category Filtering — Uses data-cat (NEVER data-c) to prevent unwanted Copied toasts
  $('#cf')?.addEventListener('click',e=>{
    const b=e.target.closest('button[data-cat]');
    if(!b)return;
    curCat=b.dataset.cat;
    $$('#cf button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
    const list=FEAT.filter(x=>curCat==='all'||x[2]===curCat);
    $('#ag').innerHTML=list.map(x=>card(x[0],x[1],x[2])).join('');
    $('#app-cnt').textContent=`${list.length} app${list.length===1?'':'s'}`;
  });

  $('#clr')?.addEventListener('click',()=>{setHist([]);home()});
}

async function detail(full,t){
  main.innerHTML='<div class="sk" aria-busy="true"><i></i><i></i><i></i></div>';
  const [o,r]=full.split('/');
  let repo,rels;
  try{
    [repo,rels]=await Promise.all([api.repo(o,r),api.releases(o,r)]);
  }catch(e){
    return t===rt&&fail(e,full);
  }
  if(t!==rt)return;
  full=repo.full_name;
  rec(full);
  document.title=full+' – GitGet';
  const all=rels.filter(x=>!x.draft);
  let inc=false,tag=null,viewSys={...sys};

  const draw=foc=>{
    const pool=(inc?all:all.filter(x=>!x.prerelease));
    const P=pool.length?pool:all,rel=P.find(x=>x.tag_name===tag)||P[0];
    if(rel)tag=rel.tag_name;
    const tr=lib().find(x=>x.full===full);
    let body='';

    if(!rel)body=`<div class="note">No published releases yet. <a href="${esc(repo.html_url)}" rel="noopener">Open on GitHub</a></div>`;
    else{
      const {best,list}=pick(rel.assets,viewSys);
      const dl=a=>a.browser_download_url;
      const sha=(best?.digest||'').replace('sha256:','');
      const cmd=a=>(viewSys.os==='windows'?'curl.exe':'curl')+` -L -o "${a.name}" "${dl(a)}"`;
      const viewSysTitle=LABEL[viewSys.os]+' · '+(ARCHL[viewSys.arch]||viewSys.arch);

      const platTabs=Object.keys(LABEL).map(k=>{
        const testArch=(k==='android'||k==='macos')?'arm64':'x64';
        const hasFile=rel.assets.some(a=>score(a.name,{os:k,arch:testArch})>=30);
        return `
          <button type="button" class="plat-tab ${k===viewSys.os?'active':''} ${hasFile?'has-file':'no-file'}" data-os="${k}" title="${hasFile?'Builds available for '+LABEL[k]:'No direct '+LABEL[k]+' installer found'}">
            ${OS_ICONS[k]||''}
            <span>${esc(LABEL[k])}</span>
            ${hasFile?'<span class="plat-dot"></span>':''}
          </button>
        `;
      }).join('');

      const pkgCmds=getPkgCommands(full,best);

      body=`<div class="panel">
        <div class="dl-platforms">
          <div class="dl-plat-header">
            <span class="dl-plat-label">Target Platform</span>
            <span class="mut" style="font-size:12px">Switch OS for this app</span>
          </div>
          <div class="plat-tabs" id="page-os-tabs">${platTabs}</div>
        </div>

        ${best?`
          <a class="btn pri big" href="${esc(dl(best))}" rel="noopener">
            <span style="display:inline-flex;align-items:center;gap:.5rem">${ICONS.download} <b>Download for ${esc(viewSysTitle)}</b></span>
            <small>${esc(best.name)} · ${fmt(best.size)}</small>
          </a>
          ${sha?`
            <div class="verifier-box">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
                <span style="font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:.35rem">${ICONS.shield} <b>SHA-256:</b> <code>${esc(sha)}</code></span>
                <div style="display:flex;gap:.4rem">
                  <button type="button" class="btn sm" data-c="${esc(sha)}">${ICONS.copy} Copy Hash</button>
                  <label class="btn sm" style="cursor:pointer;margin:0;display:inline-flex;align-items:center;gap:.35rem">
                    ${ICONS.check} Verify File
                    <input type="file" id="verify-file-input" style="display:none">
                  </label>
                </div>
              </div>
              <div id="verifier-result" hidden></div>
            </div>
          `:''}
          <div class="row" style="margin-top:.85rem">
            <button class="btn" data-c="${esc(cmd(best))}">${ICONS.copy} Copy command</button>
            <button class="btn" id="qr-btn" type="button">${ICONS.qrcode} Send to Phone (QR)</button>
          </div>
          <div class="pkg-block">
            <div class="pkg-header">
              <span class="pkg-title">${ICONS.terminal} Package Manager Commands</span>
              <span class="mut" style="font-size:11.5px">Terminal 1-liners</span>
            </div>
            <div class="pkg-grid">
              ${pkgCmds.map(c=>`
                <div class="pkg-row">
                  <span class="pkg-badge">${esc(c.mgr)}</span>
                  <code class="pkg-cmd">${esc(c.cmd)}</code>
                  <button type="button" class="pkg-copy" data-c="${esc(c.cmd)}">${ICONS.copy} Copy</button>
                </div>
              `).join('')}
            </div>
          </div>
        `:rel.assets.length?`
          <p class="note">No file clearly matches ${esc(viewSysTitle)}. Choose from all files below or <button class="lnk" id="sysb">change system</button>.</p>
          <div class="pkg-block">
            <div class="pkg-header">
              <span class="pkg-title">${ICONS.terminal} Package Manager Commands</span>
              <span class="mut" style="font-size:11.5px">Terminal 1-liners</span>
            </div>
            <div class="pkg-grid">
              ${pkgCmds.map(c=>`
                <div class="pkg-row">
                  <span class="pkg-badge">${esc(c.mgr)}</span>
                  <code class="pkg-cmd">${esc(c.cmd)}</code>
                  <button type="button" class="pkg-copy" data-c="${esc(c.cmd)}">${ICONS.copy} Copy</button>
                </div>
              `).join('')}
            </div>
          </div>
        `:`
          <p class="note">This release has no prebuilt binary files. <a href="${esc(rel.html_url)}" rel="noopener">Release page</a> · <a href="${esc(rel.zipball_url)}" rel="noopener">Source code (zip)</a></p>
        `}
        ${rel.assets.length?`
          <details class="all">
            <summary>All release files (${rel.assets.length})</summary>
            <ul>${list.map(x=>`<li><a href="${esc(dl(x.a))}" rel="noopener">${esc(x.a.name)}</a><span>${fmt(x.a.size)} · ${x.a.download_count.toLocaleString()} downloads</span></li>`).join('')}</ul>
          </details>
        `:''}
      </div>
      ${rel.body?`<h2>Release notes</h2><div class="md">${md(rel.body.slice(0,6000))}${rel.body.length>6000?'<p>…</p>':''}</div><p><a href="${esc(rel.html_url)}" rel="noopener">Full notes on GitHub</a></p>`:''}`;
    }

    main.innerHTML=`
      <p><a href="#/">← Back to search</a></p>
      ${tabs(full,'dl')}
      <div class="rh">
        <img src="${esc(av(full))}" alt="" width="68" height="68">
        <div>
          <h1>${esc(full)}</h1>
          <p>${esc(repo.description||'')}</p>
        </div>
      </div>
      <div class="meta">
        <span>${ICONS.star} ${repo.stargazers_count.toLocaleString()} stars</span>
        ${repo.license?.spdx_id&&repo.license.spdx_id!=='NOASSERTION'?`<span>${esc(repo.license.spdx_id)}</span>`:''}
        ${repo.language?`<span>${esc(repo.language)}</span>`:''}
        ${rel?`<span>Released ${esc(new Date(rel.published_at).toLocaleDateString())}</span>`:''}
        ${repo.archived?'<span class="up">Archived</span>':''}
      </div>
      <div class="row">
        ${rel?`<select id="ver" aria-label="Version">${P.slice(0,20).map(x=>`<option value="${esc(x.tag_name)}"${x===rel?' selected':''}>${esc(x.name||x.tag_name)}${x.prerelease?' (pre-release)':''}</option>`).join('')}</select><label class="chk"><input type="checkbox" id="pre"${inc?' checked':''}> Pre-releases</label>`:''}
        <button class="btn" id="trk">${tr?`${ICONS.check} Tracking updates`:`${ICONS.star} Track updates`}</button>
        <button class="btn" data-c="${esc(location.origin+location.pathname+'#/r/'+full)}">${ICONS.copy} Copy link</button>
      </div>
      ${body}`;

    $('#ver')?.addEventListener('change',e=>{tag=e.target.value;draw('ver')});
    $('#pre')?.addEventListener('change',e=>{inc=e.target.checked;draw('pre')});
    $('#sysb')?.addEventListener('click',sysDlg);
    $('#page-os-tabs')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-os]');
      if(!b)return;
      const newOs=b.dataset.os;
      viewSys.os=newOs;
      viewSys.arch=(newOs==='android'||newOs==='macos')?'arm64':'x64';
      draw();
    });
    $('#qr-btn')?.addEventListener('click',()=>{
      const {best}=pick(rel.assets,viewSys);
      if(!best)return;
      const url=best.browser_download_url;
      modal(
        'Scan to Download on Phone',
        `<div class="qr-dialog-body">
           <div class="qr-frame">
             <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(url)}" width="180" height="180" alt="QR Code">
           </div>
           <div class="qr-filename"><code>${esc(best.name)}</code></div>
           <p class="qr-help">Scan with your phone's camera to start direct download on your device.</p>
           <div style="margin-top:1rem">
             <button class="btn sm" data-c="${esc(url)}">${ICONS.copy} Copy direct download link</button>
           </div>
         </div>`
      );
    });
    $('#verify-file-input')?.addEventListener('change',async e=>{
      const file=e.target.files?.[0];
      if(!file||!sha)return;
      const resEl=$('#verifier-result');
      if(resEl){
        resEl.hidden=false;
        resEl.className='verifier-status';
        resEl.textContent='Computing SHA-256 hash locally in browser...';
        try{
          const {hash,isMatch}=await verifyFileHash(file,sha);
          if(isMatch){
            resEl.className='verifier-status match';
            resEl.innerHTML=`<strong>✅ 100% Match Verified:</strong> <code>${esc(file.name)}</code> matches official release hash perfectly! Safe to install.`;
          }else{
            resEl.className='verifier-status mismatch';
            resEl.innerHTML=`<strong>❌ Hash Mismatch:</strong> Computed hash is <code>${esc(hash)}</code>, expected <code>${esc(sha)}</code>. File may be corrupted or modified.`;
          }
        }catch(err){
          resEl.className='verifier-status mismatch';
          resEl.textContent='Failed to verify file: '+err.message;
        }
      }
    });
    $('#trk').onclick=()=>{
      const L=lib();
      if(tr)setLib(L.filter(x=>x.full!==full));
      else{
        const st=all.find(x=>!x.prerelease)||rel;
        setLib([...L,{full,tag:rel?rel.tag_name:'',latest:st?st.tag_name:'',desc:repo.description||'',checked:Date.now()}]);
      }
      badge();
      toast(tr?'Removed from library':'Tracking '+full);
      draw('trk');
    };
    if(foc)$('#'+foc)?.focus();
  };

  draw();
  $('#live').textContent='Loaded '+full;
}

function badge(){
  const n=lib().filter(x=>x.latest&&x.latest!==x.tag).length;
  const b=$('#badge');
  b.textContent=n;
  b.hidden=!n;
}

async function check(force){
  const L=lib(),u={};
  await Promise.all(L.map(async x=>{
    try{
      const [o,r]=x.full.split('/'),l=await api.latest(o,r,force);
      u[x.full]={latest:l.tag_name,checked:Date.now()};
    }catch{}
  }));
  setLib(lib().map(x=>({...x,...(u[x.full]||{})})));
  badge();
  return Object.keys(u).length;
}

function library(t){
  const draw=()=>{
    const L=lib(),only=$('#onl')?.checked;
    const show=only?L.filter(x=>x.latest&&x.latest!==x.tag):L;
    $('#ll').innerHTML=show.length?show.map(x=>{
      const up=x.latest&&x.latest!==x.tag;
      return `<li>
        <div>
          <img class="av" src="${esc(av(x.full))}" alt="" width="40" height="40">
          <span>
            <a href="#/r/${esc(x.full)}"><b>${esc(x.full)}</b></a><br>
            ${up?`<b class="up">Update: ${esc(x.tag||'?')} → ${esc(x.latest)}</b>`:`<span class="ok">Up to date${x.tag?' · '+esc(x.tag):''}</span>`}
          </span>
        </div>
        <span class="row">
          ${up?`<button class="btn" data-a="mark" data-f="${esc(x.full)}">Mark updated</button>`:''}
          <a class="btn pri" href="#/r/${esc(x.full)}">Open</a>
          <button class="btn ib" data-a="del" data-f="${esc(x.full)}" aria-label="Remove ${esc(x.full)}">${ICONS.close}</button>
        </span>
      </li>`;
    }).join(''):`<li><p class="mut">${only?'Everything is up to date.':'Nothing tracked yet. Open an app and press “Track updates”.'} <a href="#/">Discover apps</a></p></li>`;

    $('#st').textContent=`${L.length} app(s) · ${L.filter(x=>x.latest&&x.latest!==x.tag).length} update(s)`;
    badge();
  };

  main.innerHTML=`
    <div class="lh">
      <h1>My Library</h1>
      <div class="row">
        <button class="btn" id="chk">${ICONS.history} Check updates</button>
        <button class="btn" id="exp">${ICONS.download} Export</button>
        <button class="btn" id="impb">Import</button>
        <input id="imp" type="file" accept=".json,application/json" hidden>
      </div>
    </div>
    <p class="mut" id="st" role="status"></p>
    <label class="chk"><input type="checkbox" id="onl"> Only show updates</label>
    <ul class="list" id="ll"></ul>`;

  draw();
  $('#onl').onchange=draw;
  $('#chk').onclick=async e=>{
    e.target.disabled=true;
    const n=await check(true);
    e.target.disabled=false;
    draw();
    toast(n?'Checked '+n+' app(s)':'Nothing to check',!n&&lib().length>0);
  };
  $('#ll').onclick=e=>{
    const b=e.target.closest('[data-a]');
    if(!b)return;
    const f=b.dataset.f;
    setLib(b.dataset.a==='del'?lib().filter(x=>x.full!==f):lib().map(x=>x.full===f?{...x,tag:x.latest}:x));
    draw();
  };
  $('#exp').onclick=()=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify({version:1,apps:lib().map(({full,tag})=>({full,tag}))},null,1)],{type:'application/json'}));
    a.download='gitget-library.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1e3);
  };
  $('#impb').onclick=()=>$('#imp').click();
  $('#imp').onchange=async e=>{
    try{
      const j=JSON.parse(await e.target.files[0].text());
      const have=new Set(lib().map(x=>x.full));
      const add=(j.apps||[]).filter(x=>/^[\w.-]+\/[\w.-]+$/.test(x?.full)&&!have.has(x.full)).map(x=>({full:x.full,tag:String(x.tag||''),latest:'',desc:''}));
      setLib([...lib(),...add]);
      draw();
      toast('Imported '+add.length+' app(s)');
      if(add.length){await check(true);draw();}
    }catch{
      toast('Invalid GitGet library JSON file.',1);
    }
    e.target.value='';
  };
  if(lib().some(x=>!x.checked||Date.now()-x.checked>36e5))check(false).then(()=>t===rt&&$('#ll')&&draw());
}

let booted=false;
const dec=s=>{try{return decodeURIComponent(s)}catch{return s}};
const H={$,$$,esc,main,toast,copy,fail,rec,hist:addHist,get sys(){return sys}};

function route(){
  const t=++rt,h=location.hash.slice(1)||'/';
  const m=h.match(/^\/r\/([\w.-]+\/[\w.-]+)(\/(files|releases|stats)(?:\/([^/]*))?(?:\/(.*))?)?/);
  const cur=h.startsWith('/library')?'library':'home';
  $$('nav a').forEach(a=>a.toggleAttribute('aria-current',a.dataset.r===cur));
  document.title='GitGet – Download the right GitHub release for your device';
  const ok=()=>t===rt;
  if(m&&m[3]==='files')files(H,m[1],dec(m[4]||''),dec(m[5]||''),ok);
  else if(m&&m[3]==='releases')releases(H,m[1],ok);
  else if(m&&m[3]==='stats')stats(H,m[1],ok);
  else if(m)detail(m[1],t);
  else if(/^\/g\/[0-9a-f]{20,40}/i.test(h))gist(H,h.slice(3).match(/^[0-9a-f]+/i)[0].toLowerCase(),ok);
  else if(h.startsWith('/library')){document.title='My Library – GitGet';library(t);}
  else home();
  scrollTo(0,0);
  if(booted)main.focus({preventScroll:true});
  booted=true;
  setTimeout(()=>{if(t===rt)$('#live').textContent=document.title},500);
}

(async()=>{
  const curTh=get('gg.theme','auto');
  theme(curTh);
  dens(get('gg.dens','comfortable'));
  sys=await detect();
  paintSys();

  $('#cmd-pal')?.addEventListener('click',openPalette);
  $('#sys').onclick=sysDlg;
  $('#hst').onclick=histDlg;
  $('#cfg').onclick=cfg;
  $('#theme').onclick=()=>{
    const o=['auto','light','dark'];
    const n=o[(o.indexOf(get('gg.theme','auto'))+1)%3];
    theme(n);
  };

  // Dedicated copy delegation ONLY on elements with data-c (never triggers on data-cat)
  main.addEventListener('click',e=>{
    const b=e.target.closest('[data-c]');
    if(b)copy(b.dataset.c);
  });

  addEventListener('hashchange',route);
  addEventListener('offline',()=>toast('You are offline — cached data only.',1));
  addEventListener('online',()=>toast('Back online'));
  addEventListener('gg:rl',()=>{
    const r=api.rate;
    $('#rl').textContent=`GitHub API: ${r.remaining}/${r.limit} requests remaining this hour`;
  });

  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){
      e.preventDefault();
      openPalette();
    }else if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!dlg.open&&!$('#palette-dlg')?.open){
      e.preventDefault();
      openPalette();
    }
  });

  route();
  badge();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
