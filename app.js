// ====== CHERRYCHAT ENGINE LAYER 1: DATA STORAGE & ROUTING FLOW ======
const store = {
    getUsers: () => JSON.parse(localStorage.getItem('cc_users') || '{}'),
    setUsers: (data) => localStorage.setItem('cc_users', JSON.stringify(data)),
    getCurrentUser: () => JSON.parse(localStorage.getItem('cc_current') || 'null'),
    setCurrentUser: (data) => localStorage.setItem('cc_current', JSON.stringify(data)),
    getMessages: () => JSON.parse(localStorage.getItem('cc_msgs') || '[]'),
    addMessage: (msg) => {
        const msgs = store.getMessages();
        msgs.push(msg);
        localStorage.setItem('cc_msgs', JSON.stringify(msgs));
    },
    getServers: () => JSON.parse(localStorage.getItem('cc_servers') || '[]'),
    setServers: (data) => localStorage.setItem('cc_servers', JSON.stringify(data))
};

// Seed Directory Initial Mock Data Loops
(function seedData() {
    let users = store.getUsers();
    if (Object.keys(users).length === 0) {
        users = {
            "alex99": { name: "Alex Rivers", user: "alex99", status: "online", friends: [], requests: [] },
            "emma_k": { name: "Emma Knight", user: "emma_k", status: "idle", friends: [], requests: [] },
            "sam_b": { name: "Sam Barnes", user: "sam_b", status: "dnd", friends: [], requests: [] }
        };
        store.setUsers(users);
    }
    let servers = store.getServers();
    if (servers.length === 0) {
        store.setServers([
            { id: "srv_math", name: "📐 Calculus Crew", channels: ["general", "homework"] },
            { id: "srv_gaming", name: "🎮 Esports Club", channels: ["general", "clips"] }
        ]);
    }
})();

let currentActiveChatId = null;
let currentActiveChatType = 'dm'; // 'dm', 'server', or 'tiktok'
let activeSidebarContext = 'chats'; 
let mediaStreamInstance = null;
let selectedFilterClass = 'filter-normal';

// Standardized Sound Synthesizer System for the Web Audio Messaging Ring Pings
function playPingNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch notification ping frequency
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch(e) { console.warn("Audio Context device block initialization bypass fired."); }
}

function switchAuthTab(tab, event) {
    if(event) event.preventDefault();
    document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.auth-form-panel').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-btn-${tab}`).classList.add('active');
    document.getElementById(`panel-${tab}`).classList.add('active');
}

function handleProfileSubmit() {
    const name = document.getElementById('reg-name').value.trim();
    const user = document.getElementById('reg-user').value.trim().toLowerCase();
    if(!name || !user) return alert('Profile details cannot be left blank.');
    
    let users = store.getUsers();
    if(users[user]) return alert('Username already registered!');
    
    const newUser = { name, user, status: "online", friends: [], requests: [], streaks: {} };
    users[user] = newUser;
    store.setUsers(users);
    store.setCurrentUser(newUser);
    
    document.getElementById('auth-wall').classList.add('hidden');
    renderSidebarMenu();
}

function handleLoginSubmit() {
    const user = document.getElementById('login-user').value.trim().toLowerCase();
    if(!user) return alert('Enter your user handle.');
    let users = store.getUsers();
    if(!users[user]) return alert('Profile path non-existent in this sandbox directory.');
    
    store.setCurrentUser(users[user]);
    document.getElementById('auth-wall').classList.add('hidden');
    renderSidebarMenu();
}

function updateMyStatus() {
    const picker = document.getElementById('status-picker');
    const status = picker.value;
    const indicator = document.getElementById('my-status-indicator');
    indicator.className = `status-dot ${status}`;
    
    let me = store.getCurrentUser();
    let users = store.getUsers();
    if(me && users[me.user]) {
        users[me.user].status = status;
        store.setUsers(users);
        store.setCurrentUser(users[me.user]);
    }
}

