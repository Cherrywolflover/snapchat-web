const STORAGE_KEY = "cherrychat_v4";

const ping = document.getElementById("ping");

// ---------- STATE ----------
const defaultState = {
  users: {},
  currentUser: null,
  chats: {},
  stories: {},
  theme: "light",
  streaks: {},
  messages: {}
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
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  }catch(e){
    const s = structuredClone(defaultState);
    seedDemo(s);
    saveState(s);
    return s;
  }
}

function saveState(s = state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function seedDemo(s){
  const users = ["demo", "cherry", "luna", "sage"];
  
  users.forEach(u => {
    s.users[u] = {
      username: u,
      displayName: u.charAt(0).toUpperCase() + u.slice(1),
      password: "demo",
      bio: "✨ Living my best life on CherryChat",
      status: "Online",
      mood: "happy",
      avatar: null,
      gallery: [],
      lastActive: Date.now()
    };
  });

  // Create sample chats
  s.chats["demo-cherry"] = {
    id: "demo-cherry",
    participants: ["demo", "cherry"],
    lastMessage: "hey! 👋",
    lastMessageTime: Date.now()
  };

  s.chats["demo-luna"] = {
    id: "demo-luna",
    participants: ["demo", "luna"],
    lastMessage: "wanna hang?",
    lastMessageTime: Date.now()
  };

  // Initialize messages
  s.messages["demo-cherry"] = [
    { from: "cherry", text: "omg hi!!", timestamp: Date.now() - 5000 },
    { from: "demo", text: "hey! how are you?", timestamp: Date.now() - 3000 },
    { from: "cherry", text: "so good!! just vibing", timestamp: Date.now() - 1000 }
  ];

  s.messages["demo-luna"] = [
    { from: "luna", text: "wanna hang?", timestamp: Date.now() - 2000 }
  ];

  // Initialize streaks
  s.streaks["demo-cherry"] = { count: 7, lastSnap: Date.now() };
  s.streaks["demo-luna"] = { count: 3, lastSnap: Date.now() };
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

  if(!u || !p){ alert("Username + password required"); return; }
  if(state.users[u]){ alert("Username exists"); return; }

  state.users[u] = {
    username: u,
    displayName: d,
    password: p,
    bio,
    status: "Online",
    mood: "happy",
    avatar: null,
    gallery: [],
    lastActive: Date.now()
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
    alert("Invalid login");
    return;
  }

  state.currentUser = u;
  user.status = "Online";
  saveState();
  enterApp();
});

$("#btn-logout").addEventListener("click", ()=>{
  if(state.currentUser){
    state.users[state.currentUser].status = "Offline";
    state.currentUser = null;
    saveState();
    location.reload();
  }
});

// ---------- APP INIT ----------
function enterApp(){
  $("#auth").hidden = true;
  $("#app").hidden = false;
  applyTheme();
  renderChats();
  renderProfile();
  setupCamera();
  setupViews();
}

// ---------- THEME ----------
$("#theme-select").addEventListener("change", (e)=>{
  state.theme = e.target.value;
  saveState();
  applyTheme();
});

function applyTheme(){
  document.body.className = "";
  if(state.theme === "aqua") document.body.classList.add("theme-aqua");
  if(state.theme === "dark") document.body.classList.add("theme-dark");
  $("#theme-select").value = state.theme;
}

// ---------- VIEW NAVIGATION ----------
$$(".side-btn").forEach(btn => {
  btn.addEventListener("click", ()=>{
    const view = btn.dataset.view;
    $$(".side-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    $$(".view").forEach(v => v.classList.remove("active"));
    $("#view-" + view).classList.add("active");
  });
});

function setupViews(){
  $$(".side-btn")[0].click();
}

// ---------- CHATS ----------
let selectedChat = null;

function renderChats(){
  const list = $("#chat-list");
  list.innerHTML = "";
  const chats = Object.values(state.chats);
  
  if(chats.length === 0){
    list.innerHTML = '<div class="empty-state">No chats yet. Start one!</div>';
    return;
  }

  chats.forEach(chat => {
    const other = chat.participants.find(p => p !== state.currentUser);
    const user = state.users[other];
    
    const div = document.createElement("div");
    div.className = "chat-item";
    if(selectedChat?.id === chat.id) div.classList.add("active");
    
    const avatar = createAvatar(user);
    const status = user.status === "Online" ? "🟢" : "⚫";
    
    div.innerHTML = `
      <div class="chat-item-avatar">${avatar}</div>
      <div class="chat-item-info">
        <div class="chat-item-name">${user.displayName} ${status}</div>
        <div class="chat-item-last">${chat.lastMessage || "No messages"}</div>
      </div>
      <div class="chat-item-streak">🔥 ${getStreak(chat.id)}</div>
    `;
    
    div.addEventListener("click", ()=> selectChat(chat, other));
    list.appendChild(div);
  });
}

function selectChat(chat, otherUser){
  selectedChat = chat;
  renderChats();
  renderChatFeed(chat.id, otherUser);
}

function renderChatFeed(chatId, otherUser){
  const user = state.users[otherUser];
  const feed = $("#chat-feed");
  
  $("#chat-avatar").innerHTML = createAvatar(user);
  $("#chat-name").textContent = user.displayName;
  $("#chat-status").textContent = user.status + " • " + (user.mood || "neutral");
  
  feed.innerHTML = "";
  const messages = state.messages[chatId] || [];
  
  messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = `msg ${msg.from === state.currentUser ? "me" : "them"}`;
    div.textContent = msg.text;
    feed.appendChild(div);
  });
  
  feed.scrollTop = feed.scrollHeight;
}

