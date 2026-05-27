// ============== STATE MANAGEMENT ==============
const STORAGE_KEY = "cherrychat_v5";

const state = {
  currentUser: null,
  users: {},
  chats: {},
  messages: {},
  stories: {},
  galleries: {},
  streaks: {},
  theme: "light"
};

// ============== INIT ==============
function init() {
  loadState();
  setupAuthListeners();
  setupAppListeners();
  applyTheme();
  
  if (state.currentUser) {
    showApp();
  } else {
    showAuth();
  }
}

// ============== STORAGE ==============
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    Object.assign(state, JSON.parse(saved));
  } else {
    seedDemoData();
    saveState();
  }
}

function seedDemoData() {
  const users = ["cherry", "luna", "sage", "demo"];
  users.forEach(u => {
    state.users[u] = {
      username: u,
      displayName: u.charAt(0).toUpperCase() + u.slice(1),
      password: "demo",
      bio: "✨ Living my best life",
      status: "Online",
      mood: "happy",
      avatar: null,
      lastActive: Date.now()
    };
  });

  // Sample chats
  state.chats["demo-cherry"] = {
    id: "demo-cherry",
    participants: ["demo", "cherry"],
    lastMessage: "hey! 👋",
    lastTime: Date.now()
  };
  state.chats["demo-luna"] = {
    id: "demo-luna",
    participants: ["demo", "luna"],
    lastMessage: "u on?",
    lastTime: Date.now()
  };

  // Sample messages
  state.messages["demo-cherry"] = [
    { from: "cherry", text: "omg hi!!", time: Date.now() - 5000 },
    { from: "demo", text: "hey!! how are u?", time: Date.now() - 3000 },
    { from: "cherry", text: "so good just vibing", time: Date.now() - 1000 }
  ];
  state.messages["demo-luna"] = [
    { from: "luna", text: "u on?", time: Date.now() }
  ];

  // Streaks
  state.streaks["demo-cherry"] = 7;
  state.streaks["demo-luna"] = 3;
}

// ============== AUTH ==============
function setupAuthListeners() {
  const tabs = document.querySelectorAll(".auth-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".auth-tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab + "Tab").classList.add("active");
    });
  });

  document.getElementById("loginBtn").addEventListener("click", () => {
    const user = document.getElementById("loginUser").value.toLowerCase();
    const pass = document.getElementById("loginPass").value;
    
    if (state.users[user] && state.users[user].password === pass) {
      state.currentUser = user;
      state.users[user].status = "Online";
      saveState();
      showApp();
    } else {
      alert("Invalid login");
    }
  });

  document.getElementById("signupBtn").addEventListener("click", () => {
    const user = document.getElementById("signupUser").value.toLowerCase();
    const name = document.getElementById("signupName").value;
    const pass = document.getElementById("signupPass").value;
    const bio = document.getElementById("signupBio").value;

    if (!user || !pass) {
      alert("Username and password required");
      return;
    }
    if (state.users[user]) {
      alert("Username exists");
      return;
    }

    state.users[user] = {
      username: user,
      displayName: name || user,
      password: pass,
      bio: bio || "✨",
      status: "Online",
      mood: "happy",
      avatar: null,
      lastActive: Date.now()
    };
    state.currentUser = user;
    saveState();
    showApp();
  });
}

function showAuth() {
  document.getElementById("authScreen").hidden = false;
  document.getElementById("appScreen").hidden = true;
}

function showApp() {
  document.getElementById("authScreen").hidden = true;
  document.getElementById("appScreen").hidden = false;
  renderChats();
  renderProfile();
  setupCamera();
}

// ============== THEME ==============
function applyTheme() {
  document.body.className = "";
  if (state.theme === "aqua") document.body.classList.add("theme-aqua");
  if (state.theme === "dark") document.body.classList.add("theme-dark");
  document.getElementById("themeSelect").value = state.theme;
}

document.getElementById("themeSelect").addEventListener("change", (e) => {
  state.theme = e.target.value;
  saveState();
  applyTheme();
});

// ============== NAVIGATION ==============
function setupAppListeners() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(view + "View").classList.add("active");
    });
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    if (state.currentUser) {
      state.users[state.currentUser].status = "Offline";
      state.currentUser = null;
      saveState();
      showAuth();
    }
  });
}

// ============== CHATS ==============
let selectedChat = null;

function renderChats() {
  const list = document.getElementById("chatsList");
  list.innerHTML = "";

  Object.values(state.chats).forEach(chat => {
    const other = chat.participants.find(p => p !== state.currentUser);
    const user = state.users[other];
    const initial = user.displayName[0].toUpperCase();
    const streakCount = state.streaks[chat.id] || 0;
    const online = user.status === "Online" ? "🟢" : "⚫";

    const div = document.createElement("div");
    div.className = "chat-item";
    if (selectedChat?.id === chat.id) div.classList.add("active");

    div.innerHTML = `
      <div class="avatar small">${initial}</div>
      <div class="chat-item-info">
        <div class="chat-item-name">${user.displayName} ${online}</div>
        <div class="chat-item-last">${chat.lastMessage}</div>
      </div>
      <div class="chat-item-streak">${streakCount > 0 ? streakCount + "🔥" : ""}</div>
    `;

    div.addEventListener("click", () => openChat(chat, other));
    list.appendChild(div);
  });
}

