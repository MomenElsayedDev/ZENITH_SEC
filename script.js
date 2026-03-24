/* ═══════════════════════════════════════════════════
   ZENITH_SEC — JavaScript Core v2.0
   Features:
    - Tab navigation
    - Multi-algorithm AES/RC4/3DES/Rabbit encryption
    - Password strength meter with entropy scoring
    - Hash generator (MD5/SHA1/SHA256/SHA512)
    - Secure random key generator with charset control
    - Session vault with log export
    - Dark/Light theme with localStorage persistence
    - Copy to clipboard with feedback
    - Live stats (char/byte/line counts)
    - Animated toast notifications
    - Realtime clock in footer
    - Timestamp embed option
═══════════════════════════════════════════════════ */

"use strict";

/* ─── STATE ─── */
let currentAlgo = "AES";
let currentHash = "MD5";
let currentConv = "morse";
let vaultEntries = 0;
let sdTimer = null;
let qrInstance = null;
let loggedUser = null;
let benchRunning = false;

/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */
(function init(){
  const saved = localStorage.getItem("zenith_theme") || "dark-cyber";
  document.documentElement.setAttribute("data-theme", saved);
  // mark active theme btn
  const tb = document.querySelector(`.theme-dot-btn[onclick*="${saved}"]`);
  if(tb){ document.querySelectorAll('.theme-dot-btn').forEach(b=>b.classList.remove('active')); tb.classList.add('active'); }
  startClock();
  // keyboard shortcuts
  document.addEventListener("keydown", e => {
    if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();process("encrypt");}
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key==="Enter"){e.preventDefault();process("decrypt");}
  });
})();

