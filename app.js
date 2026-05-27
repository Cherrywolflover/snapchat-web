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
let tempEmail = "";

function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if(screenId === 'screen-main') renderDashboard();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

function handleEmailSubmit() {
    const email = document.getElementById('reg-email').value.trim();
    if(!email) return alert('Enter your school email.');
    tempEmail = email;
    navigateTo('screen-code');
}

function handleCodeSubmit() {
    const code = document.getElementById('reg-code').value.trim();
    if(code.length < 4) return alert('Enter valid 4 digit code.');
    navigateTo('screen-profile');
}

function handleProfileSubmit() {
    const name = document.getElementById('reg-name').value.trim();
    const user = document.getElementById('reg-user').value.trim().toLowerCase();
    if(!name || !user) return alert('Fill out all fields.');
    
    let users = store.getUsers();
    if(users[user]) return alert('Username already exists!');
    
    const newUser = { name, user, email: tempEmail, friends: [], requests: [], streaks: {} };
    users[user] = newUser;
    store.setUsers(users);
    store.setCurrentUser(newUser);
    navigateTo('screen-main');
}

function logout() {
    store.setCurrentUser(null);
    navigateTo('screen-email');
}

function sendFriendRequest() {
    const targetUser = document.getElementById('search-friend-username').value.trim().toLowerCase();
    const me = store.getCurrentUser();
    let users = store.getUsers();
    if(!users[targetUser]) return alert('Classmate not found.');
    if(targetUser === me.user) return alert("You cannot friend yourself.");
    users[targetUser].requests.push(me.user);
    store.setUsers(users);
    alert(`BAM! Request sent to @${targetUser}`);
    renderDashboard();
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
    renderDashboard();
}

function createServer() {
    const name = document.getElementById('new-server-name').value.trim();
    if(!name) return;
    let servers = store.getServers();
    servers.push({ id: 'srv_' + Date.now(), name: "🌐 " + name, channels: ["general"] });
    store.setServers(servers);
    renderDashboard();
}

function renderDashboard() {
    const me = store.getCurrentUser();
    if(!me) return navigateTo('screen-email');
    document.getElementById('display-username').innerText = `@${me.user}`;
}

function sendTextMessage() {
    const input = document.getElementById('chat-inline-input');
    const txt = input.value.trim();
    if(!txt) return;
    input.value = "";
}

async function openCamera() {
    document.getElementById('camera-modal').style.display = 'flex';
}

function closeCamera() {
    document.getElementById('camera-modal').style.display = 'none';
}

function applyFilter(f) {}
function captureAndSendPhoto() { closeCamera(); }

if(store.getCurrentUser()) {
    navigateTo('screen-main');
}
