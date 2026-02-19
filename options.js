const STORAGE_KEY = "dictionaryData";
const input = document.getElementById("dictInput");
const saveBtn = document.getElementById("saveBtn");
const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const status = document.getElementById("status");

function showStatus(message) {
  status.textContent = message;
  setTimeout(() => {
    if (status.textContent === message) {
      status.textContent = "";
    }
  }, 1800);
}

async function loadDictionary() {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  const dict = res[STORAGE_KEY] || {};
  input.value = JSON.stringify(dict, null, 2);
}

function normalizeDictionary(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Must be a JSON object");
  }

  const normalized = {};
  for (const [key, value] of Object.entries(parsed)) {
    const cleanKey = String(key).trim();
    if (!cleanKey) {
      continue;
    }
    normalized[cleanKey] = String(value);
  }
  return normalized;
}

saveBtn.addEventListener("click", async () => {
  const raw = input.value.trim();
  if (!raw) {
    await chrome.storage.local.set({ [STORAGE_KEY]: {} });
    showStatus("Saved empty dictionary");
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeDictionary(parsed);

    await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
    input.value = JSON.stringify(normalized, null, 2);
    showStatus("Saved");
  } catch (e) {
    showStatus(`Invalid JSON: ${e.message}`);
  }
});

importBtn.addEventListener("click", () => {
  importFile.value = "";
  importFile.click();
});

importFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const normalized = normalizeDictionary(parsed);
    await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
    input.value = JSON.stringify(normalized, null, 2);
    showStatus("Imported");
  } catch (err) {
    showStatus(`Import failed: ${err.message}`);
  }
});

exportBtn.addEventListener("click", async () => {
  try {
    const raw = input.value.trim();
    const parsed = raw ? JSON.parse(raw) : {};
    const normalized = normalizeDictionary(parsed);
    const content = JSON.stringify(normalized, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dictionary.json";
    a.click();
    URL.revokeObjectURL(url);
    showStatus("Exported");
  } catch (err) {
    showStatus(`Export failed: ${err.message}`);
  }
});

loadDictionary();
