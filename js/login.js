const params = new URLSearchParams(location.search);
const next = params.get("next") || "/history";

const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const statusEl = document.getElementById("status");

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status" + (type ? " " + type : "");
}

async function submit() {
  const password = passwordInput.value;
  if (!password) {
    setStatus("パスワードを入力してください", "error");
    return;
  }

  loginBtn.disabled = true;
  setStatus("確認中...", "info");

  try {
    const res = await fetch("/api/verify-history-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      location.href = next;
      return;
    }

    const data = await res.json().catch(() => ({}));
    setStatus(data.message || "パスワードが違います", "error");
  } catch (err) {
    setStatus("通信エラーが発生しました", "error");
  } finally {
    loginBtn.disabled = false;
  }
}

loginBtn.addEventListener("click", submit);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submit();
});
passwordInput.focus();
