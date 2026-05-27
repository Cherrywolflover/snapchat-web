const STORAGE_KEY = "cherrychat_snap_v1";

const ping = document.getElementById("ping");

// ---------- STATE ----------
const defaultState = {
  users: {},
  currentUser: null,
  chats: {},          // key: "me::other" sorted
  stories: {},        // username -> { image, ts }
  theme: "light"      // "light" | "aqua" | "dark"
};

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      const s = structuredClone(defaultState);
      seedDemo(s);
      saveState(s);
      return s;
    }
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  }catch(e){
    console.error(e);
    const s = structuredClone(defaultState);
    seedDemo(s);
    saveState(s);
    return s;
  }
}
function saveState(s = state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// demo user
function seedDemo(s){
  s.users["cherry"] = {
    username:"cherry",
    displayName:"Cherry Wolf",
    password:"demo",
    bio:"Prototype queen of CherryChat",
    status:"Online",
    avatar:null,
    gallery:[],
  };
  s.currentUser = null;
}

// ---------- DOM HELPERS ----------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// ---------- AUTH ----------
$$(".auth-tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $$(".auth-tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const panel = btn.dataset.panel;
    $$(".auth-panel").forEach(p=>p.classList.remove("active"));
    $("#auth-panel-"+panel).classList.add("active");
  });
});

$("#btn-register").addEventListener("click", ()=>{
  const u = $("#reg-username").value.trim().toLowerCase();
  const d = $("#reg-display").value.trim() || u;
  const p = $("#reg-password").value;
  const bio = $("#reg-bio").value.trim();
  if(!u || !p){ alert("Username and password required"); return; }
  if(state.users[u]){ alert("Username already exists"); return; }
  state.users[u] = {
    username:u,
    displayName:d,
    password:p,
    bio,
    status:"Online",
    avatar:null,
    gallery:[]
  };
  state.currentUser = u;
  saveState();
  enterApp();
});

$("#btn-login").addEventListener("click", ()=>{
  const u = $("#login-username").value.trim().toLowerCase();
  const p = $("#login-password").value;
  const user = state.users[u];
  if(!user || user.password !== p){
    alert("Invalid username or password");
    return;
  }
  state.currentUser = u;
  user.status = "Online";
  saveState();
  enterApp();
});

$("#btn-logout").addEventListener("click", ()=>{
  if(state.currentUser && state.users[state.currentUser]){
    state.users[state.currentUser].status = "Offline";
  }
  state.currentUser = null;
  saveState();
  $("#app").hidden = true;
  $("#auth").style.display = "";
});

// auto-login if remembered
if(state.currentUser && state.users[state.currentUser]){
  enterApp();
}

// ---------- APP ENTRY ----------
function enterApp(){
  $("#auth").style.display = "none";
  $("#app").hidden = false;
  applyTheme(state.theme);
  $("#theme-select").value = state.theme;
  renderAll();
  startCamera();
}

// ---------- THEME ----------
$("#theme-select").addEventListener("change", e=>{
  const val = e.target.value;
  state.theme = val;
  saveState();
  applyTheme(val);
});

function applyTheme(theme){
  document.body.classList.remove("theme-aqua","theme-dark");
  if(theme === "aqua") document.body.classList.add("theme-aqua");
  else if(theme === "dark") document.body.classList.add("theme-dark");
}

// ---------- RENDER ROOT ----------
function renderAll(){
  renderChatsList();
  renderChatView(null);
  renderProfile();
  renderStories();
}

// ---------- NAV ----------
$$(".nav-tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $$(".nav-tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.dataset.view;
    $$(".view").forEach(v=>v.classList.remove("active"));
    $("#view-"+view).classList.add("active");
  });
});

// ---------- CHATS ----------
let currentChatTarget = null; // username

function chatKey(a,b){
  const arr = [a,b].sort();
  return arr.join("::");
}

