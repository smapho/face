const statusGrid = document.getElementById("statusGrid");
const logTableBody = document.getElementById("logTableBody");
const dateFilter = document.getElementById("dateFilter");
const todayBtn = document.getElementById("todayBtn");
const allBtn = document.getElementById("allBtn");
const prevDayBtn = document.getElementById("prevDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const bigDateEl = document.getElementById("bigDate");
const bigWeekdayEl = document.getElementById("bigWeekday");
const bigHolidayEl = document.getElementById("bigHoliday");

const employeeModal = document.getElementById("employeeModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalTitle = document.getElementById("modalTitle");
const modalMonthLabel = document.getElementById("modalMonthLabel");
const modalPrevMonthBtn = document.getElementById("modalPrevMonthBtn");
const modalNextMonthBtn = document.getElementById("modalNextMonthBtn");
const modalTableBody = document.getElementById("modalTableBody");

const WEEKDAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];

let holidaysData = {};
let employeesByName = new Map();
let modalEmployeeId = null;
let modalEmployeeName = null;
let modalYear = null;
let modalMonth = null; // 0-11

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
  bigDateEl.classList.remove("sunday", "saturday", "holiday");

  if (!dateFilter.value) {
    bigDateEl.textContent = "全期間";
    bigWeekdayEl.textContent = "";
    bigHolidayEl.textContent = "";
    return;
  }
  const d = new Date(dateFilter.value + "T00:00:00");
  const holidayName = getHolidayName(d, holidaysData);
  const dow = d.getDay();

  bigDateEl.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  bigWeekdayEl.textContent = `${WEEKDAYS_JP[dow]}曜日`;
  bigHolidayEl.textContent = holidayName || "";

  if (holidayName || dow === 0) bigDateEl.classList.add("sunday");
  else if (dow === 6) bigDateEl.classList.add("saturday");
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

  employeesByName = new Map(employees.map((emp) => [emp.name, emp.id]));

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
  const holidayName = getHolidayName(d, holidaysData);
  const base = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS_JP[d.getDay()]})`;
  return holidayName ? `${base} ${holidayName}` : base;
}

function dateCellClass(d) {
  if (getHolidayName(d, holidaysData)) return "holiday";
  if (d.getDay() === 0) return "sunday";
  if (d.getDay() === 6) return "saturday";
  return "";
}

function formatTimeJP(d) {
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

// 日付＋氏名ごとに1行へ集約し、種別ごとの列に時刻を並べる
function buildPivotRows(data) {
  const rows = new Map();
  for (const log of data) {
    const created = new Date(log.created_at);
    const dateLabel = formatDateJP(created);
    const name = log.employees?.name ?? "不明";
    const key = `${dateLabel}__${name}`;

    if (!rows.has(key)) {
      rows.set(key, {
        dateLabel,
        cellClass: dateCellClass(created),
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

  return Array.from(rows.values()).sort((a, b) => {
    const dateDiff = b.sortDate - a.sortDate;
    if (dateDiff !== 0) return dateDiff;
    return a.name.localeCompare(b.name, "ja");
  });
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

  const sortedRows = buildPivotRows(data);

  logTableBody.innerHTML = sortedRows
    .map(
      (row) => `
        <tr>
          <td class="date-cell ${row.cellClass}">${row.dateLabel}</td>
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

logTableBody.addEventListener("click", (e) => {
  const cell = e.target.closest(".name-cell");
  if (!cell) return;
  const name = cell.textContent.trim();
  const id = employeesByName.get(name);
  if (!id) return;

  const base = dateFilter.value ? new Date(dateFilter.value + "T00:00:00") : new Date();
  openEmployeeModal(id, name, base.getFullYear(), base.getMonth());
});

function openEmployeeModal(id, name, year, month) {
  modalEmployeeId = id;
  modalEmployeeName = name;
  modalYear = year;
  modalMonth = month;
  modalTitle.textContent = `${name}さんの月間ログ`;
  employeeModal.hidden = false;
  loadModalMonth();
}

function closeEmployeeModal() {
  employeeModal.hidden = true;
  modalEmployeeId = null;
}

modalCloseBtn.addEventListener("click", closeEmployeeModal);
employeeModal.addEventListener("click", (e) => {
  if (e.target === employeeModal) closeEmployeeModal();
});

modalPrevMonthBtn.addEventListener("click", () => {
  modalMonth -= 1;
  if (modalMonth < 0) {
    modalMonth = 11;
    modalYear -= 1;
  }
  loadModalMonth();
});

modalNextMonthBtn.addEventListener("click", () => {
  modalMonth += 1;
  if (modalMonth > 11) {
    modalMonth = 0;
    modalYear += 1;
  }
  loadModalMonth();
});

async function loadModalMonth() {
  modalMonthLabel.textContent = `${modalYear}年${modalMonth + 1}月`;
  modalTableBody.innerHTML = `<tr><td colspan="5">読み込み中...</td></tr>`;

  const start = new Date(modalYear, modalMonth, 1);
  const end = new Date(modalYear, modalMonth + 1, 1);

  const { data, error } = await supabaseClient
    .from("attendance_logs")
    .select("type, created_at, employees(name)")
    .eq("employee_id", modalEmployeeId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    modalTableBody.innerHTML = `<tr><td colspan="5">読み込みに失敗しました: ${error.message}</td></tr>`;
    return;
  }

  if (data.length === 0) {
    modalTableBody.innerHTML = `<tr><td colspan="5">この月の記録はありません</td></tr>`;
    return;
  }

  const rows = buildPivotRows(data);

  modalTableBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td class="date-cell ${row.cellClass}">${row.dateLabel}</td>
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

async function init() {
  holidaysData = await loadJapaneseHolidays();
  updateBigDateDisplay();
  loadLogTable(dateFilter.value);
}

updateBigDateDisplay();
loadCurrentStatus();
init();
