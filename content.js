const MODAL_ID = "__simple_dict_modal__";
const AUTO_DETECT_KEY = "autoDetectEnabled";
let lastSelection = "";
let autoDetectEnabled = true;

async function loadAutoDetectSetting() {
  const res = await chrome.storage.local.get(AUTO_DETECT_KEY);
  if (typeof res[AUTO_DETECT_KEY] === "boolean") {
    autoDetectEnabled = res[AUTO_DETECT_KEY];
  } else {
    autoDetectEnabled = true;
  }
}

function getSelectedText() {
  return String(window.getSelection()?.toString() || "").trim();
}

function shouldSkipSelection(text) {
  if (!text || text.length < 1) {
    return true;
  }
  if (text.length > 300) {
    return true;
  }
  return false;
}

async function handleSelectionCheck() {
  const selectedText = getSelectedText();
  if (shouldSkipSelection(selectedText)) {
    return;
  }
  if (selectedText === lastSelection) {
    return;
  }
  lastSelection = selectedText;

  const response = await chrome.runtime.sendMessage({
    type: "lookup-selection",
    selectedText
  });

  const matches = response?.matches || [];
  if (!matches.length) {
    return;
  }
  const defaultText = String(response?.defaultText || "").trim();
  showLookupModal(selectedText, matches, defaultText);
}

function showLookupModal(selectedText, matches, defaultText) {
  const old = document.getElementById(MODAL_ID);
  if (old) {
    old.remove();
  }

  const backdrop = document.createElement("div");
  backdrop.id = MODAL_ID;
  backdrop.style.position = "fixed";
  backdrop.style.inset = "0";
  backdrop.style.background = "rgba(0,0,0,0.22)";
  backdrop.style.zIndex = "2147483647";
  backdrop.style.display = "flex";
  backdrop.style.alignItems = "center";
  backdrop.style.justifyContent = "center";
  backdrop.style.padding = "16px";
  backdrop.style.backdropFilter = "blur(2px)";

  const card = document.createElement("div");
  card.style.width = "min(560px, 92vw)";
  card.style.maxHeight = "75vh";
  card.style.overflow = "auto";
  card.style.background = "#fff";
  card.style.color = "#111";
  card.style.border = "1px solid #000";
  card.style.borderRadius = "16px";
  card.style.boxShadow = "0 18px 40px rgba(0,0,0,0.24)";
  card.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', sans-serif";

  const head = document.createElement("div");
  head.style.padding = "14px 16px";
  head.style.borderBottom = "1px solid #111";
  head.style.display = "flex";
  head.style.alignItems = "center";
  head.style.justifyContent = "space-between";

  const title = document.createElement("div");
  title.textContent = "Reminder";
  title.style.fontSize = "15px";
  title.style.fontWeight = "600";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.border = "1px solid #111";
  closeBtn.style.background = "#fff";
  closeBtn.style.color = "#111";
  closeBtn.style.borderRadius = "999px";
  closeBtn.style.fontSize = "12px";
  closeBtn.style.padding = "5px 10px";
  closeBtn.style.cursor = "pointer";

  const body = document.createElement("div");
  body.style.padding = "14px 16px 16px";

  const selected = document.createElement("div");
  selected.textContent = `Selected text: ${selectedText}`;
  selected.style.fontSize = "12px";
  selected.style.color = "#333";
  selected.style.marginBottom = "12px";
  selected.style.wordBreak = "break-word";

  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = "10px";

  if (matches.length) {
    for (const item of matches) {
      const row = document.createElement("div");
      row.style.border = "1px solid #111";
      row.style.borderRadius = "12px";
      row.style.padding = "10px 12px";
      row.style.background = "#fff";

      const key = document.createElement("div");
      key.textContent = item.key;
      key.style.fontSize = "13px";
      key.style.fontWeight = "600";
      key.style.marginBottom = "6px";

      const value = document.createElement("div");
      value.textContent = item.value;
      value.style.fontSize = "13px";
      value.style.lineHeight = "1.5";
      value.style.whiteSpace = "pre-wrap";
      value.style.wordBreak = "break-word";

      row.appendChild(key);
      row.appendChild(value);
      list.appendChild(row);
    }
  } else {
    const row = document.createElement("div");
    row.style.border = "1px solid #111";
    row.style.borderRadius = "12px";
    row.style.padding = "10px 12px";
    row.style.background = "#fff";

    const key = document.createElement("div");
    key.textContent = "Default";
    key.style.fontSize = "13px";
    key.style.fontWeight = "600";
    key.style.marginBottom = "6px";

    const value = document.createElement("div");
    value.textContent = defaultText || "No matching keyword found.";
    value.style.fontSize = "13px";
    value.style.lineHeight = "1.5";
    value.style.whiteSpace = "pre-wrap";
    value.style.wordBreak = "break-word";

    row.appendChild(key);
    row.appendChild(value);
    list.appendChild(row);
  }

  const onKeyDown = (e) => {
    const tagName = e.target?.tagName || "";
    const isEditable =
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      Boolean(e.target?.isContentEditable);

    if (e.key === "Escape") {
      cleanup();
      return;
    }

    if (!isEditable && (e.code === "Enter" || e.key === "Enter")) {
      e.preventDefault();
      cleanup();
    }
  };

  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown, true);
    backdrop.remove();
  };

  closeBtn.addEventListener("click", cleanup);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      cleanup();
    }
  });
  document.addEventListener("keydown", onKeyDown, true);

  head.appendChild(title);
  head.appendChild(closeBtn);
  body.appendChild(selected);
  body.appendChild(list);
  card.appendChild(head);
  card.appendChild(body);
  backdrop.appendChild(card);
  document.documentElement.appendChild(backdrop);
}

document.addEventListener("mouseup", () => {
  if (!autoDetectEnabled) {
    return;
  }
  setTimeout(handleSelectionCheck, 10);
});

document.addEventListener("keyup", (e) => {
  if (!autoDetectEnabled) {
    return;
  }
  if (e.key === "Shift" || e.key.startsWith("Arrow")) {
    setTimeout(handleSelectionCheck, 10);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ping-content-script") {
    sendResponse({ ok: true });
    return;
  }
  if (message?.type !== "show-lookup-modal") {
    return;
  }
  const selectedText = String(message.selectedText || "").trim();
  const matches = Array.isArray(message.matches) ? message.matches : [];
  const defaultText = String(message.defaultText || "").trim();
  if (!selectedText) {
    return;
  }
  if (!matches.length && !defaultText) {
    return;
  }
  showLookupModal(selectedText, matches, defaultText);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[AUTO_DETECT_KEY]) {
    return;
  }
  autoDetectEnabled = Boolean(changes[AUTO_DETECT_KEY].newValue);
});

loadAutoDetectSetting();