function renderChatsList(){
  const me = state.currentUser;
  if(!me) return;
  const list = $("#chat-list");
  list.innerHTML = "";
  const entries = Object.entries(state.chats)
    .filter(([key])=>key.includes(me))
    .map(([key,chat])=>{
      const [u1,u2] = key.split("::");
      const other = u1 === me ? u2 : u1;
      return { other, chat };
    });

  if(entries.length === 0){
    list.innerHTML = "<div class='muted' style='padding:6px;'>No chats yet. Start one!</div>";
    return;
  }

  entries.sort((a,b)=>{
    const la = a.chat.messages?.[a.chat.messages.length-1]?.ts || 0;
    const lb = b.chat.messages?.[b.chat.messages.length-1]?.ts || 0;
    return lb - la;
  });

  for(const {other,chat} of entries){
    const user = state.users[other];
    if(!user) continue;
    const item = document.createElement("div");
    item.className = "chat-item" + (other === currentChatTarget ? " active" : "");
    const avatar = document.createElement("div");
    avatar.className = "avatar small";
    if(user.avatar){
      const img = document.createElement("img");
      img.src = user.avatar;
      avatar.appendChild(img);
    }else{
      avatar.textContent = (user.displayName||user.username)[0].toUpperCase();
    }
    const textWrap = document.createElement("div");
    const name = document.createElement("div");
    name.textContent = user.displayName || user.username;
    const meta = document.createElement("div");
    meta.className = "chat-meta";
    const last = chat.messages?.[chat.messages.length-1];
    meta.textContent = last ? (last.text || "[Snap]") : "No messages yet";
    textWrap.appendChild(name);
    textWrap.appendChild(meta);
    item.appendChild(avatar);
    item.appendChild(textWrap);
    item.addEventListener("click", ()=>{
      currentChatTarget = other;
      renderChatsList();
      renderChatView(other);
    });
    list.appendChild(item);
  }
}

$("#btn-new-chat").addEventListener("click", ()=>{
  const me = state.currentUser;
  if(!me) return;
  const username = prompt("Start chat with username:");
  if(!username) return;
  const u = username.trim().toLowerCase();
  if(!state.users[u]){ alert("User not found"); return; }
  const key = chatKey(me,u);
  if(!state.chats[key]) state.chats[key] = { messages:[] };
  currentChatTarget = u;
  saveState();
  renderChatsList();
  renderChatView(u);
});

function renderChatView(target){
  const me = state.currentUser;
  const nameEl = $("#chat-name");
  const statusEl = $("#chat-status");
  const avatarEl = $("#chat-avatar");
  const feed = $("#chat-feed");

  if(!me || !target){
    nameEl.textContent = "No chat selected";
    statusEl.textContent = "";
    avatarEl.innerHTML = "";
    feed.innerHTML = "<div class='muted'>Select or create a chat.</div>";
    return;
  }

  const user = state.users[target];
  if(!user) return;
  nameEl.textContent = user.displayName || user.username;
  statusEl.textContent = user.status || "";
  avatarEl.innerHTML = "";
  if(user.avatar){
    const img = document.createElement("img");
    img.src = user.avatar;
    avatarEl.appendChild(img);
  }else{
    avatarEl.textContent = (user.displayName||user.username)[0].toUpperCase();
  }

  const key = chatKey(me,target);
  const chat = state.chats[key] || { messages:[] };
  feed.innerHTML = "";
  chat.messages.forEach(m=>{
    const el = document.createElement("div");
    el.className = "msg " + (m.from === me ? "me" : "them");
    const text = document.createElement("div");
    text.textContent = m.text || "";
    el.appendChild(text);
    if(m.image){
      const img = document.createElement("img");
      img.src = m.image;
      el.appendChild(img);
    }
    const meta = document.createElement("div");
    meta.className = "msg-meta";
    meta.innerHTML = `<span>${m.from === me ? "You" : (user.displayName||user.username)}</span><span>${new Date(m.ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>`;
    el.appendChild(meta);
    feed.appendChild(el);
  });
  feed.scrollTop = feed.scrollHeight;
}

$("#btn-send").addEventListener("click", sendMessage);
$("#msg-input").addEventListener("keydown", e=>{
  if(e.key === "Enter") sendMessage();
});

function sendMessage(){
  const me = state.currentUser;
  if(!me || !currentChatTarget) return;
  const text = $("#msg-input").value.trim();
  if(!text) return;
  const key = chatKey(me,currentChatTarget);
  if(!state.chats[key]) state.chats[key] = { messages:[] };
  state.chats[key].messages.push({
    from: me,
    text,
    ts: Date.now()
  });
  $("#msg-input").value = "";
  saveState();
  renderChatsList();
  renderChatView(currentChatTarget);
  notify();
}

// ---------- NOTIFY ----------
function notify(){
  try{
    ping.currentTime = 0;
    ping.play().catch(()=>{});
  }catch(e){}
  if(navigator.vibrate) navigator.vibrate(50);
}