function switchNavContext(context) {
    activeSidebarContext = context;
    document.querySelectorAll('.server-icon').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-icon-${context === 'actions' ? 'chats' : context}`).classList.add('active');
    renderSidebarMenu();
}
// ====== PART 2: VIEW ENGINE & HARDWARE ACCESS ======

function openDesktopChat(id, type) {
    currentActiveChatId = id;
    currentActiveChatType = type;
    document.getElementById('chat-input-container').style.display = 'flex';
    
    if(type === 'dm') {
        document.getElementById('chat-title').innerText = `@${id}`;
        // Automatically tick up the snap streak matrix when you chat!
        const me = store.getCurrentUser();
        let users = store.getUsers();
        if(users[me.user] && users[me.user].streaks && users[me.user].streaks[id]) {
            users[me.user].streaks[id].count += 1;
            store.setUsers(users);
        }
    } else {
        const s = store.getServers().find(srv => srv.id === id);
        document.getElementById('chat-title').innerText = s ? s.name : "Server Feed";
    }
    renderSidebarMenu();
    renderDesktopMessages();
}

function renderDesktopMessages() {
    const container = document.getElementById('chat-messages-container');
    if(!container) return;
    container.innerHTML = "";
    const me = store.getCurrentUser();
    const allMsgs = store.getMessages();
    
    const filtered = allMsgs.filter(m => {
        if(currentActiveChatType === 'dm') {
            return (m.type === 'dm' && ((m.sender === me.user && m.receiver === currentActiveChatId) || (m.sender === currentActiveChatId && m.receiver === me.user)));
        } else {
            return (m.type === 'server' && m.serverId === currentActiveChatId);
        }
    });

    if(filtered.length === 0) {
        container.innerHTML = `<p style="color:var(--discord-text-muted); text-align:center; margin-top:40px;">No messages here yet. Say hello!</p>`;
        return;
    }

    filtered.forEach(m => {
        let contentStr = `<strong>@${m.sender}</strong>`;
        if(m.text) contentStr += `<div>${m.text}</div>`;
        if(m.img) contentStr += `<img src="${m.img}" class="${m.filter || 'filter-normal'}"/>`;
        container.innerHTML += `<div class="msg">${contentStr}</div>`;
    });
    container.scrollTop = container.scrollHeight;
}

function sendTextMessage() {
    const input = document.getElementById('chat-inline-input');
    const txt = input.value.trim();
    if(!txt) return;

    const me = store.getCurrentUser();
    const newMsg = { id: 'msg_' + Date.now(), type: currentActiveChatType, sender: me.user, text: txt, timestamp: new Date().getTime() };

    if(currentActiveChatType === 'dm') { newMsg.receiver = currentActiveChatId; } 
    else { newMsg.serverId = currentActiveChatId; }

    store.addMessage(newMsg);
    input.value = "";
    triggerPingSound(); // Play notification ping!
    renderDesktopMessages();
}

function sendFriendRequest() {
    const targetUser = document.getElementById('search-friend-username').value.trim().toLowerCase();
    const me = store.getCurrentUser();
    let users = store.getUsers();
    
    if(!users[targetUser]) return alert('User not found.');
    if(targetUser === me.user) return alert("Cannot add yourself.");
    
    users[targetUser].requests.push(me.user);
    store.setUsers(users);
    alert('BAM! Friend request sent!');
    renderSidebarMenu();
}

function acceptFriendRequest(senderUser) {
    let users = store.getUsers();
    let me = store.getCurrentUser();
    
    users[me.user].requests = users[me.user].requests.filter(u => u !== senderUser);
    users[me.user].friends.push(senderUser);
    users[senderUser].friends.push(me.user);
    
    users[me.user].streaks = users[me.user].streaks || {};
    users[me.user].streaks[senderUser] = { count: 1, lastUpdated: new Date().getTime() };
    
    store.setUsers(users);
    store.setCurrentUser(users[me.user]);
    renderSidebarMenu();
}

function logout() {
    const me = store.getCurrentUser();
    if(me) changeOnlineStatus(me.user, 'offline');
    store.setCurrentUser(null);
    window.location.reload();
}

// ====== SNAPCHAT FILTER CAMERA MECHANICS ======
async function openCamera() { 
    document.getElementById('camera-modal').style.display = 'flex'; 
    const video = document.getElementById('camera-stream');
    applyFilter('filter-normal');
    try {
        mediaStreamInstance = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = mediaStreamInstance;
    } catch (err) {
        console.warn("Camera hardware unaccessible. Running fallback visual renderer.");
    }
}

function closeCamera() { 
    if (mediaStreamInstance) mediaStreamInstance.getTracks().forEach(t => t.stop());
    document.getElementById('camera-modal').style.display = 'none'; 
}

function applyFilter(f) { 
    selectedFilterClass = f; 
    const video = document.getElementById('camera-stream');
    if(video) { video.className = ""; video.classList.add(f); }
}

function captureAndSendPhoto() {
    let dataUrl = "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100'><rect width='100%' height='100%' fill='%235865f2'/></svg>";
    const video = document.getElementById('camera-stream');
    if(video && video.srcObject) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg');
    }
    const me = store.getCurrentUser();
    const newMsg = { id: 'img_' + Date.now(), type: currentActiveChatType, sender: me.user, img: dataUrl, filter: selectedFilterClass, timestamp: new Date().getTime() };
    if(currentActiveChatType === 'dm') { newMsg.receiver = currentActiveChatId; } else { newMsg.serverId = currentActiveChatId; }
    store.addMessage(newMsg);
    closeCamera();
    triggerPingSound();
    renderDesktopMessages();
}

// ====== WHATSAPP CORE AUDIO PING ENGINE ======
function triggerPingSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // High pitch notification D5 note
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch(e) {
        console.warn("Audio Context blocked by browser permission window.");
    }
}

// Initial Boot Logic Verification Verification Loop
if(store.getCurrentUser()) {
    document.getElementById('auth-wall').classList.add('hidden');
    changeOnlineStatus(store.getCurrentUser().user, 'online');
    renderSidebarMenu();
}
