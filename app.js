const video = document.getElementById('viewfinder');
const canvas = document.getElementById('photoCanvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const oCtx = overlayCanvas.getContext('2d');
const shutterBtn = document.getElementById('shutter-btn');
const textContainer = document.getElementById('text-container');
const textInput = document.getElementById('snap-text');
const cameraZone = document.getElementById('camera-click-zone');

let activeFilter = 'none';
let currentText = "";

// Pre-load transparent vector graphic filters instead of emojis
const filterAssets = {
    unicorn: new Image(),
    halo: new Image(),
    glasses: new Image()
};
filterAssets.unicorn.src = "https://imgur.com"; 
filterAssets.halo.src = "https://imgur.com";    
filterAssets.glasses.src = "https://imgur.com"; 

// LIGHTWEIGHT CAMERA STREAM ENGINE
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }, 
            audio: false 
        });
        video.srcObject = stream;
        
        // Triggers filter loops immediately as the stream metadata locks in
        video.addEventListener('loadedmetadata', () => {
            syncCanvasDimensions();
            renderFilterLoop();
        });
    } catch (err) {
        alert("Camera block detected! Click the lock icon in your browser search bar to allow camera access.");
    }
}

function syncCanvasDimensions() {
    overlayCanvas.width = video.videoWidth || 640;
    overlayCanvas.height = video.videoHeight || 480;
}

window.applyCherryFilter = function(filterType, event) {
    if (event) event.stopPropagation();
    activeFilter = filterType;
    document.querySelectorAll('.filter-selector button').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`btn-${filterType}`);
    if (targetBtn) targetBtn.classList.add('active');
}

// Click camera area to open typing input field
cameraZone.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
    if (textContainer.style.display === 'none' || textContainer.style.display === '') {
        textContainer.style.display = 'flex';
        textInput.focus();
    } else if (textInput.value.trim() === "") {
        textContainer.style.display = 'none';
    }
});

textInput.addEventListener('input', () => { currentText = textInput.value; });
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        textInput.blur();
        if (currentText.trim() === "") textContainer.style.display = 'none';
    }
});

// FASTER COMPUTE RENDER PIPELINE
function renderFilterLoop() {
    oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Draw the raw camera feed onto the screen first
    oCtx.drawImage(video, 0, 0, overlayCanvas.width, overlayCanvas.height);

    // Overlay fixed clean transparent assets over the stream frame center
    if (activeFilter !== 'none') {
        const img = filterAssets[activeFilter];
        if (img && img.complete) {
            let w, h, x, y;
            
            if (activeFilter === 'unicorn') {
                w = overlayCanvas.width * 0.25;
                h = w * (img.height / img.width);
                x = (overlayCanvas.width / 2) - (w / 2);
                y = overlayCanvas.height * 0.08; // Placed perfectly on head
            } else if (activeFilter === 'halo') {
                w = overlayCanvas.width * 0.40;
                h = w * (img.height / img.width);
                x = (overlayCanvas.width / 2) - (w / 2);
                y = overlayCanvas.height * -0.02; // Floats right over skull ceiling
            } else if (activeFilter === 'glasses') {
                w = overlayCanvas.width * 0.45;
                h = w * (img.height / img.width);
                x = (overlayCanvas.width / 2) - (w / 2);
                y = overlayCanvas.height * 0.30; // Aligned down near eye level
            }
            
            oCtx.drawImage(img, x, y, w, h);
        }
    }

    // Render locked typing text banner lines cleanly down screen bounds
    if (currentText.trim() !== "") {
        oCtx.fillStyle = "rgba(0, 0, 0, 0.6)";
        oCtx.fillRect(0, overlayCanvas.height * 0.65, overlayCanvas.width, overlayCanvas.height * 0.08);
        oCtx.fillStyle = "white";
        oCtx.font = `bold ${overlayCanvas.width * 0.04}px sans-serif`;
        oCtx.textAlign = "center";
        oCtx.textBaseline = "middle";
        oCtx.fillText(currentText, overlayCanvas.width / 2, overlayCanvas.height * 0.69);
    }

    requestAnimationFrame(renderFilterLoop);
}

// Download Button Capture
shutterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const ctx = canvas.getContext('2d');
    canvas.width = overlayCanvas.width;
    canvas.height = overlayCanvas.height;
    
    // Captures everything on the layout instantly
    ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
    
    const snapImage = canvas.toDataURL('image/jpeg', 0.95);
    const downloadLink = document.createElement('a');
    downloadLink.href = snapImage;
    downloadLink.download = `cherrychat_snap.jpg`;
    downloadLink.click();
});

startCamera();
