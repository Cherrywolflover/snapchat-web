// ====== CHERRYCHAT UNIFIED CORE ENGINE ======
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

// Seed Dummy Data
(function seedData() {
    let users = store.getUsers();
    if (Object.keys(users).length === 0) {
        users = {
            "alex99": { name: "Alex Rivers", user: "alex99", status: "online", friends: [], requests: [] },
            "emma_k": { name: "Emma Knight", user: "emma_k", status: "offline", friends: [], requests: [] },
            "sam_b": { name: "Sam Barnes", user: "sam_b", status: "online", friends: [], requests: [] }
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
let currentActiveChatType = 'dm';
let activeSidebarContext = 'chats'; 
let mediaStreamInstance = null;
let selectedFilterClass = 'filter-normal';

// FIXED: Added Online Status Handler
function changeOnlineStatus(username, status) {
    let users = store.getUsers();
    if (users[username]) {
        users[username].status = status;
        store.setUsers(users);
    }
    const indicator = document.getElementById('status-indicator');
    if (indicator) indicator.style.background = status === 'online' ? '#23a55a' : '#747f8d';
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
    if(!name || !user) return alert('Please fill out fields.');
    
    let users = store.getUsers();
    if(users[user]) return alert('Username taken!');
    
    const newUser = { name, user, status: "online", friends: [], requests: [], streaks: {} };
    users[user] = newUser;
    store.setUsers(users);
    store.setCurrentUser(newUser);
    
    document.getElementById('auth-wall').classList.add('hidden');
    changeOnlineStatus(user, 'online');
    renderSidebarMenu();
}

function handleLoginSubmit() {
    const user = document.getElementById('login-user').value.trim().toLowerCase();
    if(!user) return alert('Enter username.');
    
    let users = store.getUsers();
    if(!users[user]) return alert('User not found!');
    
    store.setCurrentUser(users[user]);
    document.getElementById('auth-wall').classList.add('hidden');
    changeOnlineStatus(user, 'online');
    renderSidebarMenu();
}

function switchNavContext(context) {
    activeSidebarContext = context;
    document.querySelectorAll('.server-icon').forEach(el => el.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
    renderSidebarMenu();
}

// FIXED: Added complete clean Sidebar Renderer
function renderSidebarMenu() {
    const me = store.getCurrentUser();
    if(!me) return;
    
    document.getElementById('display-username').innerText = `@${me.user}`;
    const targetBox = document.getElementById('middle-sidebar-content');
    if(!targetBox) return;
    const globalUsers = store.getUsers();
    const realMe = globalUsers[me.user] || me;
    
    if(activeSidebarContext === 'chats') {
        targetBox.innerHTML = `<div class="list-section-title">Direct Messages</div>`;
        (realMe.friends || []).forEach(f => {
            const statusColor = globalUsers[f]?.status === 'online' ? '#23a55a' : '#747f8d';
            targetBox.innerHTML += `
                <div class="list-row ${currentActiveChatId === f ? 'active' : ''}" onclick="openDesktopChat('${f}', 'dm')">
                    <div class="row-left">
                        <div class="row-avatar" style="border: 2px solid ${statusColor}">${f.substring(0,2).toUpperCase()}</div>
                        <span>@${f}</span>
                    </div>
                </div>`;
        });
    } else if (activeSidebarContext === 'servers') {
        targetBox.innerHTML = `<div class="list-section-title">Text Channels</div>`;
        store.getServers().forEach(s => {
            targetBox.innerHTML += `
                <div class="list-row ${currentActiveChatId === s.id ? 'active' : ''}" onclick="openDesktopChat('${s.id}', 'server')">
                    <div class="row-left"><span>#</span> <strong>${s.name}</strong></div>
                </div>`;
        });
    } else if (activeSidebarContext === 'actions') {
        targetBox.innerHTML = `
            <div class="dashboard-actions-view">
                <div class="list-section-title">Add Friend</div>
                <input type="text" id="search-friend-username" placeholder="Enter user..." style="padding:8px; border-radius:4px; border:none; background:#1e1f22; color:white; width:100%;">
                <button onclick="sendFriendRequest()" style="padding:8px; margin-top:8px;">Add</button>
                <div class="list-section-title" style="margin-top:15px;">Pending</div>
                <div id="pending-box"></div>
            </div>`;
        
        const pb = document.getElementById('pending-box');
        if(pb) {
            (realMe.requests || []).forEach(r => {
                pb.innerHTML += `<div style="display:flex; justify-content:space-between; margin-top:4px;"><span>@${r}</span><button onclick="acceptFriendRequest('${r}')">Accept</button></div>`;
            });
        }
    }
}

function openDesktopChat(id, type) {
    currentActiveChatId = id;
    currentActiveChatType = type;
    document.getElementById('chat-input-container').style.display = 'flex';
    document.getElementById('chat-title').innerText = type === 'dm' ? `@${id}` : "Server Channel";
    renderSidebarMenu();
    renderDesktopMessages();
}

function renderDesktopMessages() {
    const container = document.getElementById('chat-messages-container');
    if(!container) return;
    container.innerHTML = "";
    const me = store.getCurrentUser();
    const filtered = store.getMessages().filter(m => {
        if(currentActiveChatType === 'dm') {
            return (m.type === 'dm' && ((m.sender === me.user && m.receiver === currentActiveChatId) || (m.sender === currentActiveChatId && m.receiver === me.user)));
        } else {
            return (m.type === 'server' && m.serverId === currentActiveChatId);
        }
    });

    filtered.forEach(m => {
        container.innerHTML += `<div class="msg"><strong>@${m.sender}</strong><div>${m.text || ''}</div></div>`;
    });
    container.scrollTop = container.scrollHeight;
}

function sendTextMessage() {
    const input = document.getElementById('chat-inline-input');
    const txt = input.value.trim();
    if(!txt) return;

    const me = store.getCurrentUser();
    const newMsg = { id: 'msg_' + Date.now(), type: currentActiveChatType, sender: me.user, text: txt };
    if(currentActiveChatType === 'dm') { newMsg.receiver = currentActiveChatId; } else { newMsg.serverId = currentActiveChatId; }

    store.addMessage(newMsg);
    input.value = "";
    triggerPingSound();
    renderDesktopMessages();
}

function sendFriendRequest() {
    const targetUser = document.getElementById('search-friend-username').value.trim().toLowerCase();
    const me = store.getCurrentUser();
    let users = store.getUsers();
    if(!users[targetUser] || targetUser === me.user) return alert('Invalid User');
    users[targetUser].requests.push(me.user);
    store.setUsers(users);
    alert('Sent!');
    renderSidebarMenu();
}

function acceptFriendRequest(senderUser) {
    let users = store.getUsers();
    let me = store.getCurrentUser();
    users[me.user].requests = users[me.user].requests.filter(u => u !== senderUser);
    users[me.user].friends.push(senderUser);
    users[senderUser].friends.push(me.user);
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

function triggerPingSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } catch(e) {}
}

async function openCamera() {}
function closeCamera() {}
function applyFilter(f) {}
function captureAndSendPhoto() {}

if(store.getCurrentUser()) {
    document.getElementById('auth-wall').classList.add('hidden');
changeOnlineStatus(store.getCurrentUser().user, 'online');
    renderSidebarMenu();
    }
