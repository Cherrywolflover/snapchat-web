// app.js (ES module)
const STORAGE = "cherrychat_v2";
const ping = document.getElementById("ping");

// ---------- State engine (localStorage) ----------
const defaultState = {
  users: {},
  servers: {},
  messages: {},
  dms: {},
  friendRequests: [],
  snapStreaks: {},
  currentUser: null,
  currentServer: null,
  currentChannel: null
};

let state = load();

function load(){
  try{
    const raw = localStorage.getItem(STORAGE);
    if(!raw) {
      const s = seed(structuredClone(defaultState));
      localStorage.setItem(STORAGE, JSON.stringify(s));
      return s;
    }
    return {...structuredClone(defaultState), ...JSON.parse(raw)};
  }catch(e){
    console.error("load error", e);
    const s = seed(structuredClone(defaultState));
    localStorage.setItem(STORAGE, JSON.stringify(s));
    return s;
  }
}

function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }

// ---------- Seed demo data ----------
function seed(s){
  s.users["cherry"] = { username:"cherry", displayName:"Cherry Wolf", password:"demo", bio:"Prototype queen", status:"online", friends:["luna"] };
  s.users["luna"] = { username:"luna", displayName:"Luna Howl", password:"demo", bio:"Moon coder", status:"online", friends:["cherry"] };
  const sid = "server-main";
  s.servers[sid] = { id:sid, name:"Cherry Lounge", description:"Cozy chaos", channels:[{id:"general",name:"general",desc:"Main chat"}], members:["cherry","luna"] };
  s.currentServer = sid;
  s.currentChannel = "general";
  s.messages[`${sid}::general`] = [
    { id:"m1", from:"luna", text:"Welcome to CherryChat demo", ts:Date.now()-600000 },
    { id:"m2", from:"cherry", text:"Say hi to the wolves", ts:Date.now()-300000 }
  ];
  // small tiktok seed
  window.__tiktok = [
    { id:"v1", title:"Flower loop", creator:"Luna", src:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", stats:{likes:120,comments:12} }
  ];
  return s;
}

// ---------- DOM helpers ----------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// ---------- Auth UI ----------
$$(".tab").forEach(t => t.addEventListener("click", e => {
  $$(".tab").forEach(x=>x.classList.remove("active"));
  t.classList.add("active");
  $$(".panel").forEach(p=>p.classList.remove("active"));
  $(`#panel-${t.dataset.panel}`).classList.add("active");
}));

$("#btn-register").addEventListener("click", () => {
  const u = $("#reg-username").value.trim().toLowerCase();
  const d = $("#reg-display").value.trim() || u;
  const p = $("#reg-password").value;
  const bio = $("#reg-bio").value || "";
  if(!u || !p){ alert("username & password required"); return; }
  if(state.users[u]){ alert("username taken"); return; }
  state.users[u] = { username:u, displayName:d, password:p, bio, status:"online", friends:[] };
  state.currentUser = u;
  save();
  enter();
});

$("#btn-login").addEventListener("click", () => {
  const u = $("#login-username").value.trim().toLowerCase();
  const p = $("#login-password").value;
  const user = state.users[u];
  if(!user || user.password !== p){ alert("invalid credentials"); return; }
  user.status = "online";
  state.currentUser = u;
  save();
  enter();
});

$("#btn-logout").addEventListener("click", () => {
  if(state.currentUser) state.users[state.currentUser].status = "offline";
  state.currentUser = null;
  save();
  $("#auth").style.display = "";
  $("#app").hidden = true;
});

// ---------- Enter app ----------
function enter(){
  $("#auth").style.display = "none";
  $("#app").hidden = false;
  renderAll();
  startCam();
}

// Auto-enter if user exists
if(state.currentUser && state.users[state.currentUser]) {
  $("#auth").style.display = "none";
  $("#app").hidden = false;
  renderAll();
  startCam();
}

// ---------- Rendering ----------
function renderAll(){
  renderProfile();
  renderServers();
  renderChannels();
  renderChat();
  renderUsers();
  renderRequests();
  renderHeaderStats();
  renderTikTok();
}

function renderProfile(){
  const u = state.currentUser && state.users[state.currentUser];
  if(!u) return;
  $("#profile-name").textContent = u.displayName || u.username;
  $("#profile-avatar").textContent = (u.displayName||u.username)[0].toUpperCase();
  const dot = $("#status-dot");
  if(u.status === "online"){ dot.classList.remove("offline"); dot.classList.add("online"); $("#status-text").textContent="Online"; } else { dot.classList.remove("online"); dot.classList.add("offline"); $("#status-text").textContent="Offline"; }
}

function renderServers(){
  const container = $("#servers");
  container.innerHTML = "";
  Object.values(state.servers).forEach(s => {
    const el = document.createElement("button");
    el.className = "channel";
    el.textContent = s.name[0].toUpperCase();
    if(s.id === state.currentServer) el.classList.add("active");
    el.addEventListener("click", () => {
      state.currentServer = s.id;
      state.currentChannel = s.channels[0]?.id || null;
      save(); renderAll();
    });
    container.appendChild(el);
  });
}

$("#add-server").addEventListener("click", () => {
  const name = prompt("Server name");
  if(!name) return;
  const id = "srv-" + Date.now();
  state.servers[id] = { id, name, description:"Custom server", channels:[{id:"general",name:"general",desc:"Main"}], members:[state.currentUser] };
  state.currentServer = id; state.currentChannel = "general"; save(); renderAll();
});

function renderChannels(){
  const list = $("#channel-list");
  list.innerHTML = "";
  const srv = state.servers[state.currentServer];
  if(!srv) return;
  $("#server-name").textContent = srv.name;
  $("#server-desc").textContent = srv.description;
  srv.channels.forEach(ch => {
    const el = document.createElement("div");
    el.className = "channel" + (ch.id === state.currentChannel ? " active" : "");
    el.textContent = "#" + ch.name;
    el.addEventListener("click", () => { state.currentChannel = ch.id; save(); renderChat(); renderChannels(); });
    list.appendChild(el);
  });
}

function renderChat(){
  const feed = $("#chat-feed");
  feed.innerHTML = "";
  const srv = state.servers[state.currentServer];
  if(!srv || !state.currentChannel) return;
  const key = `${srv.id}::${state.currentChannel}`;
  const msgs = (state.messages[key] || []).slice().sort((a,b)=>a.ts-b.ts);
  msgs.forEach(m => {
    const el = document.createElement("div");
    el.className = "msg " + (m.from === state.currentUser ? "me" : "them");
    el.innerHTML = `<div class="text">${escapeHtml(m.text||"")}</div>`;
    if(m.image) {
      const img = document.createElement("img");
      img.src = m.image; img.style.maxWidth="320px"; img.style.borderRadius="8px"; img.style.marginTop="8px";
      el.appendChild(img);
    }
    const meta = document.createElement("div"); meta.className="meta";
    meta.innerHTML = `<span>${state.users[m.from]?.displayName||m.from}</span><span>${new Date(m.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>`;
    el.appendChild(meta);
    feed.appendChild(el);
  });
  feed.scrollTop = feed.scrollHeight;
}

function renderUsers(){
  const list = $("#user-list");
  list.innerHTML = "";
  const srv = state.servers[state.currentServer];
  if(!srv) return;
  let online = 0;
  srv.members.forEach(u => {
    const user = state.users[u];
    if(!user) return;
    const el = document.createElement("div"); el.className="user";
    el.innerHTML = `<div class="avatar">${(user.displayName||user.username)[0].toUpperCase()}</div><div style="flex:1"><div>${user.displayName||user.username}</div><div style="font-size:12px;color:var(--muted)">${user.status}</div></div>`;
    el.addEventListener("click", () => openDM(state.currentUser, user.username));
    list.appendChild(el);
    if(user.status === "online") online++;
  });
  $("#online-count").textContent = online;
}

function renderRequests(){
  const container = $("#requests");
  container.innerHTML = "";
  const me = state.currentUser;
  if(!me) return;
  const reqs = state.friendRequests.filter(r => r.to === me);
  if(reqs.length === 0) { container.innerHTML = "<div class='empty'>No pending requests</div>"; return; }
  reqs.forEach(r => {
    const el = document.createElement("div"); el.className="req";
    el.innerHTML = `<div>${state.users[r.from]?.displayName||r.from}</div><div><button data-from="${r.from}" class="accept">Accept</button><button data-from="${r.from}" class="reject">Reject</button></div>`;
    container.appendChild(el);
  });
  container.querySelectorAll(".accept").forEach(b => b.addEventListener("click", e => handleRequest(e.target.dataset.from, true)));
  container.querySelectorAll(".reject").forEach(b => b.addEventListener("click", e => handleRequest(e.target.dataset.from, false)));
}

function handleRequest(from, accept){
  const me = state.currentUser;
  if(!me) return;
  if(accept){
    if(!state.users[from].friends.includes(me)) state.users[from].friends.push(me);
    if(!state.users[me].friends.includes(from)) state.users[me].friends.push(from);
  }
  state.friendRequests = state.friendRequests.filter(r => !(r.from===from && r.to===me));
  save(); renderRequests(); renderUsers();
}

function renderHeaderStats(){
  const me = state.currentUser;
  if(!me) return;
  $("#streak-count").textContent = state.snapStreaks[me] || 0;
  $("#dm-count").textContent = Object.values(state.dms).filter(d => d.participants?.includes(me)).length;
}

// ---------- Chat send ----------
$("#btn-send").addEventListener("click", sendMessage);
$("#msg-input").addEventListener("keydown", e => { if(e.key === "Enter") sendMessage(); });

function sendMessage(){
  const me = state.currentUser; if(!me) return;
  const srv = state.servers[state.currentServer]; if(!srv) return;
  const ch = state.currentChannel; if(!ch) return;
  const key = `${srv.id}::${ch}`;
  const text = $("#msg-input").value.trim();
  if(!text) return;
  state.messages[key] = state.messages[key] || [];
  state.messages[key].push({ id:"m"+Date.now(), from:me, text, ts:Date.now() });
  $("#msg-input").value = "";
  save(); renderChat(); notifyIncoming();
}

// ---------- DM (simple) ----------
function openDM(a,b){
  const participants = [a,b].sort();
  const id = "dm-"+participants.join("-");
  if(!state.dms[id]) state.dms[id] = { id, participants, messages:[] };
  save(); renderHeaderStats();
  alert(`DM created: ${participants.join(", ")}`);
}

// ---------- Notifications (audio + vibration) ----------
function notifyIncoming(){
  try{ ping.currentTime = 0; ping.play().catch(()=>{}); }catch(e){}
  if(navigator.vibrate) navigator.vibrate(60);
}

// ---------- Webcam + filters (canvas processing) ----------
const cam = $("#cam");
const canvas = $("#snap-canvas");
const ctx = canvas.getContext("2d");
let stream = null;
let currentFilter = "neon";

async function startCam(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({ video:{ width:640, height:360 }, audio:false });
    cam.srcObject = stream;
    cam.play();
    requestAnimationFrame(drawFrame);
  }catch(e){
    console.warn("webcam denied or unavailable", e);
  }
}

