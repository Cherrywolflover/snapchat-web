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

const filterAssets = {
    unicorn: new Image(),
    halo: new Image(),
    glasses: new Image()
};
filterAssets.unicorn.src = "https://imgur.com"; 
filterAssets.halo.src = "https://imgur.com";    
filterAssets.glasses.src = "https://imgur.com"; 

window.applyCherryFilter = function(filterType, event) {
    if (event) event.stopPropagation();
    activeFilter = filterType;
    document.querySelectorAll('.filter-selector button').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`btn-${filterType}`);
    if (targetBtn) targetBtn.classList.add('active');
}

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

function onResults(results) {
    if (overlayCanvas.width !== cameraZone.clientWidth) {
        overlayCanvas.width = cameraZone.clientWidth;
        overlayCanvas.height = cameraZone.clientHeight;
    }

    oCtx.save();
    oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    if (results.image) {
        oCtx.drawImage(results.image, 0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0 && activeFilter !== 'none') {
        const landmarks = results.multiFaceLandmarks[0];
        const img = filterAssets[activeFilter];

        if (img && img.complete) {
            const targetPoint = (activeFilter === 'glasses') ? landmarks[168] : landmarks[10];
            const x = targetPoint.x * overlayCanvas.width;
            const y = targetPoint.y * overlayCanvas.height;

            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const faceWidth = Math.hypot((leftEye.x - rightEye.x) * overlayCanvas.width, (leftEye.y - rightEye.y) * overlayCanvas.height);
            const angle = Math.atan2((rightEye.y - leftEye.y) * overlayCanvas.height, (rightEye.x - leftEye.x) * overlayCanvas.width);

            oCtx.translate(x, y);
            oCtx.rotate(angle);

            let w, h, xOff, yOff;
            if (activeFilter === 'unicorn') {
                w = faceWidth * 0.6;
                h = w * (img.height / img.width);
                xOff = -w / 2;
                yOff = -h * 0.95;
            } else if (activeFilter === 'halo') {
                w = faceWidth * 1.1;
                h = w * (img.height / img.width);
                xOff = -w / 2;
                yOff = -h * 1.4;
            } else if (activeFilter === 'glasses') {
                w = faceWidth * 1.2;
                h = w * (img.height / img.width);
                xOff = -w / 2;
                yOff = -h / 2;
            }

            oCtx.drawImage(img, xOff, yOff, w, h);
            oCtx.restore();
        }
    } else {
        oCtx.restore();
    }

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

const faceMesh = new FaceMesh({
    locateFile: (file) => `https://jsdelivr.net{file}`
});
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

const camera = new Camera(video, {
    onFrame: async () => {
        await faceMesh.send({ image: video });
    },
    width: 640,
    height: 480
});
camera.start().catch(err => console.log("Camera failed.", err));

shutterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const ctx = canvas.getContext('2d');
    canvas.width = overlayCanvas.width;
    canvas.height = overlayCanvas.height;
    ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
    const snapImage = canvas.toDataURL('image/jpeg', 0.95);
    const downloadLink = document.createElement('a');
    downloadLink.href = snapImage;
    downloadLink.download = `cherrychat_snap_${Date.now()}.jpg`;
    downloadLink.click();
});

