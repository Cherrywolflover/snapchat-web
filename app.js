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

(function seedData() {
    let users = store.getUsers();
    if (Object.keys(users).length === 0) {
        users = {
            "alex99": { name: "Alex Rivers", user: "alex99", friends: [], requests: [] },
            "emma_k": { name: "Emma Knight", user: "emma_k", friends: [], requests: [] },
            "sam_b": { name: "Sam Barnes", user: "sam_b", friends: [], requests: [] }
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
let selectedFilterClass = 'filter-normal';
let mediaStreamInstance = null;

function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if(screenId === 'screen-main') renderDashboard();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

function handleProfileSubmit() {
    const name = document.getElementById('reg-name').value.trim();
    const user = document.getElementById('reg-user').value.trim().toLowerCase();
    if(!name || !user) return alert('Fill out all fields.');
    
    let users = store.getUsers();
    if(users[user]) return alert('Username already exists!');
    
    const newUser = { name, user, email: 'instant@school.com', friends: [], requests: [], streaks: {} };
    users[user] = newUser;
    store.setUsers(users);
    store.setCurrentUser(newUser);
    navigateTo('screen-main');
}

function logout() {
    store.setCurrentUser(null);
    navigateTo('screen-profile');
}
function sendFriendRequest() {
    const targetUser = document.getElementById('search-friend-username').value.trim().toLowerCase();
    const me = store.getCurrentUser();
    let users = store.getUsers();
    
    if(!users[targetUser]) return alert('Classmate not found in system directory.');
    if(targetUser === me.user) return alert("You cannot friend yourself.");
    if(users[targetUser].requests.includes(me.user) || users[targetUser].friends.includes(me.user)) {
        return alert('Request already pending or user is already a friend.');
    }
    
    users[targetUser].requests.push(me.user);
    store.setUsers(users);
    alert(`BAM! Friend request sent to @${targetUser}`);
    document.getElementById('search-friend-username').value = "";
    renderDashboard();
}

function acceptFriendRequest(senderUser) {
    let users = store.getUsers();
    let me = store.getCurrentUser();
    
    users[me.user].requests = users[me.user].requests.filter(u => u !== senderUser);
    if(!users[me.user].friends.includes(senderUser)) users[me.user].friends.push(senderUser);
    if(!users[senderUser].friends.includes(me.user)) users[senderUser].friends.push(me.user);
    
    if(!users[me.user].streaks) users[me.user].streaks = {};
    users[me.user].streaks[senderUser] = { count: 1, lastUpdated: new Date().getTime() };
    
    store.setUsers(users);
    store.setCurrentUser(users[me.user]);
    renderDashboard();
}

function createServer() {
    const name = document.getElementById('new-server-name').value.trim();
    if(!name) return;
    let servers = store.getServers();
    servers.push({ id: 'srv_' + Date.now(), name: "🌐 " + name, channels: ["general", "announcements"] });
    store.setServers(servers);
    document.getElementById('new-server-name').value = "";
    renderDashboard();
}

function renderDashboard() {
    const me = store.getCurrentUser();
    if(!me) return navigateTo('screen-profile');
    document.getElementById('display-username').innerText = `@${me.user}`;
    
    const globalUsers = store.getUsers();
    const realMe = globalUsers[me.user] || me;
    
    const pendingList = document.getElementById('pending-requests-list');
    if(pendingList) {
        pendingList.innerHTML = "";
        (realMe.requests || []).forEach(reqUser => {
            pendingList.innerHTML += `<div class="item-card"><span>@${reqUser}</span><button class="action-btn" onclick="acceptFriendRequest('${reqUser}')">Accept</button></div>`;
        });
    }
    
    const friendsList = document.getElementById('friends-list');
    if(friendsList) {
        friendsList.innerHTML = "";
        (realMe.friends || []).forEach(fUser => {
            const fData = globalUsers[fUser];
            const streakObj = (realMe.streaks && realMe.streaks[fUser]) ? realMe.streaks[fUser] : {count: 0};
            friendsList.innerHTML += `<div class="item-card" onclick="openChat('${fUser}', 'dm')"><div class="user-info"><div class="avatar">${fUser.toUpperCase().substring(0,2)}</div><div><div style="font-weight:600;">${fData ? fData.name : fUser}</div><div style="font-size:12px; color:var(--text-muted);">@${fUser}</div></div></div>${streakObj.count > 0 ? `🔥 ${streakObj.count}` : ''}</div>`;
        });
    }
    
    const activeChatsList = document.getElementById('active-chats-list');
    if(activeChatsList) {
        activeChatsList.innerHTML = (realMe.friends || []).length === 0 ? `<p style="color:var(--text-muted);text-align:center;margin-top:20px;">Go to the Friends tab to add classmates!</p>` : '';
        (realMe.friends || []).forEach(fUser => {
            const fData = globalUsers[fUser];
            const streakObj = (realMe.streaks && realMe.streaks[fUser]) ? realMe.streaks[fUser] : {count: 0};
            activeChatsList.innerHTML += `<div class="item-card" onclick="openChat('${fUser}', 'dm')"><div class="user-info"><div class="avatar" style="border: 2px solid var(--online);">${fUser.toUpperCase().substring(0,2)}</div><div><div style="font-weight:600;">${fData ? fData.name : fUser}</div><div style="font-size:12px; color:var(--online);">Tap to message</div></div></div>${streakObj.count > 0 ? `🔥 ${streakObj.count}` : ''}</div>`;
        });
    }
    
    const serversList = document.getElementById('servers-list');
    if(serversList) {
        serversList.innerHTML = "";
        store.getServers().forEach(srv => {
            serversList.innerHTML += `<div class="item-card" onclick="openChat('${srv.id}', 'server')" style="cursor:pointer;"><div><div style="font-weight:bold; font-size:16px;">${srv.name}</div><div style="font-size:12px; color:var(--text-muted); margin-top:4px;">#${srv.channels.join('  #')}</div></div><span style="color:var(--accent);">Join ➔</span></div>`;
        });
    }
}

function openChat(id, type) {
    currentActiveChatId = id;
    currentActiveChatType = type;
    navigateTo('screen-chat-view');
    const me = store.getCurrentUser();
    const globalUsers = store.getUsers();
    
    if(type === 'dm') {
        document.getElementById('chat-title').innerText = `@${id}`;
        const realMe = globalUsers[me.user];
        const streakObj = (realMe.streaks && realMe.streaks[id]) ? realMe.streaks[id] : null;
        document.getElementById('chat-streak-status').innerText = streakObj ? `🔥 ${streakObj.count}` : '';
    } else {
        const srv = store.getServers().find(s => s.id === id);
        document.getElementById('chat-title').innerText = srv ? srv.name : "Server Channel";
        document.getElementById('chat-streak-status').innerText = '';
    }
    renderMessages();
}

function backToMain() { navigateTo('screen-main'); }

function renderMessages() {
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

    filtered.forEach(m => {
        const direction = m.sender === me.user ? 'sent' : 'received';
        let contentStr = `<div><strong>${m.sender}</strong></div>`;
        if(m.text) contentStr += `<div>${m.text}</div>`;
        if(m.img) contentStr += `<img src="${m.img}" class="${m.filter || 'filter-normal'}"/>`;
        container.innerHTML += `<div class="msg ${direction}">${contentStr}</div>`;
    });
    container.scrollTop = container.scrollHeight;
}

function sendTextMessage() {
    const input = document.getElementById('chat-inline-input');
    const txt = input.value.trim();
    if(!txt) return;

    const me = store.getCurrentUser();
    const newMsg = { id: 'msg_' + Date.now(), type: currentActiveChatType, sender: me.user, text: txt, timestamp: new Date().getTime() };

    if(currentActiveChatType === 'dm') {
        newMsg.receiver = currentActiveChatId;
        let users = store.getUsers();
        if(users[me.user].streaks && users[me.user].streaks[currentActiveChatId]) {
            users[me.user].streaks[currentActiveChatId].count += 1;
            store.setUsers(users);
        }
    } else {
        newMsg.serverId = currentActiveChatId;
    }

    store.addMessage(newMsg);
    input.value = "";
    renderMessages();
}

async function openCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-stream');
    modal.style.display = 'flex';
    applyFilter('filter-normal');
    try {
        mediaStreamInstance = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = mediaStreamInstance;
    } catch (err) {
        console.warn("Camera hardware unaccessible.");
    }
}

function closeCamera() {
    if (mediaStreamInstance) mediaStreamInstance.getTracks().forEach(t => t.stop());
    document.getElementById('camera-modal').style.display = 'none';
}

function applyFilter(filterClass) {
    selectedFilterClass = filterClass;
    const video = document.getElementById('camera-stream');
    if(video) { video.className = ""; video.classList.add(filterClass); }
}

function captureAndSendPhoto() {
    let dataUrl = "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100'><rect width='100%' height='100%' fill='%23ff4757'/></svg>";
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
    renderMessages();
}

if(store.getCurrentUser()) { navigateTo('screen-main'); }
