/* ═══════════════════════════════════════════════════
   ZENITH_SEC — JavaScript Core v2.0
   Features:
    - Tab navigation
    - Multi-algorithm AES/RC4/3DES/Rabbit encryption
    - Password strength meter with entropy scoring
    - Hash generator (MD5/SHA1/SHA256/SHA512)
    - Secure random key generator with charset control
    - Session vault with log export
    - Dark/Light theme with localStorage persistence
    - Copy to clipboard with feedback
    - Live stats (char/byte/line counts)
    - Animated toast notifications
    - Realtime clock in footer
    - Timestamp embed option
═══════════════════════════════════════════════════ */

"use strict";

/* ─── STATE ─── */
let currentAlgo = "AES";
let currentHash = "MD5";
let vaultEntries = 0;

/* ─────────────────────────────────────────────
     THEME
  ───────────────────────────────────────────── */
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  const next = isDark ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("zenith_theme", next);
  showToast(next === "dark" ? "DARK MODE ACTIVATED" : "LIGHT MODE ACTIVATED");
}

(function initTheme() {
  const saved = localStorage.getItem("zenith_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
})();

/* ─────────────────────────────────────────────
     TAB NAVIGATION
  ───────────────────────────────────────────── */
function openTab(evt, tabName) {
  document
    .querySelectorAll(".tab-content")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById(tabName).classList.add("active");
  evt.currentTarget.classList.add("active");
}

/* ─────────────────────────────────────────────
     ALGORITHM SELECTOR
  ───────────────────────────────────────────── */
function selectAlgo(btn) {
  document
    .querySelectorAll(".algo-row .algo-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  currentAlgo = btn.dataset.algo;
  document.getElementById("footerAlgo").textContent = btn.textContent;
  showToast("ALGORITHM: " + btn.textContent);
}

/* ─────────────────────────────────────────────
     HASH SELECTOR
  ───────────────────────────────────────────── */
function selectHash(btn) {
  if (!btn.dataset.hash) return; // RUN button
  document
    .querySelectorAll(".hash-selector .algo-btn[data-hash]")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  currentHash = btn.dataset.hash;
}

function computeHash() {
  const input = document.getElementById("messageInput").value.trim();
  const hashOut = document.getElementById("hashOut");
  if (!input) {
    hashOut.textContent = "SOURCE_DATA EMPTY. TYPE SOMETHING FIRST.";
    return;
  }
  let result = "";
  switch (currentHash) {
    case "MD5":
      result = CryptoJS.MD5(input).toString();
      break;
    case "SHA1":
      result = CryptoJS.SHA1(input).toString();
      break;
    case "SHA256":
      result = CryptoJS.SHA256(input).toString();
      break;
    case "SHA512":
      result = CryptoJS.SHA512(input).toString();
      break;
  }
  hashOut.textContent = result;
  addToVault("HASH", currentHash + "_COMPUTED");
  showToast(currentHash + " HASH GENERATED");
}

/* ─────────────────────────────────────────────
     PASSWORD STRENGTH
  ───────────────────────────────────────────── */
function checkStrength() {
  const key = document.getElementById("secretKey").value;
  const bar = document.getElementById("strengthBar");
  const text = document.getElementById("strengthText");
  let score = 0;
  let notes = [];

  if (key.length >= 6) {
    score += 15;
  }
  if (key.length >= 10) {
    score += 15;
    notes.push("LEN+");
  }
  if (key.length >= 16) {
    score += 10;
    notes.push("LEN++");
  }
  if (/[A-Z]/.test(key)) {
    score += 15;
    notes.push("UPPER");
  }
  if (/[a-z]/.test(key)) {
    score += 10;
    notes.push("LOWER");
  }
  if (/[0-9]/.test(key)) {
    score += 15;
    notes.push("NUM");
  }
  if (/[^A-Za-z0-9]/.test(key)) {
    score += 20;
    notes.push("SYM");
  }

  score = Math.min(score, 100);
  bar.style.width = score + "%";

  if (score < 35) {
    bar.style.backgroundColor = "#ff5f56";
    text.textContent = "SECURITY: LOW  [" + notes.join("|") + "]";
    text.style.color = "#ff5f56";
  } else if (score < 70) {
    bar.style.backgroundColor = "#ffbd2e";
    text.textContent = "SECURITY: MEDIUM  [" + notes.join("|") + "]";
    text.style.color = "#ffbd2e";
  } else {
    bar.style.backgroundColor = "#00ff41";
    text.textContent = "SECURITY: HIGH  [" + notes.join("|") + "]";
    text.style.color = "#00ff41";
  }
}

/* ─────────────────────────────────────────────
     TOGGLE KEY VISIBILITY
  ───────────────────────────────────────────── */
function toggleKeyVisibility() {
  const input = document.getElementById("secretKey");
  const btn = document.getElementById("eyeBtn");
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🚫";
  } else {
    input.type = "password";
    btn.textContent = "👁";
  }
}

/* ─────────────────────────────────────────────
     LIVE STATS
  ───────────────────────────────────────────── */
function updateStats() {
  const val = document.getElementById("messageInput").value;
  document.getElementById("charCount").textContent = val.length;
  document.getElementById("byteCount").textContent = new Blob([val]).size;
  document.getElementById("lineCount").textContent = val
    ? val.split("\n").length
    : 0;
}

/* ─────────────────────────────────────────────
     ENCRYPT / DECRYPT
  ───────────────────────────────────────────── */
function process(type) {
  let input = document.getElementById("messageInput").value.trim();
  const key = document.getElementById("secretKey").value.trim();
  const box = document.getElementById("resultBox");
  const copyBtn = document.getElementById("copyBtn");
  const procLine = document.getElementById("procLine");
  const addTS = document.getElementById("addTimestamp").checked;

  if (!input || !key) {
    showToast("INPUT AND KEY REQUIRED", true);
    box.textContent = "> ERROR: MISSING_INPUT OR KEY";
    box.style.color = "var(--accent-red)";
    box.classList.add("error");
    setTimeout(() => box.classList.remove("error"), 600);
    return;
  }

  procLine.textContent = "> PROCESSING...";
  procLine.classList.add("active");

  setTimeout(() => {
    procLine.textContent = "";
    procLine.classList.remove("active");
    try {
      let result = "";
      const engine = CryptoJS[currentAlgo];
      if (type === "encrypt") {
        if (addTS) {
          input = "[TS:" + Date.now() + "]" + input;
        }
        result = engine.encrypt(input, key).toString();
        addToVault("ENC", currentAlgo + " DATA_LOCKED");
        box.style.color = "var(--accent-green)";
        showToast("ENCRYPTED SUCCESSFULLY");
      } else {
        const bytes = engine.decrypt(input, key);
        result = bytes.toString(CryptoJS.enc.Utf8);
        if (!result) throw new Error("BAD_KEY_OR_DATA");
        if (addTS && result.startsWith("[TS:")) {
          const tsEnd = result.indexOf("]");
          const ts = parseInt(result.substring(4, tsEnd));
          const d = new Date(ts);
          result = result.substring(tsEnd + 1);
          result += "\n\n[EMBEDDED_TIMESTAMP: " + d.toLocaleString() + "]";
        }
        addToVault("DEC", currentAlgo + " DATA_UNLOCKED");
        box.style.color = "var(--accent-green)";
        showToast("DECRYPTED SUCCESSFULLY");
      }
      box.textContent = result;
      // re-attach copy button
      box.appendChild(copyBtn);
      box.classList.add("success");
      setTimeout(() => box.classList.remove("success"), 600);
    } catch (e) {
      box.textContent =
        "> ACCESS_DENIED: INVALID_KEY OR CORRUPTED_BUFFER.\n  CHECK ALGORITHM AND KEY.";
      box.style.color = "var(--accent-red)";
      box.appendChild(copyBtn);
      box.classList.add("error");
      setTimeout(() => box.classList.remove("error"), 600);
      showToast("DECRYPTION FAILED", true);
    }
  }, 300);
}

/* ─────────────────────────────────────────────
     COPY RESULT
  ───────────────────────────────────────────── */
function copyResult() {
  const box = document.getElementById("resultBox");
  const button = document.getElementById("copyBtn");

  // Clone the box and remove the copy button from the clone
  const clone = box.cloneNode(true);
  const btnInside = clone.querySelector("#copyBtn");
  if (btnInside) btnInside.remove();

  const text = clone.innerText.trim();

  if (!text || text === "SYSTEM_READY...") {
    showToast("NOTHING TO COPY", true);
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      button.textContent = "COPIED!";
      button.classList.add("copied");

      setTimeout(() => {
        button.textContent = "COPY";
        button.classList.remove("copied");
      }, 1500);

      showToast("COPIED TO CLIPBOARD");
    })
    .catch(() => {
      showToast("CLIPBOARD ACCESS DENIED", true);
    });
}

