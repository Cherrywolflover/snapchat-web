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
let lastResults = null;

// High-quality graphic assets
const filterAssets = {
    unicorn: new Image(),
    halo: new Image(),
    glasses: new Image()
};
filterAssets.unicorn.src = "https://imgur.com"; 
filterAssets.halo.src = "https://imgur.com";    
filterAssets.glasses.src = "https://imgur.com"; 

// Active option switcher
window.applyCherryFilter = function(filterType, event) {
    if (event) event.stopPropagation();
    activeFilter = filterType;
    document.querySelectorAll('.filter-selector button').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`btn-${filterType}`);
    if (targetBtn) targetBtn.classList.add('active');
}

// Click to type text toggles
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

// Primary AI rendering loop pipeline
function onResults(results) {
    lastResults = results;
    
    // Auto-sync scaling constraints
    if (overlayCanvas.width !== cameraZone.clientWidth) {
        overlayCanvas.width = cameraZone.clientWidth;
        overlayCanvas.height = cameraZone.clientHeight;
    }

    oCtx.save();
    oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Draw base camera feedback layer
    if (results.image) {
        oCtx.drawImage(results.image, 0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    // Process face landmarks to stick elements onto you
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0 && activeFilter !== 'none') {
        const landmarks = results.multiFaceLandmarks[0];
        const img = filterAssets[activeFilter];

        if (img && img.complete) {
            // Landmark points mapping: Forehead is #10, Eye horizon center is #168
            const targetPoint = (activeFilter === 'glasses') ? landmarks[168] : landmarks[10];
            const x = targetPoint.x * overlayCanvas.width;
            const y = targetPoint.y * overlayCanvas.height;

            // Measure face size to scale filters automatically
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const faceWidth = Math.hypot((leftEye.x - rightEye.x) * overlayCanvas.width, (leftEye.y - rightEye.y) * overlayCanvas.height);
            
            // Calculate tilt angle of your head
            const angle = Math.atan2((rightEye.y - leftEye.y) * overlayCanvas.height, (rightEye.x - leftEye.x) * overlayCanvas.width);

            oCtx.translate(x, y);
            oCtx.rotate(angle);

            let w, h, xOff, yOff;
            if (activeFilter === 'unicorn') {
                w = faceWidth * 0.6;
                h = w * (img.height / img.width);
                xOff = -w / 2;
                yOff = -h * 0.95; // Pushes horn straight up onto forehead
            } else if (activeFilter === 'halo') {
                w = faceWidth * 1.1;
                h = w * (img.height / img.width);
                xOff = -w / 2;
                yOff = -h * 1.4;  // Pushes halo floating above head
            } else if (activeFilter === 'glasses') {
                w = faceWidth * 1.2;
                h = w * (img.height / img.width);
                xOff = -w / 2;
                yOff = -h / 2;    // Centers sunglasses right on your eyes
            }

            oCtx.drawImage(img, xOff, yOff, w, h);
            oCtx.restore();
        }
    } else {
        oCtx.restore();
    }

    // Draw customizable text block strip
    if (currentText.trim() !== "") {
        oCtx.fillStyle = "rgba(0, 0, 0, 0.6)";
        oCtx.fillRect(0, overlayCanvas.height * 0.65, overlayCanvas.width, overlayCanvas.height * 0.08);
        oCtx.fillStyle = "white";
        oCtx.font = `bold ${overlayCanvas.width * 0.04}px sans-serif`;
        oCtx.textAlign = "center";
        oCtx.textBaseline = "middle";
        oCtx.fillText(currentText, overlayCanvas.width / 2, overlayCanvas.height * 0.69);
    }
}

// Instantiate the heavy FaceMesh engine configuration model safely
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://jsdelivr.net{file}`
});
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: false, // Turned off tracking points down to 468 to save speed bandwidth
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

// Setup the camera stream frame sender engine
const camera = new Camera(video, {
    onFrame: async () => {
        await faceMesh.send({ image: video });
    },
    width: 640,
    height: 480
});
camera.start().catch(err => console.log("AI camera initiation error.", err));

// Download button capture script path logic
shutterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const ctx = canvas.getContext('2d');
    canvas.width = overlayCanvas.width;
    canvas.height = overlayCanvas.height;
    
    // Captures the complete compiled frame with AI edits intact
    ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
    
    const snapImage = canvas.toDataURL('image/jpeg', 0.95);
    const downloadLink = document.createElement('a');
    downloadLink.href = snapImage;
    downloadLink.download = `cherrychat_snap_${Date.now()}.jpg`;
    downloadLink.click();
});
