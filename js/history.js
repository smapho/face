const statusGrid = document.getElementById("statusGrid");
const logTableBody = document.getElementById("logTableBody");
const dateFilter = document.getElementById("dateFilter");
const todayBtn = document.getElementById("todayBtn");
const allBtn = document.getElementById("allBtn");
const prevDayBtn = document.getElementById("prevDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const bigDateEl = document.getElementById("bigDate");
const bigWeekdayEl = document.getElementById("bigWeekday");

const WEEKDAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];

const TYPE_LABELS = {
  clock_in: "出社",
  clock_out: "退社",
  break_start: "中抜け",
  break_end: "戻り",
};

const TYPE_BADGE_CLASS = {
  clock_in: "in",
  clock_out: "out",
  break_start: "break-start",
  break_end: "break-end",
};

function todayDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function shiftDateString(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function updateBigDateDisplay() {
  if (!dateFilter.value) {
    bigDateEl.textContent = "全期間";
    bigWeekdayEl.textContent = "";
    return;
  }
  const d = new Date(dateFilter.value + "T00:00:00");
  bigDateEl.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  bigWeekdayEl.textContent = `${WEEKDAYS_JP[d.getDay()]}曜日`;
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
      const label = log ? TYPE_LABELS[log.type] ?? log.type : "未出勤";
      const badgeClass = log ? TYPE_BADGE_CLASS[log.type] ?? "out" : "out";
      const time = log ? new Date(log.created_at).toLocaleString("ja-JP") : "-";
      return `
        <div class="status-card">
          <div class="name">${emp.name}</div>
          <span class="badge ${badgeClass}">${label}</span>
          <div class="time">${time}</div>
        </div>
      `;
    })
    .join("");
}

function formatDateJP(d) {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTimeJP(d) {
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

async function loadLogTable(dateStr) {
  logTableBody.innerHTML = `<tr><td colspan="6">読み込み中...</td></tr>`;

  let query = supabaseClient
    .from("attendance_logs")
    .select("type, created_at, employees(name)")
    .order("created_at", { ascending: true })
    .limit(1000);

  if (dateStr) {
    const start = new Date(dateStr + "T00:00:00");
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    query = query.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    logTableBody.innerHTML = `<tr><td colspan="6">読み込みに失敗しました: ${error.message}</td></tr>`;
    return;
  }

  if (data.length === 0) {
    logTableBody.innerHTML = `<tr><td colspan="6">記録がありません</td></tr>`;
    return;
  }

  // 日付＋氏名ごとに1行へ集約し、種別ごとの列に時刻を並べる
  const rows = new Map();
  for (const log of data) {
    const created = new Date(log.created_at);
    const dateLabel = formatDateJP(created);
    const name = log.employees?.name ?? "不明";
    const key = `${dateLabel}__${name}`;

    if (!rows.has(key)) {
      rows.set(key, {
        dateLabel,
        sortDate: created,
        name,
        clock_in: [],
        break_start: [],
        break_end: [],
        clock_out: [],
      });
    }
    const row = rows.get(key);
    if (row[log.type]) {
      row[log.type].push(formatTimeJP(created));
    }
  }

  const sortedRows = Array.from(rows.values()).sort((a, b) => {
    const dateDiff = b.sortDate - a.sortDate;
    if (dateDiff !== 0) return dateDiff;
    return a.name.localeCompare(b.name, "ja");
  });

  logTableBody.innerHTML = sortedRows
    .map(
      (row) => `
        <tr>
          <td class="date-cell">${row.dateLabel}</td>
          <td class="name-cell">${row.name}</td>
          <td class="time-cell">${row.clock_in.join(", ")}</td>
          <td class="time-cell">${row.break_start.join(", ")}</td>
          <td class="time-cell">${row.break_end.join(", ")}</td>
          <td class="time-cell">${row.clock_out.join(", ")}</td>
        </tr>
      `
    )
    .join("");
}

dateFilter.value = todayDateString();

todayBtn.addEventListener("click", () => {
  dateFilter.value = todayDateString();
  updateBigDateDisplay();
  loadLogTable(dateFilter.value);
});

allBtn.addEventListener("click", () => {
  dateFilter.value = "";
  updateBigDateDisplay();
  loadLogTable(null);
});

dateFilter.addEventListener("change", () => {
  updateBigDateDisplay();
  loadLogTable(dateFilter.value || null);
});

prevDayBtn.addEventListener("click", () => {
  const base = dateFilter.value || todayDateString();
  dateFilter.value = shiftDateString(base, -1);
  updateBigDateDisplay();
  loadLogTable(dateFilter.value);
});

nextDayBtn.addEventListener("click", () => {
  const base = dateFilter.value || todayDateString();
  dateFilter.value = shiftDateString(base, 1);
  updateBigDateDisplay();
  loadLogTable(dateFilter.value);
});

updateBigDateDisplay();
loadCurrentStatus();
loadLogTable(dateFilter.value);
