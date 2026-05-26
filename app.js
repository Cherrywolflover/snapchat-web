const video = document.getElementById('viewfinder');
const canvas = document.getElementById('photoCanvas');
const shutterBtn = document.getElementById('shutter-btn');

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = stream;
    } catch (err) {
        alert("Please allow camera access to use your Snapchat app!");
    }
}

shutterBtn.addEventListener('click', () => {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const snapImage = canvas.toDataURL('image/jpeg');
    const downloadLink = document.createElement('a');
    downloadLink.href = snapImage;
    downloadLink.download = `snap_${Date.now()}.jpg`;
    downloadLink.click();
});

startCamera();
