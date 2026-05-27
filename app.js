    const me = store.getCurrentUser();
    const newMsg = {
        id: 'msg_' + Date.now(),
        type: currentActiveChatType,
        sender: me.user,
        text: txt,
        timestamp: new Date().getTime()
    };

    if(currentActiveChatType === 'dm') {
        newMsg.receiver = currentActiveChatId;
        updateStreakAction(me.user, currentActiveChatId);
    } else {
        newMsg.serverId = currentActiveChatId;
    }

    store.addMessage(newMsg);
    input.value = "";
    renderMessages();
}

function updateStreakAction(sender, receiver) {
    let users = store.getUsers();
    if(users[sender].streaks && users[sender].streaks[receiver]) {
        users[sender].streaks[receiver].count += 1;
        users[sender].streaks[receiver].lastUpdated = new Date().getTime();
        store.setUsers(users);
    }
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
        console.warn("Camera hardware inaccessible. Running fallback visual simulator.");
    }
}
function closeCamera() {
    if (mediaStreamInstance) {
        mediaStreamInstance.getTracks().forEach(track => track.stop());
    }
    document.getElementById('camera-modal').style.display = 'none';
}

function applyFilter(filterClass) {
    selectedFilterClass = filterClass;
    const video = document.getElementById('camera-stream');
    video.className = "";
    video.classList.add(filterClass);
}

function captureAndSendPhoto() {
    let dataUrl = "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%23ff4757'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-size='10'>📷 Class Photo</text></svg>";
    
    const video = document.getElementById('camera-stream');
    if(video.srcObject) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg');
    }

    const me = store.getCurrentUser();
    const newMsg = {
        id: 'img_' + Date.now(),
        type: currentActiveChatType,
        sender: me.user,
        img: dataUrl,
        filter: selectedFilterClass,
        timestamp: new Date().getTime()
    };

    if(currentActiveChatType === 'dm') {
        newMsg.receiver = currentActiveChatId;
        updateStreakAction(me.user, currentActiveChatId);
    } else {
        newMsg.serverId = currentActiveChatId;
    }

    store.addMessage(newMsg);
    closeCamera();
    renderMessages();
}

if(store.getCurrentUser()) {
    navigateTo('screen-main');
}