/* ─────────────────────────────────────────────
     VAULT / HISTORY
  ───────────────────────────────────────────── */
function addToVault(action, info) {
  const list = document.getElementById("historyList");
  const empty = list.querySelector(".empty-msg");
  if (empty) empty.remove();

  vaultEntries++;
  document.getElementById("vaultCount").textContent = vaultEntries + " ENTRIES";

  const li = document.createElement("li");
  const cls =
    action === "ENC" ? "enc-tag" : action === "DEC" ? "dec-tag" : "hash-tag";

  li.innerHTML = `
      <span class="log-time">${new Date().toLocaleTimeString()}</span>
      <span class="log-action ${cls}">[${action}]</span>
      <span class="log-info">${info} | ALGO:${currentAlgo}</span>`;
  list.prepend(li);
}

function clearHistory() {
  if (!confirm("PURGE ALL SESSION LOGS?")) return;
  document.getElementById("historyList").innerHTML =
    '<li class="empty-msg">BUFFER_EMPTY...</li>';
  vaultEntries = 0;
  document.getElementById("vaultCount").textContent = "0 ENTRIES";
  showToast("LOGS PURGED");
}

function exportLogs() {
  const items = document.querySelectorAll("#historyList li:not(.empty-msg)");
  if (!items.length) {
    showToast("NO LOGS TO EXPORT", true);
    return;
  }
  const logs = [];
  items.forEach((li) => {
    logs.push({
      time: li.querySelector(".log-time")?.textContent,
      action: li.querySelector(".log-action")?.textContent,
      info: li.querySelector(".log-info")?.textContent,
    });
  });
  const blob = new Blob(
    [JSON.stringify({ exported: new Date().toISOString(), logs }, null, 2)],
    { type: "application/json" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "zenith_sec_vault_" + Date.now() + ".json";
  a.click();
  showToast("LOGS EXPORTED TO JSON");
}

/* ─────────────────────────────────────────────
     KEY GENERATOR
  ───────────────────────────────────────────── */
function updateKeyLen() {
  document.getElementById("keyLenVal").textContent =
    document.getElementById("keyLength").value;
}

function generateKey() {
  const bits = parseInt(document.getElementById("keyLength").value);
  const chars = parseInt(bits / 6); // approx printable chars needed
  const useUp = document.getElementById("useUpper").checked;
  const useLo = document.getElementById("useLower").checked;
  const useNu = document.getElementById("useNum").checked;
  const useSp = document.getElementById("useSpec").checked;

  let charset = "";
  if (useUp) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (useLo) charset += "abcdefghijklmnopqrstuvwxyz";
  if (useNu) charset += "0123456789";
  if (useSp) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";

  if (!charset) {
    showToast("SELECT AT LEAST ONE CHARSET", true);
    return;
  }

  const arr = new Uint32Array(chars);
  crypto.getRandomValues(arr);
  let key = "";
  for (let i = 0; i < chars; i++) {
    key += charset[arr[i] % charset.length];
  }
  document.getElementById("genKeyOut").textContent = key;

  // entropy info
  const entropy = Math.log2(Math.pow(charset.length, chars)).toFixed(1);
  const timeToCrack =
    entropy > 100
      ? "HEAT DEATH OF UNIVERSE"
      : entropy > 80
        ? "MILLIONS OF YEARS"
        : entropy > 60
          ? "THOUSANDS OF YEARS"
          : entropy > 40
            ? "DECADES"
            : "WEAK";

  document.getElementById("entropyInfo").innerHTML =
    `CHARSET_SIZE: ${charset.length} CHARACTERS<br>
       KEY_LENGTH: ${chars} CHARACTERS (${bits} BIT TARGET)<br>
       ENTROPY: ~${entropy} BITS<br>
       TIME_TO_CRACK: ${timeToCrack}`;

  showToast("KEY GENERATED (" + bits + " BIT STRENGTH)");
  addToVault("KEYGEN", bits + "BIT KEY GENERATED");
}

function copyGenKey() {
  const key = document.getElementById("genKeyOut").textContent;
  if (key.startsWith("GENERATE")) {
    showToast("GENERATE A KEY FIRST", true);
    return;
  }
  navigator.clipboard
    .writeText(key)
    .then(() => showToast("KEY COPIED TO CLIPBOARD"))
    .catch(() => showToast("CLIPBOARD ACCESS DENIED", true));
}

/* ─────────────────────────────────────────────
     TOAST NOTIFICATION
  ───────────────────────────────────────────── */
let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = "> " + msg;
  t.style.borderColor = isError ? "var(--accent-red)" : "var(--border-main)";
  t.style.color = isError ? "var(--accent-red)" : "var(--text-main)";
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ─────────────────────────────────────────────
     FOOTER CLOCK
  ───────────────────────────────────────────── */
function startClock() {
  const el = document.getElementById("footerClock");
  setInterval(() => {
    el.textContent = new Date().toLocaleTimeString("en-US", { hour12: false });
  }, 1000);
}
startClock();

/* ─────────────────────────────────────────────
     KEYBOARD SHORTCUTS
  ───────────────────────────────────────────── */
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    process("encrypt");
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Enter") {
    e.preventDefault();
    process("decrypt");
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "d") {
    e.preventDefault();
    toggleTheme();
  }
});