function openChat(chat, otherUser) {
  selectedChat = chat;
  renderChats();
  renderChatModal(chat.id, otherUser);
  document.getElementById("chatModal").classList.remove("hidden");
}

function renderChatModal(chatId, otherUser) {
  const user = state.users[otherUser];
  const initial = user.displayName[0].toUpperCase();
  const messages = state.messages[chatId] || [];
  const streak = state.streaks[chatId] || 0;

  document.getElementById("chatAvatar").innerHTML = `<div style="background: linear-gradient(135deg, #ffc7e3, #ff4b9a); width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${initial}</div>`;
  document.getElementById("chatUserName").textContent = user.displayName;
  document.getElementById("chatUserStatus").textContent = user.status + " • " + (user.mood || "neutral");
  document.getElementById("streakCount").textContent = streak;

  const feed = document.getElementById("messagesFeed");
  feed.innerHTML = "";

  messages.forEach(msg => {
    const div = document.createElement("div");
    if (msg.isSnap) {
      div.className = `message snap ${msg.from === state.currentUser ? "sent" : "received"}`;
      div.innerHTML = `<img src="${msg.text}" alt="snap">`;
    } else {
      div.className = `message ${msg.from === state.currentUser ? "sent" : "received"}`;
      div.textContent = msg.text;
    }
    feed.appendChild(div);
  });

  feed.scrollTop = feed.scrollHeight;
}

document.getElementById("closeChat").addEventListener("click", () => {
  document.getElementById("chatModal").classList.add("hidden");
  selectedChat = null;
});

document.getElementById("sendMessageBtn").addEventListener("click", () => {
  if (!selectedChat) return;
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text) return;

  if (!state.messages[selectedChat.id]) state.messages[selectedChat.id] = [];
  
  state.messages[selectedChat.id].push({
    from: state.currentUser,
    text,
    time: Date.now()
  });

  selectedChat.lastMessage = text;
  selectedChat.lastTime = Date.now();
  input.value = "";
  saveState();
  
  const other = selectedChat.participants.find(p => p !== state.currentUser);
  renderChatModal(selectedChat.id, other);
  renderChats();
});

document.getElementById("messageInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") document.getElementById("sendMessageBtn").click();
});

document.getElementById("newChatBtn").addEventListener("click", () => {
  const username = prompt("Username to chat with?");
  if (!username) return;
  
  const u = username.toLowerCase();
  if (!state.users[u]) {
    alert("User not found");
    return;
  }
  if (u === state.currentUser) {
    alert("Can't chat with yourself");
    return;
  }

  const chatId = [state.currentUser, u].sort().join("-");
  if (!state.chats[chatId]) {
    state.chats[chatId] = {
      id: chatId,
      participants: [state.currentUser, u],
      lastMessage: "Chat started",
      lastTime: Date.now()
    };
    state.messages[chatId] = [];
    saveState();
    renderChats();
  }
});

// ============== CAMERA & FILTERS ==============
let currentFilter = "neon";
let cameraStream = null;

const filters = {
  neon: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, d[i] * 1.3);
      d[i+1] = Math.min(255, d[i+1] * 0.8);
      d[i+2] = Math.min(255, d[i+2] * 1.2);
    }
    ctx.putImageData(id, 0, 0);
  },
  vintage: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const avg = (d[i] + d[i+1] + d[i+2]) * 0.3;
      d[i] = Math.min(255, avg + 40);
      d[i+1] = Math.min(255, avg + 10);
      d[i+2] = Math.max(0, avg * 0.8);
    }
    ctx.putImageData(id, 0, 0);
  },
  bw: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = d[i] * 0.3 + d[i+1] * 0.59 + d[i+2] * 0.11;
      d[i] = d[i+1] = d[i+2] = gray;
    }
    ctx.putImageData(id, 0, 0);
  },
  film: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.max(0, d[i] - 30);
      d[i+1] = Math.max(0, d[i+1] - 20);
      d[i+2] = Math.max(0, d[i+2] - 10);
      if (Math.random() < 0.01) d[i+3] *= Math.random();
    }
    ctx.putImageData(id, 0, 0);
  },
  edge: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const temp = new Uint8ClampedArray(d);
    for (let i = 0; i < d.length; i += 4) {
      const idx = i / 4;
      const x = idx % w;
      const y = Math.floor(idx / w);
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) continue;
      const dx = temp[i+4] - temp[i];
      const dy = temp[i + w*4] - temp[i];
      const edge = Math.abs(dx) + Math.abs(dy);
      d[i] = d[i+1] = d[i+2] = Math.min(255, edge);
    }
    ctx.putImageData(id, 0, 0);
  },
  blur: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = (d[i] + d[Math.max(0, i-4)]) / 2;
      d[i+1] = (d[i+1] + d[Math.max(0, i+1-4)]) / 2;
      d[i+2] = (d[i+2] + d[Math.max(0, i+2-4)]) / 2;
    }
    ctx.putImageData(id, 0, 0);
  },
  saturate: (ctx, w, h) => {
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, d[i] * 1.5);
      d[i+1] = Math.min(255, d[i+1] * 1.5);
      d[i+2] = Math.min(255, d[i+2] * 1.5);
    }
    ctx.putImageData(id, 0, 0);
  }
};