function drawFrame(){
  if(cam.videoWidth && cam.videoHeight){
    canvas.width = cam.videoWidth; canvas.height = cam.videoHeight;
    // mirror
    ctx.save(); ctx.scale(-1,1); ctx.drawImage(cam, -canvas.width, 0, canvas.width, canvas.height); ctx.restore();
    // apply filter pipeline
    applyFilterPipeline(ctx, canvas, currentFilter);
  }
  requestAnimationFrame(drawFrame);
}

function applyFilterPipeline(ctx, canvas, filter){
  // We'll use pixel manipulation for stronger effects
  if(filter === "neon"){
    // increase contrast + color tint
    ctx.globalCompositeOperation = "source-over";
    const img = ctx.getImageData(0,0,canvas.width,canvas.height);
    const d = img.data;
    for(let i=0;i<d.length;i+=4){
      // simple contrast boost
      d[i] = clamp((d[i]-128)*1.2 + 128 + 20);     // r
      d[i+1] = clamp((d[i+1]-128)*1.1 + 128 - 10); // g
      d[i+2] = clamp((d[i+2]-128)*1.3 + 128 + 40); // b
    }
    ctx.putImageData(img,0,0);
    // soft neon overlay
    ctx.fillStyle = "rgba(255,75,154,0.06)"; ctx.fillRect(0,0,canvas.width,canvas.height);
  } else if(filter === "vintage"){
    const img = ctx.getImageData(0,0,canvas.width,canvas.height);
    const d = img.data;
    for(let i=0;i<d.length;i+=4){
      const r = d[i], g = d[i+1], b = d[i+2];
      // sepia-ish
      d[i]   = clamp((r*0.393)+(g*0.769)+(b*0.189));
      d[i+1] = clamp((r*0.349)+(g*0.686)+(b*0.168));
      d[i+2] = clamp((r*0.272)+(g*0.534)+(b*0.131));
      // slight desaturate
      const avg = (d[i]+d[i+1]+d[i+2])/3;
      d[i] = d[i]*0.95 + avg*0.05;
      d[i+1] = d[i+1]*0.95 + avg*0.05;
      d[i+2] = d[i+2]*0.95 + avg*0.05;
    }
    ctx.putImageData(img,0,0);
    // vignette
    const g = ctx.createRadialGradient(canvas.width/2, canvas.height/2, Math.min(canvas.width,canvas.height)/4, canvas.width/2, canvas.height/2, Math.max(canvas.width,canvas.height));
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
  } else if(filter === "bw"){
    const img = ctx.getImageData(0,0,canvas.width,canvas.height);
    const d = img.data;
    for(let i=0;i<d.length;i+=4){
      const avg = (d[i]+d[i+1]+d[i+2])/3;
      d[i]=d[i+1]=d[i+2]=avg;
    }
    ctx.putImageData(img,0,0);
  } else if(filter === "grain"){
    // subtle film grain + contrast
    const img = ctx.getImageData(0,0,canvas.width,canvas.height);
    const d = img.data;
    for(let i=0;i<d.length;i+=4){
      const noise = (Math.random()-0.5)*30;
      d[i] = clamp(d[i]+noise);
      d[i+1] = clamp(d[i+1]+noise);
      d[i+2] = clamp(d[i+2]+noise);
    }
    ctx.putImageData(img,0,0);
    ctx.fillStyle = "rgba(255,200,150,0.02)"; ctx.fillRect(0,0,canvas.width,canvas.height);
  } else if(filter === "edge"){
    // simple edge detection convolution
    const img = ctx.getImageData(0,0,canvas.width,canvas.height);
    const out = ctx.createImageData(img.width, img.height);
    const w = img.width, h = img.height;
    const d = img.data, od = out.data;
    const kernel = [ -1,-1,-1, -1,8,-1, -1,-1,-1 ];
    for(let y=1;y<h-1;y++){
      for(let x=1;x<w-1;x++){
        let r=0,g=0,b=0;
        let k=0;
        for(let ky=-1;ky<=1;ky++){
          for(let kx=-1;kx<=1;kx++){
            const px = ( (y+ky)*w + (x+kx) )*4;
            r += d[px]*kernel[k];
            g += d[px+1]*kernel[k];
            b += d[px+2]*kernel[k];
            k++;
          }
        }
        const idx = (y*w + x)*4;
        od[idx] = clamp(Math.abs(r));
        od[idx+1] = clamp(Math.abs(g));
        od[idx+2] = clamp(Math.abs(b));
        od[idx+3] = 255;
      }
    }
    ctx.putImageData(out,0,0);
  }
}

