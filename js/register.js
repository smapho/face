const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const nameInput = document.getElementById("nameInput");
const registerBtn = document.getElementById("registerBtn");
const statusEl = document.getElementById("status");

let cameraStream = null;

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status" + (type ? " " + type : "");
}

async function init() {
  try {
    await loadFaceModels();
    cameraStream = await startCamera(video);
    overlay.width = video.clientWidth;
    overlay.height = video.clientHeight;
    setStatus("顔をカメラの中央に映してください", "info");
    registerBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus("初期化に失敗しました: " + err.message, "error");
  }
}

registerBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  if (!name) {
    setStatus("氏名を入力してください", "error");
    return;
  }

  registerBtn.disabled = true;
  setStatus("顔を検出中です...", "info");

  const detection = await detectSingleFaceDescriptor(video);
  if (!detection) {
    setStatus("顔を検出できませんでした。カメラに顔を映してもう一度お試しください", "error");
    registerBtn.disabled = false;
    return;
  }

  const descriptor = Array.from(detection.descriptor);

  const { error } = await supabaseClient
    .from("employees")
    .insert({ name, descriptor });

  if (error) {
    console.error(error);
    setStatus("登録に失敗しました: " + error.message, "error");
    registerBtn.disabled = false;
    return;
  }

  setStatus(`「${name}」さんの顔を登録しました！`, "success");
  nameInput.value = "";
  registerBtn.disabled = false;
});

init();
