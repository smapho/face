const statusGrid = document.getElementById("statusGrid");
const logTableBody = document.getElementById("logTableBody");
const dateFilter = document.getElementById("dateFilter");
const todayBtn = document.getElementById("todayBtn");
const allBtn = document.getElementById("allBtn");

function todayDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

async function loadCurrentStatus() {
  const { data: employees, error: empError } = await supabaseClient
    .from("employees")
    .select("id, name")
    .order("name");

  if (empError) {
    statusGrid.textContent = "読み込みに失敗しました: " + empError.message;
    return;
  }

  if (employees.length === 0) {
    statusGrid.textContent = "登録済みの従業員がいません";
    return;
  }

  const { data: logs, error: logError } = await supabaseClient
    .from("attendance_logs")
    .select("employee_id, type, created_at")
    .order("created_at", { ascending: false });

  if (logError) {
    statusGrid.textContent = "読み込みに失敗しました: " + logError.message;
    return;
  }

  const latestByEmployee = new Map();
  for (const log of logs) {
    if (!latestByEmployee.has(log.employee_id)) {
      latestByEmployee.set(log.employee_id, log);
    }
  }

  statusGrid.innerHTML = employees
    .map((emp) => {
      const log = latestByEmployee.get(emp.id);
      const isIn = log?.type === "clock_in";
      const label = isIn ? "出勤中" : log ? "退勤済み" : "未出勤";
      const time = log ? new Date(log.created_at).toLocaleString("ja-JP") : "-";
      return `
        <div class="status-card">
          <div class="name">${emp.name}</div>
          <span class="badge ${isIn ? "in" : "out"}">${label}</span>
          <div class="time">${time}</div>
        </div>
      `;
    })
    .join("");
}

async function loadLogTable(dateStr) {
  logTableBody.innerHTML = `<tr><td colspan="3">読み込み中...</td></tr>`;

  let query = supabaseClient
    .from("attendance_logs")
    .select("type, created_at, employees(name)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (dateStr) {
    const start = new Date(dateStr + "T00:00:00");
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    query = query.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    logTableBody.innerHTML = `<tr><td colspan="3">読み込みに失敗しました: ${error.message}</td></tr>`;
    return;
  }

  if (data.length === 0) {
    logTableBody.innerHTML = `<tr><td colspan="3">記録がありません</td></tr>`;
    return;
  }

  logTableBody.innerHTML = data
    .map((log) => {
      const isIn = log.type === "clock_in";
      const time = new Date(log.created_at).toLocaleString("ja-JP");
      return `
        <tr>
          <td>${time}</td>
          <td>${log.employees?.name ?? "不明"}</td>
          <td><span class="badge ${isIn ? "in" : "out"}">${isIn ? "出勤" : "退勤"}</span></td>
        </tr>
      `;
    })
    .join("");
}

dateFilter.value = todayDateString();

todayBtn.addEventListener("click", () => {
  dateFilter.value = todayDateString();
  loadLogTable(dateFilter.value);
});

allBtn.addEventListener("click", () => {
  dateFilter.value = "";
  loadLogTable(null);
});

dateFilter.addEventListener("change", () => {
  loadLogTable(dateFilter.value || null);
});

loadCurrentStatus();
loadLogTable(dateFilter.value);