async function setupCamera() {
  const video = document.getElementById("videoFeed");
  const canvas = document.getElementById("filterCanvas");
  const ctx = canvas.getContext("2d");

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });
    video.srcObject = cameraStream;

    video.onloadedmetadata = () => {
      canvas.width = video.offsetWidth;
      canvas.height = video.offsetHeight;
    };

    const loop = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (filters[currentFilter]) {
        filters[currentFilter](ctx, canvas.width, canvas.height);
        canvas.style.display = "block";
      } else {
        canvas.style.display = "none";
      }
      requestAnimationFrame(loop);
    };
    loop();
  } catch (e) {
    console.error("Camera error", e);
    alert("Camera access denied. Snaps won't work.");
  }
}

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    document.getElementById("filterName").textContent = btn.textContent;
  });
});

function captureSnap() {
  const video = document.getElementById("videoFeed");
  const canvas = document.createElement("canvas");
  canvas.width = video.offsetWidth;
  canvas.height = video.offsetHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
  if (filters[currentFilter]) {
    filters[currentFilter](ctx, canvas.width, canvas.height);
  }
  return canvas.toDataURL("image/png");
}

document.getElementById("snapToChat").addEventListener("click", () => {
  if (!selectedChat) {
    alert("Open a chat first!");
    return;
  }
  const snap = captureSnap();
  if (!state.messages[selectedChat.id]) state.messages[selectedChat.id] = [];
  
  state.messages[selectedChat.id].push({
    from: state.currentUser,
    text: snap,
    time: Date.now(),
    isSnap: true
  });

  selectedChat.lastMessage = "📸 Snap";
  selectedChat.lastTime = Date.now();
  saveState();
  
  const other = selectedChat.participants.find(p => p !== state.currentUser);
  renderChatModal(selectedChat.id, other);
  renderChats();
  updateStreak(selectedChat.id);
  alert("Snap sent! 🍒");
});

document.getElementById("snapToStory").addEventListener("click", () => {
  const snap = captureSnap();
  if (!state.stories[state.currentUser]) state.stories[state.currentUser] = [];
  state.stories[state.currentUser].push({ snap, time: Date.now() });
  saveState();
  renderStory();
  alert("Added to story! ✨");
});

document.getElementById("snapToGallery").addEventListener("click", () => {
  const snap = captureSnap();
  if (!state.galleries[state.currentUser]) state.galleries[state.currentUser] = [];
  state.galleries[state.currentUser].push({ snap, time: Date.now() });
  saveState();
  renderGallery();
  alert("Saved! 🍒");
});

function renderStory() {
  const story = state.stories[state.currentUser] || [];
  const grid = document.getElementById("storyGrid");
  grid.innerHTML = "";
  story.forEach(s => {
    const div = document.createElement("div");
    div.className = "story-snap";
    div.innerHTML = `<img src="${s.snap}" alt="story">`;
    grid.appendChild(div);
  });
}

function renderGallery() {
  const gallery = state.galleries[state.currentUser] || [];
  const grid = document.getElementById("galleryGrid");
  grid.innerHTML = "";
  gallery.forEach(g => {
    const img = document.createElement("img");
    img.src = g.snap;
    grid.appendChild(img);
  });
}

// ============== PROFILE ==============
function renderProfile() {
  const user = state.users[state.currentUser];
  const initial = user.displayName[0].toUpperCase();

  document.getElementById("profileAvatar").innerHTML = `<div style="background: linear-gradient(135deg, #ffc7e3, #ff4b9a); width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 48px;">${initial}</div>`;
  document.getElementById("profileName").textContent = user.displayName;
  document.getElementById("profileUsername").textContent = "@" + user.username;
  document.getElementById("profileBio").textContent = user.bio;
  document.getElementById("profileStatus").textContent = user.status + " • " + (user.mood || "neutral");

  if (state.stories[state.currentUser] && state.stories[state.currentUser].length > 0) {
    document.getElementById("storyRing").classList.remove("hidden");
  }

  renderGallery();
}

document.getElementById("avatarInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    state.users[state.currentUser].avatar = evt.target.result;
    saveState();
    renderProfile();
  };
  reader.readAsDataURL(file);
});

document.getElementById("setStatusBtn").addEventListener("click", () => {
  const moods = ["happy", "tired", "vibing", "studying", "asleep", "stressed"];
  const mood = prompt("Mood: " + moods.join(", "));
  if (mood && moods.includes(mood.toLowerCase())) {
    state.users[state.currentUser].mood = mood.toLowerCase();
    saveState();
    renderProfile();
  }
});

// ============== STREAKS ==============
function updateStreak(chatId) {
  if (!state.streaks[chatId]) {
    state.streaks[chatId] = 1;
  } else {
    state.streaks[chatId]++;
  }
  saveState();
}

// ============== START ==============
init();