// ---------- CAMERA + FILTERS ----------
const cam = $("#cam");
const canvas = $("#snap-canvas");
const ctx = canvas.getContext("2d");
let stream = null;
let currentFilter = "neon";

async function startCamera(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
    cam.srcObject = stream;
    cam.play();
    requestAnimationFrame(drawFrame);
  }catch(e){
    console.warn("Camera unavailable", e);
  }
}

function drawFrame(){
  if(cam.videoWidth && cam.videoHeight){
    canvas.width = cam.videoWidth;
    canvas.height = cam.videoHeight;
    ctx.save();
    ctx.scale(-1,1);
    ctx.drawImage(cam, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    applyFilter(currentFilter);
  }
  requestAnimationFrame(drawFrame);
}

function applyFilter(filter){
  const img = ctx.getImageData(0,0,canvas.width,canvas.height);
  const d = img.data;
  if(filter === "neon"){
    for(let i=0;i<d.length;i+=4){
      d[i] = clamp((d[i]-128)*1.3+128+20);
      d[i+1] = clamp((d[i+1]-128)*1.1+128-10);
      d[i+2] = clamp((d[i+2]-128)*1.4+128+40);
    }
    ctx.putImageData(img,0,0);
  }else if(filter === "vintage"){
    for(let i=0;i<d.length;i+=4){
      const r=d[i],g=d[i+1],b=d[i+2];
      d[i]   = clamp(r*0.393+g*0.769+b*0.189);
      d[i+1] = clamp(r*0.349+g*0.686+b*0.168);
      d[i+2] = clamp(r*0.272+g*0.534+b*0.131);
    }
    ctx.putImageData(img,0,0);
  }else if(filter === "bw"){
    for(let i=0;i<d.length;i+=4){
      const avg = (d[i]+d[i+1]+d[i+2])/3;
      d[i]=d[i+1]=d[i+2]=avg;
    }
    ctx.putImageData(img,0,0);
  }else if(filter === "film"){
    for(let i=0;i<d.length;i+=4){
      const noise = (Math.random()-0.5)*25;
      d[i] = clamp(d[i]+noise);
      d[i+1] = clamp(d[i+1]+noise);
      d[i+2] = clamp(d[i+2]+noise);
    }
    ctx.putImageData(img,0,0);
  }else if(filter === "edge"){
    const out = ctx.createImageData(img.width,img.height);
    const w = img.width, h = img.height;
    const od = out.data;
    const kernel = [-1,-1,-1,-1,8,-1,-1,-1,-1];
    for(let y=1;y<h-1;y++){
      for(let x=1;x<w-1;x++){
        let r=0,g=0,b=0,k=0;
        for(let ky=-1;ky<=1;ky++){
          for(let kx=-1;kx<=1;kx++){
            const px = ((y+ky)*w + (x+kx))*4;
            r += d[px]*kernel[k];
            g += d[px+1]*kernel[k];
            b += d[px+2]*kernel[k];
            k++;
          }
        }
        const idx = (y*w+x)*4;
        od[idx]=clamp(Math.abs(r));
        od[idx+1]=clamp(Math.abs(g));
        od[idx+2]=clamp(Math.abs(b));
        od[idx+3]=255;
      }
    }
    ctx.putImageData(out,0,0);
  }
}

function clamp(v){ return Math.max(0,Math.min(255,Math.round(v))); }

$$(".filter-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $$(".filter-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    $("#filter-name").textContent = btn.textContent;
  });
});

// ---------- SNAP ACTIONS ----------
$("#btn-snap-chat").addEventListener("click", ()=>{
  const me = state.currentUser;
  if(!me){ alert("Login first"); return; }
  if(!currentChatTarget){ alert("Open a chat first"); return; }
  const data = canvas.toDataURL("image/png");
  const key = chatKey(me,currentChatTarget);
  if(!state.chats[key]) state.chats[key] = { messages:[] };
  state.chats[key].messages.push({
    from: me,
    text: "[Snap]",
    image: data,
    ts: Date.now()
  });
  saveState();
  renderChatsList();
  renderChatView(currentChatTarget);
  notify();
});

$("#btn-snap-story").addEventListener("click", ()=>{
  const me = state.currentUser;
  if(!me){ alert("Login first"); return; }
  const data = canvas.toDataURL("image/png");
  state.stories[me] = { image:data, ts:Date.now() };
  saveState();
  renderStories();
  renderProfile();
  alert("Added to your story");
});

