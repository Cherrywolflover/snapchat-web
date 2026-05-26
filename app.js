const video = document.getElementById('viewfinder');
const canvas = document.getElementById('photoCanvas');
const shutterBtn = document.getElementById('shutter-btn');
const textInput = document.getElementById('snap-text');
const filterLabel = document.getElementById('filter-label');

// List of available filters
const filters = [
    { name: "Normal", class: "" },
    { name: "Black & White", class: "filter-bnw" },
    { name: "Vintage", class: "filter-vintage" },
    { name: "Neon", class: "filter-neon" },
    { name: "Warm Glow", class: "filter-warm" }
];
let currentFilterIndex = 0;

// 1. Start High-Quality 1080p HD Camera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "user",
                width: { ideal: 1920 },  // Force Full HD Width
                height: { ideal: 1080 }  // Force Full HD Height
            }, 
            audio: false 
        });
        video.srcObject = stream;
    } catch (err) {
        alert("Camera access denied. Please enable high-res camera access!");
    }
}

// 2. Filter Switching Logic
function applyFilter(index) {
    // Remove all old filter classes
    filters.forEach(f => { if(f.class) video.classList.remove(f.class); });
    
    currentFilterIndex = (index + filters.length) % filters.length;
    const nextFilter = filters[currentFilterIndex];
    
    if(nextFilter.class) video.classList.add(nextFilter.class);
    filterLabel.innerText = nextFilter.name;
}

// Listen for keyboard arrows on desktop to change filters
window.addEventListener('keydown', (e) => {
    if (document.activeElement === textInput) return; // Don't swap filters while typing
    if (e.key === 'ArrowRight') applyFilter(currentFilterIndex + 1);
    if (e.key === 'ArrowLeft') applyFilter(currentFilterIndex - 1);
});

// Mobile Swipe Detection
let touchStartX = 0;
window.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
window.addEventListener('touchend', e => {
    let touchEndX = e.changedTouches[0].screenX;
    if (document.activeElement === textInput) return;
    if (touchStartX - touchEndX > 50) applyFilter(currentFilterIndex + 1); // Swiped Left
    if (touchEndX - touchStartX > 50) applyFilter(currentFilterIndex - 1); // Swiped Right
});

// 3. Capture Photo with Baked Filters & Text
shutterBtn.addEventListener('click', () => {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Apply matching canvas CSS filters to look identical to live screen
    const currentFilter = filters[currentFilterIndex];
    if (currentFilter.name === "Black & White") ctx.filter = "grayscale(1)";
    else if (currentFilter.name === "Vintage") ctx.filter = "sepia(0.7) contrast(1.1)";
    else if (currentFilter.name === "Neon") ctx.filter = "hue-rotate(90deg) saturate(2)";
    else if (currentFilter.name === "Warm Glow") ctx.filter = "sepia(0.2) saturate(1.4)";
    else ctx.filter = "none";

    // Draw video frame onto canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Burn text overlay onto image if the user typed something
    if (textInput.value.trim() !== "") {
        ctx.filter = "none"; // Reset filter so text stays crisp white
        
        // Draw the translucent text bar background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, canvas.height * 0.45, canvas.width, canvas.height * 0.07);
        
        // Setup typography text settings scaled to high resolution
        ctx.fillStyle = "white";
        ctx.font = `bold ${canvas.width * 0.035}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Draw text characters right in center of the container bar
        ctx.fillText(textInput.value, canvas.width / 2, canvas.height * 0.485);
    }
    
    // Auto Download final photo asset
    const snapImage = canvas.toDataURL('image/jpeg', 0.95);
    const downloadLink = document.createElement('a');
    downloadLink.href = snapImage;
    downloadLink.download = `snap_pro_${Date.now()}.jpg`;
    downloadLink.click();
});

startCamera();
