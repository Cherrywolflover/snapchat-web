const video = document.getElementById('viewfinder');
const canvas = document.getElementById('arCanvas');
const ctx = canvas.getContext('2d');
const shutterBtn = document.getElementById('shutter-btn');
const textInput = document.getElementById('snap-text');

let activeFilter = 'none';

// Define assets using emoji strings rendered onto canvas
const filterAssets = {
    unicorn: { emoji: "🦄", offset: { x: 0, y: -0.6 }, sizeScale: 1.2, pointIndex: 10 },
    halo: { emoji: "😇", offset: { x: 0, y: -0.8 }, sizeScale: 1.5, pointIndex: 10 },
    glasses: { emoji: "😎", offset: { x: 0, y: 0.1 }, sizeScale: 1.1, pointIndex: 168 },
    dog: { emoji: "🐶", offset: { x: 0, y: -0.2 }, sizeScale: 1.6, pointIndex: 1 },
    cat: { emoji: "🐱", offset: { x: 0, y: -0.1 }, sizeScale: 1.5, pointIndex: 1 }
};

function changeARFilter(filterName) {
    activeFilter = filterName;
    document.querySelectorAll('.filter-selector button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// MediaPipe data collection pipeline 
function onResults(results) {
    // Sync canvas sizing configuration dynamically
    if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render the base camera image layer
    if (results.image) {
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    // Process face anchor positions
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0 && activeFilter !== 'none') {
        const landmarks = results.multiFaceLandmarks[0];
        const config = filterAssets[activeFilter];
        
        // Target structural landmark index mapping anchor
        const anchor = landmarks[config.pointIndex];
        const x = anchor.x * canvas.width;
        const y = anchor.y * canvas.height;

        // Estimate proportional scale tracking using width between eye corners
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const faceWidth = Math.hypot((leftEye.x - rightEye.x) * canvas.width, (leftEye.y - rightEye.y) * canvas.height);
        
        const assetSize = faceWidth * config.sizeScale;
        
        // Apply coordinate offset calibrations
        const drawX = x + (config.offset.x * assetSize);
        const drawY = y + (config.offset.y * assetSize);

        // Draw the decorative overlay 
        ctx.font = `${assetSize}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(config.emoji, drawX, drawY);
    }

    // Render text banner if user input exists
    if (textInput.value.trim() !== "") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, canvas.height * 0.45, canvas.width, canvas.height * 0.07);
        
        ctx.fillStyle = "white";
        ctx.font = `bold ${canvas.width * 0.04}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(textInput.value, canvas.width / 2, canvas.height * 0.485);
    }

    ctx.restore();
}

// Initialize MediaPipe FaceMesh engine configuration
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://jsdelivr.net{file}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

// Setup Camera capture engine pipeline
const camera = new Camera(video, {
    onFrame: async () => {
        await faceMesh.send({ image: video });
    },
    width: 1280,
    height: 720
});

camera.start().catch(err => alert("Camera configuration failure: " + err));

// Download button capture logic flow
shutterBtn.addEventListener('click', () => {
    const snapImage = canvas.toDataURL('image/jpeg', 0.95);
    const downloadLink = document.createElement('a');
    downloadLink.href = snapImage;
    downloadLink.download = `snap_ar_${Date.now()}.jpg`;
    downloadLink.click();
});