$("#btn-snap-gallery").addEventListener("click", ()=>{
  const me = state.currentUser;
  if(!me){ alert("Login first"); return; }
  const user = state.users[me];
  const data = canvas.toDataURL("image/png");
  user.gallery = user.gallery || [];
  user.gallery.push({ image:data, ts:Date.now() });
  saveState();
  renderProfile();
  alert("Saved to gallery");
});

// ---------- STORIES ----------
function renderStories(){
  const list = $("#story-list");
  list.innerHTML = "";
  const entries = Object.entries(state.stories);
  if(entries.length === 0){
    list.innerHTML = "<div class='muted'>No stories yet.</div>";
    return;
  }
  entries.forEach(([username,story])=>{
    const user = state.users[username];
    if(!user) return;
    const item = document.createElement("div");
    item.className = "story-item";
    const thumb = document.createElement("div");
    thumb.className = "story-thumb";
    const img = document.createElement("img");
    img.src = story.image;
    thumb.appendChild(img);
    const name = document.createElement("div");
    name.className = "story-name";
    name.textContent = user.displayName || user.username;
    item.appendChild(thumb);
    item.appendChild(name);
    item.addEventListener("click", ()=>{
      viewStory(username);
    });
    list.appendChild(item);
  });
}

function viewStory(username){
  const story = state.stories[username];
  const user = state.users[username];
  if(!story || !user) return;
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.background = "rgba(0,0,0,0.7)";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.zIndex = "9999";

  const card = document.createElement("div");
  card.style.background = "#000";
  card.style.borderRadius = "20px";
  card.style.padding = "10px";
  card.style.maxWidth = "420px";
  card.style.width = "90%";
  card.style.boxShadow = "0 18px 40px rgba(0,0,0,0.6)";
  const img = document.createElement("img");
  img.src = story.image;
  img.style.width = "100%";
  img.style.borderRadius = "16px";
  const caption = document.createElement("div");
  caption.style.color = "#fff";
  caption.style.fontSize = "13px";
  caption.style.marginTop = "6px";
  caption.textContent = (user.displayName||user.username) + "'s story";
  card.appendChild(img);
  card.appendChild(caption);
  container.appendChild(card);
  container.addEventListener("click", ()=>document.body.removeChild(container));
  document.body.appendChild(container);
}

// ---------- PROFILE ----------
function renderProfile(){
  const me = state.currentUser;
  if(!me) return;
  const user = state.users[me];
  $("#profile-name").textContent = user.displayName || user.username;
  $("#profile-username").textContent = "@"+user.username;
  $("#profile-bio").textContent = user.bio || "No bio yet.";
  $("#profile-status-text").textContent = user.status || "";

  const avatar = $("#profile-avatar");
  avatar.innerHTML = "";
  if(user.avatar){
    const img = document.createElement("img");
    img.src = user.avatar;
    avatar.appendChild(img);
  }else{
    avatar.textContent = (user.displayName||user.username)[0].toUpperCase();
  }

  const ring = $("#profile-story-ring");
  if(state.stories[me]) ring.classList.remove("hidden");
  else ring.classList.add("hidden");

  const storyBox = $("#profile-story");
  const story = state.stories[me];
  storyBox.innerHTML = "";
  if(!story){
    storyBox.classList.add("empty");
    storyBox.textContent = "No active story";
  }else{
    storyBox.classList.remove("empty");
    const img = document.createElement("img");
    img.src = story.image;
    storyBox.appendChild(img);
  }

  const grid = $("#gallery-grid");
  grid.innerHTML = "";
  (user.gallery || []).slice().reverse().forEach(item=>{
    const img = document.createElement("img");
    img.src = item.image;
    grid.appendChild(img);
  });
}

// avatar upload
$("#avatar-input").addEventListener("change", e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    const me = state.currentUser;
    if(!me) return;
    state.users[me].avatar = ev.target.result;
    saveState();
    renderProfile();
    renderChatsList();
    renderChatView(currentChatTarget);
  };
  reader.readAsDataURL(file);
});

// status
$("#btn-set-status").addEventListener("click", ()=>{
  const me = state.currentUser;
  if(!me) return;
  const val = prompt("Set your status:", state.users[me].status || "");
  if(val === null) return;
  state.users[me].status = val.trim();
  saveState();
  renderProfile();
  renderChatsList();
  renderChatView(currentChatTarget);
});