$("#btn-send").addEventListener("click", ()=>{
  if(!selectedChat) return alert("Select a chat first");
  
  const input = $("#msg-input");
  const text = input.value.trim();
  if(!text) return;
  
  if(!state.messages[selectedChat.id]) state.messages[selectedChat.id] = [];
  
  state.messages[selectedChat.id].push({
    from: state.currentUser,
    text,
    timestamp: Date.now()
  });
  
  selectedChat.lastMessage = text;
  selectedChat.lastMessageTime = Date.now();
  
  input.value = "";
  saveState();
  renderChats();
  renderChatFeed(selectedChat.id, selectedChat.participants.find(p => p !== state.currentUser));
  ping.play();
});

$("#msg-input").addEventListener("keypress", (e)=>{
  if(e.key === "Enter") $("#btn-send").click();
});

$("#btn-new-chat").addEventListener("click", ()=>{
  const username = prompt("Enter username to chat with:");
  if(!username) return;
  
  const u = username.toLowerCase();
  if(!state.users[u]){ alert("User not found"); return; }
  if(u === state.currentUser){ alert("Can't chat with yourself"); return; }
  
  const chatId = [state.currentUser, u].sort().join("-");
  
  if(!state.chats[chatId]){
    state.chats[chatId] = {
      id: chatId,
      participants: [state.currentUser, u],
      lastMessage: "Chat started",
      lastMessageTime: Date.now()
    };
    state.messages[chatId] = [];
    saveState();
  }
  
  renderChats();
});

function getStreak(chatId){
  return state.streaks[chatId]?.count || 0;
}

// ---------- CAMERA & FILTERS ----------
let currentFilter = "neon";
const filters = {
  neon: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for(let i=0;i<d.length;i+=4){
      d[i] = Math.min(255, d[i]*1.3);
      d[i+1] = Math.min(255, d[i+1]*0.8);
      d[i+2] = Math.min(255, d[i+2]*1.2);
    }
    ctx.putImageData(id, 0, 0);
  },
  vintage: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for(let i=0;i<d.length;i+=4){
      const avg = (d[i]+d[i+1]+d[i+2])*0.3;
      d[i] = Math.min(255, avg+40);
      d[i+1] = Math.min(255, avg+10);
      d[i+2] = avg*0.8;
    }
    ctx.putImageData(id, 0, 0);
  },
  bw: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for(let i=0;i<d.length;i+=4){
      const gray = d[i]*0.3 + d[i+1]*0.59 + d[i+2]*0.11;
      d[i] = d[i+1] = d[i+2] = gray;
    }
    ctx.putImageData(id, 0, 0);
  },
  film: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for(let i=0;i<d.length;i+=4){
      d[i] = Math.max(0, d[i]-30);
      d[i+1] = Math.max(0, d[i+1]-20);
      d[i+2] = Math.max(0, d[i+2]-10);
      if(Math.random()<0.02) d[i+3] = Math.random()*100;
    }
    ctx.putImageData(id, 0, 0);
  },
  edge: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const temp = new Uint8ClampedArray(d);
    for(let i=0;i<d.length;i+=4){
      const x = (i%4===0) ? (i/4)%w : -1;
      if(x<0) continue;
      const dx = x<w-1 ? temp[i+4]-temp[i] : 0;
      const dy = (i<(w*4)*(h-1)) ? temp[i+w*4]-temp[i] : 0;
      const edge = Math.abs(dx)+Math.abs(dy);
      d[i] = d[i+1] = d[i+2] = Math.min(255, edge);
    }
    ctx.putImageData(id, 0, 0);
  }
};

