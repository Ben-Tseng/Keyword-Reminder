const STORAGE_KEY = "dictionaryData";
const DEFAULT_OUTPUT_KEY = "defaultOutputText";
const AUTO_DETECT_KEY = "autoDetectEnabled";
const keyInput = document.getElementById("keyInput");
const valueInput = document.getElementById("valueInput");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const searchInput = document.getElementById("searchInput");
const defaultOutputInput = document.getElementById("defaultOutputInput");
const saveDefaultBtn = document.getElementById("saveDefaultBtn");
const autoDetectCheckbox = document.getElementById("autoDetectCheckbox");
const status = document.getElementById("status");
const list = document.getElementById("list");
let currentDictionary = {};
let editingOriginalKey = "";

async function ensureContentScriptOnActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { type: "ping-content-script" });
      return;
    } catch (_) {
      // Not injected yet.
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  } catch (_) {
    // Ignore restricted pages.
  }
}

function setStatus(message) {
  status.textContent = message;
  setTimeout(() => {
    if (status.textContent === message) {
      status.textContent = "";
    }
  }, 1600);
}

function setEditMode(isEditing) {
  saveBtn.textContent = isEditing ? "Save Edit" : "Save";
  cancelEditBtn.style.display = isEditing ? "inline-block" : "none";
}

function resetEditor() {
  editingOriginalKey = "";
  keyInput.value = "";
  valueInput.value = "";
  setEditMode(false);
}

async function getDictionary() {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  return res[STORAGE_KEY] || {};
}

async function getDefaultOutput() {
  const res = await chrome.storage.local.get(DEFAULT_OUTPUT_KEY);
  return String(res[DEFAULT_OUTPUT_KEY] || "").trim();
}

async function getAutoDetectEnabled() {
  const res = await chrome.storage.local.get(AUTO_DETECT_KEY);
  if (typeof res[AUTO_DETECT_KEY] === "boolean") {
    return res[AUTO_DETECT_KEY];
  }
  return true;
}

async function saveDictionary(dict) {
  await chrome.storage.local.set({ [STORAGE_KEY]: dict });
}

function renderList(dict) {
  const query = searchInput.value.trim().toLowerCase();
  const entries = Object.entries(dict).filter(([key, value]) => {
    if (!query) {
      return true;
    }
    return (
      key.toLowerCase().includes(query) || String(value).toLowerCase().includes(query)
    );
  });
  list.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "item";
    empty.textContent = query ? "No matching entries" : "No entries yet";
    list.appendChild(empty);
    return;
  }

  for (const [key, value] of entries) {
    const item = document.createElement("div");
    item.className = "item";

    const head = document.createElement("div");
    head.className = "item-head";

    const keyNode = document.createElement("div");
    keyNode.className = "item-key";
    keyNode.textContent = key;

    const actionWrap = document.createElement("div");
    actionWrap.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      editingOriginalKey = key;
      keyInput.value = key;
      valueInput.value = String(value);
      setEditMode(true);
      keyInput.focus();
      setStatus("Editing entry");
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const latest = await getDictionary();
      delete latest[key];
      await saveDictionary(latest);
      currentDictionary = latest;

      if (editingOriginalKey === key) {
        resetEditor();
      }

      renderList(latest);
      setStatus("Deleted");
    });

    const valueNode = document.createElement("div");
    valueNode.className = "item-value";
    valueNode.textContent = String(value);

    actionWrap.appendChild(editBtn);
    actionWrap.appendChild(deleteBtn);
    head.appendChild(keyNode);
    head.appendChild(actionWrap);
    item.appendChild(head);
    item.appendChild(valueNode);
    list.appendChild(item);
  }
}

saveBtn.addEventListener("click", async () => {
  const key = keyInput.value.trim();
  const value = valueInput.value.trim();

  if (!key) {
    setStatus("Please enter a keyword");
    return;
  }
  if (!value) {
    setStatus("Please enter reminder text");
    return;
  }

  const dict = await getDictionary();

  if (editingOriginalKey) {
    if (editingOriginalKey !== key) {
      delete dict[editingOriginalKey];
    }
    dict[key] = value;
    await saveDictionary(dict);
    currentDictionary = dict;
    renderList(dict);
    resetEditor();
    keyInput.focus();
    setStatus("Edit saved");
    return;
  }

  dict[key] = value;
  await saveDictionary(dict);
  currentDictionary = dict;
  renderList(dict);
  keyInput.value = "";
  valueInput.value = "";
  keyInput.focus();
  setStatus("Saved");
});

saveDefaultBtn.addEventListener("click", async () => {
  const text = defaultOutputInput.value;
  await chrome.storage.local.set({ [DEFAULT_OUTPUT_KEY]: text });
  setStatus(text.trim() ? "Default text saved" : "Default text cleared");
});

autoDetectCheckbox.addEventListener("change", async () => {
  await chrome.storage.local.set({
    [AUTO_DETECT_KEY]: Boolean(autoDetectCheckbox.checked)
  });
  setStatus(
    autoDetectCheckbox.checked ? "Auto-detect enabled" : "Auto-detect disabled"
  );
});

cancelEditBtn.addEventListener("click", () => {
  resetEditor();
  setStatus("Edit canceled");
});

searchInput.addEventListener("input", () => {
  renderList(currentDictionary);
});

async function init() {
  await ensureContentScriptOnActiveTab();
  const dict = await getDictionary();
  const defaultOutput = await getDefaultOutput();
  const autoDetectEnabled = await getAutoDetectEnabled();
  currentDictionary = dict;
  renderList(dict);
  defaultOutputInput.value = defaultOutput || "No matching keyword found.";
  autoDetectCheckbox.checked = autoDetectEnabled;
  setEditMode(false);
}

init();
