const video = document.getElementById('viewfinder');
const canvas = document.getElementById('photoCanvas');
const graphicOverlay = document.getElementById('filter-graphic-overlay');
const shutterBtn = document.getElementById('shutter-btn');
const textInput = document.getElementById('snap-text');

let activeEmoji = "";

// Starts standard camera input cleanly inside the box layout area
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }, 
            audio: false 
        });
        video.srcObject = stream;
    } catch (err) {
        console.log("Camera block error: ", err);
    }
}

// Switches filters instantly when button is clicked
window.applySnapFilter = function(type) {
    document.querySelectorAll('.filter-selector button').forEach(btn => btn.classList.remove('active'));
    
    // Highlights the active button
    if(window.event && window.event.target) {
        window.event.target.classList.add('active');
    }

    if (type === 'unicorn') activeEmoji = "🦄";
    else if (type === 'halo') activeEmoji = "😇";
    else if (type === 'glasses') activeEmoji = "😎";
    else if (type === 'dog') activeEmoji = "🐶";
    else if (type === 'cat') activeEmoji = "🐱";
    else activeEmoji = "";

    graphicOverlay.innerText = activeEmoji;
}

// Snaps picture, adds filters/text, and auto-downloads
shutterBtn.addEventListener('click', () => {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    if (activeEmoji !== "") {
        ctx.font = `${canvas.width * 0.25}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(activeEmoji, canvas.width / 2, canvas.height / 2);
    }

    if (textInput.value.trim() !== "") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, canvas.height * 0.46, canvas.width, canvas.height * 0.08);
        
        ctx.fillStyle = "white";
        ctx.font = `bold ${canvas.width * 0.04}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(textInput.value, canvas.width / 2, canvas.height * 0.5);
    }
    
    const snapImage = canvas.toDataURL('image/jpeg', 0.95);
    const downloadLink = document.createElement('a');
    downloadLink.href = snapImage;
    downloadLink.download = `cherrychat_snap.jpg`;
    downloadLink.click();
});

startCamera();