async function setupCamera(){
  const video = $("#cam");
  const canvas = $("#snap-canvas");
  const ctx = canvas.getContext("2d");
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = stream;
    
    const resize = () => {
      canvas.width = video.offsetWidth;
      canvas.height = video.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    
    const loop = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if(filters[currentFilter]) filters[currentFilter](ctx, canvas.width, canvas.height);
      requestAnimationFrame(loop);
    };
    loop();
  } catch(e) {
    console.error("Camera access denied", e);
  }
}

$$(".filter-btn").forEach(btn => {
  btn.addEventListener("click", ()=>{
    $$(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    $("#filter-name").textContent = btn.textContent;
  });
});

function captureSnap(){
  const video = $("#cam");
  const canvas = document.createElement("canvas");
  canvas.width = video.offsetWidth;
  canvas.height = video.offsetHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
  if(filters[currentFilter]) filters[currentFilter](ctx, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

$("#btn-snap-chat").addEventListener("click", ()=>{
  if(!selectedChat){
    alert("Select a chat first!");
    return;
  }
  
  const snap = captureSnap();
  const msg = {
    from: state.currentUser,
    text: snap,
    timestamp: Date.now(),
    isSnap: true
  };
  
  if(!state.messages[selectedChat.id]) state.messages[selectedChat.id] = [];
  state.messages[selectedChat.id].push(msg);
  
  selectedChat.lastMessage = "📸 Snap";
  saveState();
  
  const otherUser = selectedChat.participants.find(p => p !== state.currentUser);
  renderChatFeed(selectedChat.id, otherUser);
  
  updateStreak(selectedChat.id);
  ping.play();
});

$("#btn-snap-story").addEventListener("click", ()=>{
  const snap = captureSnap();
  if(!state.stories[state.currentUser]) state.stories[state.currentUser] = [];
  state.stories[state.currentUser].push({ snap, timestamp: Date.now() });
  saveState();
  renderStory();
  alert("Added to your story! ✨");
});

$("#btn-snap-gallery").addEventListener("click", ()=>{
  const snap = captureSnap();
  const user = state.users[state.currentUser];
  if(!user.gallery) user.gallery = [];
  user.gallery.push({ snap, timestamp: Date.now() });
  saveState();
  renderGallery();
  alert("Saved to gallery! 🍒");
});

function renderStory(){
  const story = state.stories[state.currentUser] || [];
  const list = $("#story-list");
  list.innerHTML = "";
  
  story.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "story-snap";
    div.innerHTML = `<img src="${s.snap}" alt="story" />`;
    list.appendChild(div);
  });
}

function renderGallery(){
  const user = state.users[state.currentUser];
  const gallery = user.gallery || [];
  const grid = $("#gallery-grid");
  grid.innerHTML = "";
  
  gallery.forEach(g => {
    const img = document.createElement("img");
    img.src = g.snap;
    grid.appendChild(img);
  });
}

// ---------- PROFILE ----------
function createAvatar(user){
  if(user.avatar) return `<img src="${user.avatar}" class="avatar-img" />`;
  const hash = user.username.charCodeAt(0) % 6;
  const colors = ["#FFB6D9", "#A8D8FF", "#FFD4A3", "#C7B3FF", "#FFE4B3", "#B3E5FC"];
  const initial = user.displayName[0].toUpperCase();
  return `<div style="background:${colors[hash]}; width:100%; height:100%; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">${initial}</div>`;
}

function renderProfile(){
  const user = state.users[state.currentUser];
  
  $("#profile-avatar").innerHTML = createAvatar(user);
  $("#profile-name").textContent = user.displayName;
  $("#profile-username").textContent = "@" + user.username;
  $("#profile-bio").textContent = user.bio;
  $("#profile-status-text").textContent = (user.status || "Offline") + " • " + (user.mood || "neutral");
  
  renderGallery();
  renderStory();
}

$("#avatar-input").addEventListener("change", (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    state.users[state.currentUser].avatar = event.target.result;
    saveState();
    renderProfile();
  };
  reader.readAsDataURL(file);
});

$("#btn-set-status").addEventListener("click", ()=>{
  const moods = ["happy", "tired", "vibing", "studying", "asleep", "stressed"];
  const mood = prompt("Set mood: " + moods.join(", "));
  if(mood && moods.includes(mood.toLowerCase())){
    state.users[state.currentUser].mood = mood.toLowerCase();
    saveState();
    renderProfile();
  }
});

// ---------- STREAKS ----------
function updateStreak(chatId){
  if(!state.streaks[chatId]){
    state.streaks[chatId] = { count: 1, lastSnap: Date.now() };
  } else {
    state.streaks[chatId].count++;
    state.streaks[chatId].lastSnap = Date.now();
  }
  saveState();
}

// ---------- INIT ----------
if(state.currentUser){
  enterApp();
} else {
  $("#auth").hidden = false;
  $("#app").hidden = true;
}
