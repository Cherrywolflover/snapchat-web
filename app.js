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

// Pre-load clean transparent PNG graphic filters instead of text emojis
const filterAssets = {
    unicorn: new Image(),
    halo: new Image(),
    glasses: new Image()
};

// Open-source direct asset graphic URLs
filterAssets.unicorn.src = "https://imgur.com"; // Transparent Unicorn Horn Art
filterAssets.halo.src = "https://imgur.com";    // Transparent Angel Halo Art
filterAssets.glasses.src = "https://imgur.com"; // Transparent Cool Glasses Art

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }, 
            audio: false 
        });
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', drawOverlayLoop);
    } catch (err) {
        console.error("Camera source fetch failure.", err);
    }
}

// Controls filter switching row highlights
window.applyCherryFilter = function(filterType) {
    activeFilter = filterType;
    document.querySelectorAll('.filter-selector button').forEach(btn => btn.classList.remove('active'));
    
    const targetBtn = document.getElementById(`btn-${filterType}`);
    if (targetBtn) targetBtn.classList.add('active');
}

// Click camera viewport container to toggle input typing engine text strip
if (cameraZone) {
    cameraZone.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        
        if (textContainer.style.display === 'none' || textContainer.style.display === '') {
            textContainer.style.display = 'flex';
            textInput.focus();
        } else if (textInput.value.trim() === "") {
            textContainer.style.display = 'none';
        }
    });
}

// Watch input typing updates
textInput.addEventListener('input', () => {
    currentText = textInput.value;
});

// Close field instantly upon pressing Enter key
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        textInput.blur();
        if (currentText.trim() === "") textContainer.style.display = 'none';
    }
});

// Seamless graphic frame overlay generation loops
function drawOverlayLoop() {
    if (overlayCanvas.width !== video.videoWidth) {
        overlayCanvas.width = video.videoWidth || 640;
        overlayCanvas.height = video.videoHeight || 480;
    }

    oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Render selected clean graphic overlays on target positions
    if (activeFilter !== 'none') {
        const img = filterAssets[activeFilter];
        if (img && img.complete) {
            let w, h, x, y;
            
            if (activeFilter === 'unicorn') {
                w = overlayCanvas.width * 0.22;
                h = w * (img.height / img.width);
                x = (overlayCanvas.width / 2) - (w / 2);
                y = overlayCanvas.height * 0.18; // High forehead placement
            } else if (activeFilter === 'halo') {
                w = overlayCanvas.width * 0.35;
                h = w * (img.height / img.width);
                x = (overlayCanvas.width / 2) - (w / 2);
                y = overlayCanvas.height * 0.05; // Above skull ceiling
            } else if (activeFilter === 'glasses') {
                w = overlayCanvas.width * 0.40;
                h = w * (img.height / img.width);
                x = (overlayCanvas.width / 2) - (w / 2);
                y = overlayCanvas.height * 0.38; // Eye horizon zone mapping
            }
            
            oCtx.drawImage(img, x, y, w, h);
        }
    }

    // Render locked typing text banner lines cleanly down screen bounds
    if (currentText.trim() !== "") {
        oCtx.fillStyle = "rgba(0, 0, 0, 0.6)";
        oCtx.fillRect(0, overlayCanvas.height * 0.65, overlayCanvas.width, overlayCanvas.height * 0.08);
        
        oCtx.fillStyle = "white";
        oCtx.font = `bold ${overlayCanvas.width * 0.038}px sans-serif`;
        oCtx.textAlign = "center";
        oCtx.textBaseline = "middle";
        oCtx.fillText(currentText, overlayCanvas.width / 2, overlayCanvas.height * 0.69);
    }

    requestAnimationFrame(drawOverlayLoop);
}

// Bakes matching high-res graphics and current state variables into the output download
shutterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
    
    const snapImage = canvas.toDataURL('image/jpeg', 0.95);
    const downloadLink = document.createElement('a');
    downloadLink.href = snapImage;
    downloadLink.download = `cherrychat_${Date.now()}.jpg`;
    downloadLink.click();
});

startCamera();
