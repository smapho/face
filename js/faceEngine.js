const MODEL_URL = "models";

let modelsLoaded = false;

async function loadFaceModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 480, height: 360, facingMode: "user" },
    audio: false,
  });
  videoEl.srcObject = stream;
  await new Promise((resolve) => (videoEl.onloadedmetadata = resolve));
  videoEl.play();
  return stream;
}

function stopCamera(stream) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function detectSingleFaceDescriptor(videoEl) {
  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection || null;
}

function findBestMatch(descriptor, employees, threshold) {
  let best = null;
  let bestDistance = Infinity;
  for (const emp of employees) {
    const distance = faceapi.euclideanDistance(descriptor, emp.descriptor);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = emp;
    }
  }
  if (best && bestDistance <= threshold) {
    return { employee: best, distance: bestDistance };
  }
  return null;
}