function clamp(v){ return Math.max(0, Math.min(255, Math.round(v))); }

// ---------- Filter UI ----------
$$(".filter-btn").forEach(b => b.addEventListener("click", e => {
  $$(".filter-btn").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  currentFilter = b.dataset.filter;
  $("#filter-label").textContent = b.textContent;
}));

// ---------- Snap to chat (capture canvas image) ----------
$("#btn-snap").addEventListener("click", () => {
  if(!state.currentUser) { alert("Login first"); return; }
  // ensure canvas has latest frame
  const data = canvas.toDataURL("image/png");
  // increment streak
  state.snapStreaks[state.currentUser] = (state.snapStreaks[state.currentUser]||0) + 1;
  // push message into current channel
  const srv = state.servers[state.currentServer];
  if(!srv) return;
  const key = `${srv.id}::${state.currentChannel}`;
  state.messages[key] = state.messages[key] || [];
  state.messages[key].push({ id:"m"+Date.now(), from:state.currentUser, text:"[Snap]", image:data, ts:Date.now() });
  save(); renderChat(); renderHeaderStats(); renderUsers(); notifyIncoming();
});

// ---------- TikTok feed ----------
function renderTikTok(){
  const feed = $("#tiktok-feed");
  feed.innerHTML = "";
  const items = window.__tiktok || [];
  items.forEach(it => {
    const card = document.createElement("div"); card.className="tiktok-card";
    const v = document.createElement("video"); v.src = it.src; v.controls = true; v.loop = true;
    card.appendChild(v);
    const meta = document.createElement("div"); meta.style.padding="8px"; meta.innerHTML = `<strong>${it.title}</strong><div style="font-size:12px;color:var(--muted)">@${it.creator} • ♥ ${it.stats.likes}</div>`;
    card.appendChild(meta);
    feed.appendChild(card);
  });
}

// ---------- Utilities ----------
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- Simple demo: create friend request (for testing) ----------
window.createFriendRequest = (from,to) => {
  state.friendRequests.push({ from, to, ts:Date.now() });
  save();
  renderRequests();
};

// ---------- Small UX helpers ----------
$("#btn-profile").addEventListener("click", () => {
  const u = state.currentUser && state.users[state.currentUser];
  if(!u) return alert("No profile");
  alert(`Profile\n\nUsername: ${u.username}\nDisplay: ${u.displayName}\nBio: ${u.bio||''}\nFriends: ${u.friends?.length||0}\nStreak: ${state.snapStreaks[u.username]||0}`);
});
