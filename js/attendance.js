const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const scanBtn = document.getElementById("scanBtn");
const statusEl = document.getElementById("status");
const logListEl = document.getElementById("logList");

const MATCH_THRESHOLD = window.APP_CONFIG.MATCH_THRESHOLD || 0.55;

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status" + (type ? " " + type : "");
}

async function init() {
  try {
    await loadFaceModels();
    await startCamera(video);
    overlay.width = video.clientWidth;
    overlay.height = video.clientHeight;
    setStatus("顔をカメラの中央に映して「スキャン」を押してください", "info");
    scanBtn.disabled = false;
    await refreshRecentLogs();
  } catch (err) {
    console.error(err);
    setStatus("初期化に失敗しました: " + err.message, "error");
  }
}

async function fetchEmployeesWithDescriptors() {
  const { data, error } = await supabaseClient
    .from("employees")
    .select("id, name, descriptor");
  if (error) throw error;
  return data.map((emp) => ({
    id: emp.id,
    name: emp.name,
    descriptor: new Float32Array(emp.descriptor),
  }));
}

async function getLastLogType(employeeId) {
  const { data, error } = await supabaseClient
    .from("attendance_logs")
    .select("type, created_at")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data.length ? data[0].type : null;
}

async function refreshRecentLogs() {
  const { data, error } = await supabaseClient
    .from("attendance_logs")
    .select("type, created_at, employees(name)")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return;
  logListEl.innerHTML = data
    .map((log) => {
      const label = log.type === "clock_in" ? "出勤" : "退勤";
      const time = new Date(log.created_at).toLocaleString("ja-JP");
      return `<div>${time} - ${log.employees?.name ?? "不明"} - ${label}</div>`;
    })
    .join("");
}

scanBtn.addEventListener("click", async () => {
  scanBtn.disabled = true;
  setStatus("顔を検出中です...", "info");

  try {
    const detection = await detectSingleFaceDescriptor(video);
    if (!detection) {
      setStatus("顔を検出できませんでした。もう一度お試しください", "error");
      return;
    }

    const employees = await fetchEmployeesWithDescriptors();
    if (employees.length === 0) {
      setStatus("登録済みの顔がありません。先に顔を登録してください", "error");
      return;
    }

    const match = findBestMatch(detection.descriptor, employees, MATCH_THRESHOLD);
    if (!match) {
      setStatus("登録されている顔と一致しませんでした", "error");
      return;
    }

    const lastType = await getLastLogType(match.employee.id);
    const nextType = lastType === "clock_in" ? "clock_out" : "clock_in";

    const { error: insertError } = await supabaseClient
      .from("attendance_logs")
      .insert({ employee_id: match.employee.id, type: nextType });

    if (insertError) throw insertError;

    const label = nextType === "clock_in" ? "出勤" : "退勤";
    setStatus(`${match.employee.name}さん、${label}を記録しました`, "success");
    await refreshRecentLogs();
  } catch (err) {
    console.error(err);
    setStatus("エラーが発生しました: " + err.message, "error");
  } finally {
    scanBtn.disabled = false;
  }
});

init();