/* ═══════════════════════════════════
   THEME
═══════════════════════════════════ */
function setTheme(name, btn){
  document.documentElement.setAttribute("data-theme", name);
  localStorage.setItem("zenith_theme", name);
  document.querySelectorAll('.theme-dot-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  showToast("THEME: " + name.toUpperCase().replace('-',' '));
  // close panel
  document.getElementById('themePanel').classList.remove('open');
}
function toggleThemePanel(){
  document.getElementById('themePanel').classList.toggle('open');
}

/* login screen theme functions */
function toggleLoginThemes(){
  const panel=document.getElementById('loginMiniThemes');
  panel.classList.toggle('open');
  // close on outside click
  if(panel.classList.contains('open')){
    setTimeout(()=>{
      document.addEventListener('click', function closePanel(e){
        if(!panel.contains(e.target)&&!e.target.closest('.login-theme-toggle')){
          panel.classList.remove('open');
          document.removeEventListener('click',closePanel);
        }
      });
    },10);
  }
}
function setLoginTheme(name){
  document.documentElement.setAttribute('data-theme',name);
  localStorage.setItem('zenith_theme',name);
  document.getElementById('loginMiniThemes').classList.remove('open');
  // mark active in main app theme panel too
  const tb=document.querySelector(`.theme-dot-btn[onclick*="${name}"]`);
  if(tb){document.querySelectorAll('.theme-dot-btn').forEach(b=>b.classList.remove('active'));tb.classList.add('active');}
}

/* ═══════════════════════════════════
   LOGIN / AUTH
═══════════════════════════════════ */
function switchLoginTab(tab){
  document.querySelectorAll('.login-tab').forEach(t=>t.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById('login-form').style.display = tab==='login'?'flex':'none';
  document.getElementById('register-form').style.display = tab==='register'?'flex':'none';
  document.getElementById('login-err').classList.remove('show');
  document.getElementById('reg-err').classList.remove('show');
}
function toggleLfEye(inputId, btn){
  const inp = document.getElementById(inputId);
  if(inp.type==='password'){inp.type='text';btn.textContent='🚫';}
  else{inp.type='password';btn.textContent='👁';}
}
function loginStrength(inp){
  const v = inp.value; let score=0;
  if(v.length>=6)score+=15;
  if(v.length>=10)score+=15;
  if(/[A-Z]/.test(v))score+=15;
  if(/[a-z]/.test(v))score+=10;
  if(/[0-9]/.test(v))score+=15;
  if(/[^A-Za-z0-9]/.test(v))score+=20;
  score=Math.min(score,100);
  const fill=document.getElementById('ls-fill');
  const txt=document.getElementById('ls-text');
  fill.style.width=score+'%';
  if(score<35){fill.style.background='#ff5f56';txt.textContent='STRENGTH: WEAK';txt.style.color='#ff5f56';}
  else if(score<70){fill.style.background='#ffbd2e';txt.textContent='STRENGTH: MEDIUM';txt.style.color='#ffbd2e';}
  else{fill.style.background='#00ff41';txt.textContent='STRENGTH: STRONG';txt.style.color='#00ff41';}
}
function getUsers(){
  try{return JSON.parse(localStorage.getItem('zenith_users')||'{}');}catch{return{};}
}
function saveUsers(u){localStorage.setItem('zenith_users',JSON.stringify(u));}
function doLogin(){
  const user=document.getElementById('login-user').value.trim();
  const pass=document.getElementById('login-pass').value;
  const err=document.getElementById('login-err');
  if(!user||!pass){err.textContent='OPERATOR_ID AND ACCESS_CODE REQUIRED';err.classList.add('show');return;}
  const users=getUsers();
  const hashed=CryptoJS.SHA256(pass).toString();
  if(users[user.toLowerCase()]&&users[user.toLowerCase()]===hashed){
    grantAccess(user);
  } else {
    err.textContent='ACCESS DENIED — INVALID CREDENTIALS';
    err.classList.add('show');
    setTimeout(()=>err.classList.remove('show'),3000);
  }
}
function doRegister(){
  const user=document.getElementById('reg-user').value.trim();
  const pass=document.getElementById('reg-pass').value;
  const pass2=document.getElementById('reg-pass2').value;
  const err=document.getElementById('reg-err');
  if(!user||!pass||!pass2){err.textContent='ALL FIELDS REQUIRED';err.classList.add('show');return;}
  if(user.length<3){err.textContent='OPERATOR_ID MUST BE 3+ CHARACTERS';err.classList.add('show');return;}
  if(pass!==pass2){err.textContent='ACCESS CODES DO NOT MATCH';err.classList.add('show');return;}
  if(pass.length<6){err.textContent='ACCESS CODE MIN 6 CHARACTERS';err.classList.add('show');return;}
  const users=getUsers();
  if(users[user.toLowerCase()]){err.textContent='OPERATOR_ID ALREADY EXISTS';err.classList.add('show');return;}
  users[user.toLowerCase()]=CryptoJS.SHA256(pass).toString();
  saveUsers(users);
  grantAccess(user);
}
function loginAsGuest(){grantAccess('GUEST');}
function grantAccess(user){
  loggedUser=user;
  const ov=document.getElementById('login-success');
  ov.classList.add('show');
  setTimeout(()=>{
    document.getElementById('login-screen').classList.add('hidden');
    const app=document.getElementById('main-app');
    app.style.display='flex';
    app.classList.add('visible');
    document.getElementById('username-badge').textContent=user.toUpperCase();
    showToast('WELCOME, '+user.toUpperCase());
  },1400);
}
function doLogout(){
  loggedUser=null;
  document.getElementById('main-app').classList.remove('visible');
  document.getElementById('main-app').style.display='none';
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-success').classList.remove('show');
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
  document.getElementById('login-err').classList.remove('show');
  showToast('SESSION TERMINATED');
}

/* ═══════════════════════════════════
   TABS
═══════════════════════════════════ */
function openTab(evt, tabName){
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  evt.currentTarget.classList.add('active');
}

/* ═══════════════════════════════════
   ALGORITHM SELECTOR
═══════════════════════════════════ */
function selectAlgo(btn){
  document.querySelectorAll('.algo-row .algo-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentAlgo=btn.dataset.algo;
  document.getElementById('footerAlgo').textContent=btn.textContent;
  showToast('ALGORITHM: '+btn.textContent);
}
function selectHash(btn){
  if(!btn.dataset.hash)return;
  document.querySelectorAll('.hash-selector .algo-btn[data-hash]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentHash=btn.dataset.hash;
}
function computeHash(){
  const input=document.getElementById('messageInput').value.trim();
  const hashOut=document.getElementById('hashOut');
  if(!input){hashOut.textContent='SOURCE_DATA EMPTY.';return;}
  let result='';
  switch(currentHash){
    case'MD5':result=CryptoJS.MD5(input).toString();break;
    case'SHA1':result=CryptoJS.SHA1(input).toString();break;
    case'SHA256':result=CryptoJS.SHA256(input).toString();break;
    case'SHA512':result=CryptoJS.SHA512(input).toString();break;
  }
  hashOut.textContent=result;
  addToVault('HASH',currentHash+'_COMPUTED');
  showToast(currentHash+' HASH GENERATED');
}

/* ═══════════════════════════════════
   PASSWORD STRENGTH
═══════════════════════════════════ */
function checkStrength(){
  const key=document.getElementById('secretKey').value;
  const bar=document.getElementById('strengthBar');
  const text=document.getElementById('strengthText');
  let score=0,notes=[];
  if(key.length>=6){score+=15;}
  if(key.length>=10){score+=15;notes.push('LEN+');}
  if(key.length>=16){score+=10;notes.push('LEN++');}
  if(/[A-Z]/.test(key)){score+=15;notes.push('UPPER');}
  if(/[a-z]/.test(key)){score+=10;notes.push('LOWER');}
  if(/[0-9]/.test(key)){score+=15;notes.push('NUM');}
  if(/[^A-Za-z0-9]/.test(key)){score+=20;notes.push('SYM');}
  score=Math.min(score,100);
  bar.style.width=score+'%';
  if(score<35){bar.style.backgroundColor='#ff5f56';text.textContent='SECURITY: LOW ['+notes.join('|')+']';text.style.color='#ff5f56';}
  else if(score<70){bar.style.backgroundColor='#ffbd2e';text.textContent='SECURITY: MEDIUM ['+notes.join('|')+']';text.style.color='#ffbd2e';}
  else{bar.style.backgroundColor='#00ff41';text.textContent='SECURITY: HIGH ['+notes.join('|')+']';text.style.color='#00ff41';}
}
function toggleKeyVisibility(){
  const input=document.getElementById('secretKey');
  const btn=document.getElementById('eyeBtn');
  if(input.type==='password'){input.type='text';btn.textContent='🚫';}
  else{input.type='password';btn.textContent='👁';}
}

/* ═══════════════════════════════════
   STATS
═══════════════════════════════════ */
function updateStats(){
  const val=document.getElementById('messageInput').value;
  document.getElementById('charCount').textContent=val.length;
  document.getElementById('byteCount').textContent=new Blob([val]).size;
  document.getElementById('lineCount').textContent=val?val.split('\n').length:0;
}

/* ═══════════════════════════════════
   ENCRYPT / DECRYPT
═══════════════════════════════════ */
function process(type){
  let input=document.getElementById('messageInput').value.trim();
  const key=document.getElementById('secretKey').value.trim();
  const box=document.getElementById('resultBox');
  const copyBtn=document.getElementById('copyBtn');
  const procLine=document.getElementById('procLine');
  const addTS=document.getElementById('addTimestamp').checked;
  const addHmac=document.getElementById('addHmac').checked;

  if(!input||!key){
    showToast('INPUT AND KEY REQUIRED',true);
    box.textContent='> ERROR: MISSING_INPUT OR KEY';
    box.style.color='var(--accent-red)';
    box.classList.add('error');
    box.appendChild(copyBtn);
    setTimeout(()=>box.classList.remove('error'),600);
    return;
  }
  procLine.textContent='> PROCESSING...';
  procLine.classList.add('active');
  setTimeout(()=>{
    procLine.textContent='';
    procLine.classList.remove('active');
    try{
      let result='';
      const engine=CryptoJS[currentAlgo];
      if(type==='encrypt'){
        if(addTS) input='[TS:'+Date.now()+']'+input;
        if(addHmac){
          const hmac=CryptoJS.HmacSHA256(input,key).toString();
          input='[HMAC:'+hmac.substring(0,16)+']'+input;
        }
        result=engine.encrypt(input,key).toString();
        addToVault('ENC',currentAlgo+' DATA_LOCKED');
        box.style.color='var(--accent-green)';
        showToast('ENCRYPTED SUCCESSFULLY');
      } else {
        const bytes=engine.decrypt(input,key);
        result=bytes.toString(CryptoJS.enc.Utf8);
        if(!result) throw new Error('BAD_KEY_OR_DATA');
        if(addHmac&&result.startsWith('[HMAC:')){
          const hmacEnd=result.indexOf(']');
          result=result.substring(hmacEnd+1);
        }
        if(addTS&&result.startsWith('[TS:')){
          const tsEnd=result.indexOf(']');
          const ts=parseInt(result.substring(4,tsEnd));
          const d=new Date(ts);
          result=result.substring(tsEnd+1);
          result+='\n\n[EMBEDDED_TIMESTAMP: '+d.toLocaleString()+']';
        }
        addToVault('DEC',currentAlgo+' DATA_UNLOCKED');
        box.style.color='var(--accent-green)';
        showToast('DECRYPTED SUCCESSFULLY');
      }
      box.textContent=result;
      box.appendChild(copyBtn);
      box.classList.add('success');
      setTimeout(()=>box.classList.remove('success'),600);
    } catch(e){
      box.textContent='> ACCESS_DENIED: INVALID_KEY OR CORRUPTED_BUFFER.\n  CHECK ALGORITHM AND KEY.';
      box.style.color='var(--accent-red)';
      box.appendChild(copyBtn);
      box.classList.add('error');
      setTimeout(()=>box.classList.remove('error'),600);
      showToast('DECRYPTION FAILED',true);
    }
  },300);
}

/* ═══════════════════════════════════
   COPY
═══════════════════════════════════ */
function copyResult(){
  const box=document.getElementById('resultBox');
  const button=document.getElementById('copyBtn');
  const clone=box.cloneNode(true);
  const bi=clone.querySelector('#copyBtn');
  if(bi)bi.remove();
  const text=clone.innerText.trim();
  if(!text||text==='SYSTEM_READY...'){showToast('NOTHING TO COPY',true);return;}
  navigator.clipboard.writeText(text).then(()=>{
    button.textContent='COPIED!';button.classList.add('copied');
    setTimeout(()=>{button.textContent='COPY';button.classList.remove('copied');},1500);
    showToast('COPIED TO CLIPBOARD');
  }).catch(()=>showToast('CLIPBOARD ACCESS DENIED',true));
}
function copyTool(id){
  const el=document.getElementById(id);
  if(!el)return;
  navigator.clipboard.writeText(el.textContent.trim()).then(()=>showToast('COPIED')).catch(()=>showToast('COPY FAILED',true));
}

/* ═══════════════════════════════════
   VAULT
═══════════════════════════════════ */
function addToVault(action,info){
  const list=document.getElementById('historyList');
  const empty=list.querySelector('.empty-msg');
  if(empty)empty.remove();
  vaultEntries++;
  document.getElementById('vaultCount').textContent=vaultEntries+' ENTRIES';
  const li=document.createElement('li');
  const cls=action==='ENC'?'enc-tag':action==='DEC'?'dec-tag':'hash-tag';
  li.innerHTML=`<span class="log-time">${new Date().toLocaleTimeString()}</span><span class="log-action ${cls}">[${action}]</span><span class="log-info">${info} | ALGO:${currentAlgo}</span>`;
  list.prepend(li);
}
function clearHistory(){
  if(!confirm('PURGE ALL SESSION LOGS?'))return;
  document.getElementById('historyList').innerHTML='<li class="empty-msg">BUFFER_EMPTY...</li>';
  vaultEntries=0;
  document.getElementById('vaultCount').textContent='0 ENTRIES';
  showToast('LOGS PURGED');
}
function exportLogs(){
  const items=document.querySelectorAll('#historyList li:not(.empty-msg)');
  if(!items.length){showToast('NO LOGS TO EXPORT',true);return;}
  const logs=[];
  items.forEach(li=>logs.push({
    time:li.querySelector('.log-time')?.textContent,
    action:li.querySelector('.log-action')?.textContent,
    info:li.querySelector('.log-info')?.textContent,
  }));
  const blob=new Blob([JSON.stringify({exported:new Date().toISOString(),operator:loggedUser,logs},null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='zenith_sec_vault_'+Date.now()+'.json';
  a.click();
  showToast('LOGS EXPORTED TO JSON');
}

/* ═══════════════════════════════════
   KEY GENERATOR
═══════════════════════════════════ */
function updateKeyLen(){
  document.getElementById('keyLenVal').textContent=document.getElementById('keyLength').value;
}
function generateKey(){
  const bits=parseInt(document.getElementById('keyLength').value);
  const chars=parseInt(bits/6);
  const useUp=document.getElementById('useUpper').checked;
  const useLo=document.getElementById('useLower').checked;
  const useNu=document.getElementById('useNum').checked;
  const useSp=document.getElementById('useSpec').checked;
  let charset='';
  if(useUp)charset+='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if(useLo)charset+='abcdefghijklmnopqrstuvwxyz';
  if(useNu)charset+='0123456789';
  if(useSp)charset+='!@#$%^&*()_+-=[]{}|;:,.<>?';
  if(!charset){showToast('SELECT AT LEAST ONE CHARSET',true);return;}
  const arr=new Uint32Array(chars);
  crypto.getRandomValues(arr);
  let key='';
  for(let i=0;i<chars;i++) key+=charset[arr[i]%charset.length];
  document.getElementById('genKeyOut').textContent=key;
  const entropy=Math.log2(Math.pow(charset.length,chars)).toFixed(1);
  const ttc=entropy>100?'HEAT DEATH OF UNIVERSE':entropy>80?'MILLIONS OF YEARS':entropy>60?'THOUSANDS OF YEARS':entropy>40?'DECADES':'WEAK';
  document.getElementById('entropyInfo').innerHTML=`CHARSET_SIZE: ${charset.length} CHARACTERS<br>KEY_LENGTH: ${chars} CHARACTERS (${bits} BIT TARGET)<br>ENTROPY: ~${entropy} BITS<br>TIME_TO_CRACK: ${ttc}`;
  showToast('KEY GENERATED ('+bits+' BIT STRENGTH)');
  addToVault('KEYGEN',bits+'BIT KEY GENERATED');
}
function copyGenKey(){
  const key=document.getElementById('genKeyOut').textContent;
  if(key.startsWith('GENERATE')){showToast('GENERATE A KEY FIRST',true);return;}
  navigator.clipboard.writeText(key).then(()=>showToast('KEY COPIED TO CLIPBOARD')).catch(()=>showToast('CLIPBOARD ACCESS DENIED',true));
}

/* ═══════════════════════════════════
   BENCHMARK
═══════════════════════════════════ */
const BENCH_ALGOS=[
  {name:'AES-256',key:'AES',color:'#00ff41',secLevel:'MILITARY',secBadge:'secure'},
  {name:'RABBIT', key:'Rabbit',color:'#4fc3f7',secLevel:'STRONG',secBadge:'fast'},
  {name:'3DES',   key:'TripleDES',color:'#ffbd2e',secLevel:'LEGACY',secBadge:'medium'},
  {name:'RC4',    key:'RC4',color:'#ff5f56',secLevel:'BROKEN',secBadge:'slow'},
];
function runBenchmark(){
  if(benchRunning)return;
  benchRunning=true;
  const btn=document.getElementById('bench-run-btn');
  const progress=document.getElementById('benchProgress');
  const results=document.getElementById('benchResults');
  btn.disabled=true;
  results.innerHTML='';
  const ITERS=100;
  const payload=CryptoJS.lib.WordArray.random(10240).toString();
  const key='zenith_benchmark_key_2024_secure';
  let idx=0;
  const benchResults=[];

  function runNext(){
    if(idx>=BENCH_ALGOS.length){
      finalizeBench(benchResults);
      btn.disabled=false;
      benchRunning=false;
      progress.textContent='';
      progress.classList.remove('running');
      return;
    }
    const algo=BENCH_ALGOS[idx];
    progress.textContent='> BENCHMARKING: '+algo.name+' ('+ITERS+' ITERATIONS)...';
    progress.classList.add('running');
    setTimeout(()=>{
      const engine=CryptoJS[algo.key];
      // Encrypt benchmark
      const t0=performance.now();
      let cipher;
      for(let i=0;i<ITERS;i++) cipher=engine.encrypt(payload,key).toString();
      const encTime=performance.now()-t0;
      // Decrypt benchmark
      const t1=performance.now();
      for(let i=0;i<ITERS;i++) engine.decrypt(cipher,key);
      const decTime=performance.now()-t1;
      const throughput=((payload.length*ITERS)/(encTime/1000)/1024).toFixed(1);
      benchResults.push({...algo,encTime:encTime.toFixed(1),decTime:decTime.toFixed(1),throughput,encPer:(encTime/ITERS).toFixed(2),decPer:(decTime/ITERS).toFixed(2)});
      idx++;
      runNext();
    },50);
  }
  runNext();
}
function finalizeBench(results){
  const container=document.getElementById('benchResults');
  // find fastest for normalization
  const maxTP=Math.max(...results.map(r=>parseFloat(r.throughput)));
  results.forEach(r=>{
    const pct=((parseFloat(r.throughput)/maxTP)*100).toFixed(0);
    const card=document.createElement('div');
    card.className='bench-card';
    card.innerHTML=`
      <div class="bench-card-header">
        <span class="bench-algo-name">${r.name}</span>
        <span class="bench-badge ${r.secBadge}">[${r.secLevel}]</span>
      </div>
      <div class="bench-bar-wrap">
        <div class="bench-bar-fill" style="width:0%;background:${r.color};" data-pct="${pct}"></div>
      </div>
      <div class="bench-meta">
        <span>ENC_AVG: <span class="val">${r.encPer}ms</span></span>
        <span>DEC_AVG: <span class="val">${r.decPer}ms</span></span>
        <span>THROUGHPUT: <span class="val">${r.throughput} KB/s</span></span>
        <span>SCORE: <span class="val">${pct}%</span></span>
      </div>`;
    container.appendChild(card);
    setTimeout(()=>{
      card.querySelector('.bench-bar-fill').style.width=pct+'%';
    },100);
  });
  showToast('BENCHMARK COMPLETE');
  addToVault('BENCH','ALL ALGORITHMS BENCHMARKED');
}
function clearBench(){
  document.getElementById('benchResults').innerHTML='';
  document.getElementById('benchProgress').textContent='';
  document.getElementById('benchProgress').classList.remove('running');
  document.getElementById('bench-run-btn').disabled=false;
  benchRunning=false;
  showToast('BENCHMARK CLEARED');
}

/* ═══════════════════════════════════
   QR CODE
═══════════════════════════════════ */
function generateQR(){
  const text=document.getElementById('qr-input').value.trim();
  const wrap=document.getElementById('qr-canvas-wrap');
  if(!text){showToast('ENTER TEXT TO ENCODE',true);return;}
  wrap.innerHTML='';
  try{
    qrInstance=new QRCode(wrap,{
      text:text,width:160,height:160,
      colorDark:'#000000',colorLight:'#ffffff',
      correctLevel:QRCode.CorrectLevel.M
    });
    showToast('QR CODE GENERATED');
    addToVault('QR','QR CODE GENERATED');
  }catch(e){
    wrap.innerHTML='<span style="color:var(--accent-red);font-size:10px;">QR_GENERATION_FAILED — TEXT TOO LONG</span>';
    showToast('QR FAILED — TEXT TOO LONG',true);
  }
}
function downloadQR(){
  const wrap=document.getElementById('qr-canvas-wrap');
  const canvas=wrap.querySelector('canvas');
  const img=wrap.querySelector('img');
  if(canvas){
    const a=document.createElement('a');
    a.download='zenith_qr_'+Date.now()+'.png';
    a.href=canvas.toDataURL('image/png');
    a.click();
    showToast('QR CODE SAVED');
  } else if(img){
    const a=document.createElement('a');
    a.download='zenith_qr_'+Date.now()+'.png';
    a.href=img.src;
    a.click();
    showToast('QR CODE SAVED');
  } else {
    showToast('GENERATE A QR CODE FIRST',true);
  }
}

/* ═══════════════════════════════════
   SELF DESTRUCT
═══════════════════════════════════ */
function startSelfDestruct(){
  const msg=document.getElementById('sd-msg').value.trim();
  const secs=parseInt(document.getElementById('sd-sec').value)||10;
  if(!msg){showToast('ENTER A MESSAGE FIRST',true);return;}
  if(sdTimer){clearInterval(sdTimer);}
  const display=document.getElementById('sd-display');
  const timerEl=document.getElementById('sd-timer');
  const countdown=document.getElementById('sd-countdown');
  const status=document.getElementById('sd-status');
  display.textContent=msg;
  display.style.display='block';
  timerEl.style.display='flex';
  status.textContent='> MESSAGE ARMED — WILL SELF-DESTRUCT IN '+secs+'s';
  let remaining=secs;
  countdown.textContent=remaining;
  addToVault('SD','SELF-DESTRUCT MESSAGE ARMED ('+secs+'s)');
  sdTimer=setInterval(()=>{
    remaining--;
    countdown.textContent=remaining;
    if(remaining<=0){
      clearInterval(sdTimer);sdTimer=null;
      display.textContent='[MESSAGE_DESTROYED]';
      display.style.color='var(--accent-red)';
      timerEl.style.display='none';
      status.textContent='> SELF_DESTRUCT EXECUTED — DATA WIPED';
      document.getElementById('sd-msg').value='';
      showToast('MESSAGE SELF-DESTRUCTED');
      setTimeout(()=>{
        display.style.display='none';
        display.style.color='var(--accent-green)';
        status.textContent='';
      },2000);
    }
  },1000);
  showToast('MESSAGE ARMED — '+secs+'s TIMER STARTED');
}

/* ═══════════════════════════════════
   TEXT CONVERTER (Morse/Binary/Hex/ROT13/Base64)
═══════════════════════════════════ */
const MORSE={
  'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---',
  'K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-',
  'U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
  '6':'-....','7':'--...','8':'---..','9':'----.',
  '.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--',
  ' ':'/'
};
const MORSE_REV=Object.fromEntries(Object.entries(MORSE).map(([k,v])=>[v,k]));

function selectConv(btn){
  document.querySelectorAll('.conv-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentConv=btn.dataset.conv;
}
function runConversion(dir){
  const inp=document.getElementById('conv-input').value;
  const out=document.getElementById('conv-out');
  if(!inp.trim()){out.textContent='INPUT_EMPTY';return;}
  let result='';
  try{
    switch(currentConv){
      case'morse':
        if(dir==='encode'){
          result=inp.toUpperCase().split('').map(c=>MORSE[c]||'?').join(' ');
        } else {
          result=inp.trim().split(' ').map(code=>code==='/'?' ':(MORSE_REV[code]||'?')).join('');
        }
        break;
      case'binary':
        if(dir==='encode'){
          result=inp.split('').map(c=>c.charCodeAt(0).toString(2).padStart(8,'0')).join(' ');
        } else {
          result=inp.trim().split(/\s+/).map(b=>String.fromCharCode(parseInt(b,2))).join('');
        }
        break;
      case'hex':
        if(dir==='encode'){
          result=Array.from(inp).map(c=>c.charCodeAt(0).toString(16).padStart(2,'0').toUpperCase()).join(' ');
        } else {
          result=inp.trim().replace(/\s+/g,'').match(/.{2}/g).map(h=>String.fromCharCode(parseInt(h,16))).join('');
        }
        break;
      case'rot13':
        result=inp.replace(/[a-zA-Z]/g,c=>{
          const base=c<='Z'?65:97;
          return String.fromCharCode(((c.charCodeAt(0)-base+13)%26)+base);
        });
        break;
      case'base64':
        if(dir==='encode'){
          result=btoa(unescape(encodeURIComponent(inp)));
        } else {
          result=decodeURIComponent(escape(atob(inp)));
        }
        break;
    }
    out.textContent=result||'[EMPTY_RESULT]';
    addToVault('CONV',currentConv.toUpperCase()+'_'+dir.toUpperCase());
    showToast(currentConv.toUpperCase()+' '+dir.toUpperCase()+'D');
  }catch(e){
    out.textContent='CONVERSION_ERROR: INVALID INPUT';
    out.style.color='var(--accent-red)';
    setTimeout(()=>out.style.color='var(--accent-green)',2000);
    showToast('CONVERSION FAILED',true);
  }
}

/* ═══════════════════════════════════
   TEMPLATES
═══════════════════════════════════ */
const TEMPLATES=[
  {name:'SECURE_NOTE',  text:'[CLASSIFIED] This message is encrypted and intended for authorized personnel only.'},
  {name:'HANDSHAKE',    text:'INITIATING SECURE HANDSHAKE — PLEASE CONFIRM YOUR IDENTITY BEFORE PROCEEDING.'},
  {name:'DATA_XFER',    text:'BEGIN DATA TRANSFER — PAYLOAD FOLLOWS — VERIFY INTEGRITY AFTER RECEIPT.'},
  {name:'DEAD_DROP',    text:'COORDINATES ENCODED BELOW — RETRIEVE BEFORE NEXT CYCLE — DESTROY AFTER READING.'},
  {name:'AUTH_TOKEN',   text:'ONE-TIME AUTH TOKEN — VALID FOR SINGLE USE — DO NOT FORWARD OR DUPLICATE.'},
  {name:'ALERT',        text:'SECURITY ALERT — UNAUTHORIZED ACCESS DETECTED — CHANGE ALL CREDENTIALS IMMEDIATELY.'},
];
buildTemplates();
function buildTemplates(){
  const list=document.getElementById('tpl-list');
  TEMPLATES.forEach(tpl=>{
    const div=document.createElement('div');
    div.className='tpl-item';
    div.innerHTML=`<span class="tpl-name">${tpl.name}</span><span class="tpl-preview">${tpl.text.substring(0,40)}...</span><button class="tpl-use" onclick="useTemplate('${tpl.name}')">USE</button>`;
    list.appendChild(div);
  });
}
function useTemplate(name){
  const tpl=TEMPLATES.find(t=>t.name===name);
  if(!tpl)return;
  document.getElementById('messageInput').value=tpl.text;
  updateStats();
  // switch to encrypt tab
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById('encrypt-section').classList.add('active');
  document.querySelector('.tab-btn').classList.add('active');
  showToast('TEMPLATE LOADED: '+name);
}

/* ═══════════════════════════════════
   TOAST
═══════════════════════════════════ */
let toastTimer;
function showToast(msg,isError=false){
  const t=document.getElementById('toast');
  t.textContent='> '+msg;
  t.style.borderColor=isError?'var(--accent-red)':'var(--border-main)';
  t.style.color=isError?'var(--accent-red)':'var(--text-main)';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
}

/* ═══════════════════════════════════
   FOOTER CLOCK
═══════════════════════════════════ */
function startClock(){
  const el=document.getElementById('footerClock');
  if(!el)return;
  setInterval(()=>{
    el.textContent=new Date().toLocaleTimeString('en-US',{hour12:false});
  },1000);
}