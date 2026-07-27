const HOLIDAYS_API_URL = "https://holidays-jp.github.io/api/v1/date.json";

let holidaysCache = null;

async function loadJapaneseHolidays() {
  if (holidaysCache) return holidaysCache;
  try {
    const res = await fetch(HOLIDAYS_API_URL);
    holidaysCache = await res.json();
  } catch (err) {
    console.error("祝日データの取得に失敗しました", err);
    holidaysCache = {};
  }
  return holidaysCache;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getHolidayName(date, holidays) {
  return holidays[toDateKey(date)] || null;
}
