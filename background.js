const STORAGE_KEY = "dictionaryData";
const DEFAULT_OUTPUT_KEY = "defaultOutputText";
const AUTO_DETECT_KEY = "autoDetectEnabled";
const MENU_ID = "dictionary-lookup";

const DEFAULT_DICT = {
  API: "Application Programming Interface.",
  SDK: "Software Development Kit.",
  Chrome: "Google Chrome browser."
};
const DEFAULT_OUTPUT_TEXT = "No matching keyword found.";
const DEFAULT_AUTO_DETECT = true;

chrome.runtime.onInstalled.addListener(async () => {
  await ensureContextMenu();

  const existing = await chrome.storage.local.get(STORAGE_KEY);
  if (!existing[STORAGE_KEY]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_DICT });
  }

  const fallback = await chrome.storage.local.get(DEFAULT_OUTPUT_KEY);
  if (!fallback[DEFAULT_OUTPUT_KEY]) {
    await chrome.storage.local.set({ [DEFAULT_OUTPUT_KEY]: DEFAULT_OUTPUT_TEXT });
  }

  const autoDetectSetting = await chrome.storage.local.get(AUTO_DETECT_KEY);
  if (typeof autoDetectSetting[AUTO_DETECT_KEY] !== "boolean") {
    await chrome.storage.local.set({ [AUTO_DETECT_KEY]: DEFAULT_AUTO_DETECT });
  }
});

chrome.runtime.onStartup.addListener(() => {
  void ensureContextMenu();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id || !info.selectionText) {
    return;
  }

  const selectedText = String(info.selectionText || "").trim();
  if (!selectedText) {
    return;
  }

  const lookupResult = await handleLookup(selectedText);
  const payload = {
    type: "show-lookup-modal",
    selectedText,
    matches: lookupResult.matches,
    defaultText: lookupResult.defaultText
  };

  const sent = await sendModalMessage(tab.id, payload);
  if (!sent) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      await sendModalMessage(tab.id, payload);
    } catch (_) {
      // Ignore restricted pages like chrome:// where injection is blocked.
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "lookup-selection") {
    return;
  }

  handleLookup(message.selectedText)
    .then((result) => sendResponse(result))
    .catch(() => sendResponse({ matches: [], defaultText: DEFAULT_OUTPUT_TEXT }));

  return true;
});

async function handleLookup(selectedText) {
  const cleanedSelected = String(selectedText || "").trim();
  if (!cleanedSelected) {
    return { matches: [], defaultText: DEFAULT_OUTPUT_TEXT };
  }

  const stored = await chrome.storage.local.get([STORAGE_KEY, DEFAULT_OUTPUT_KEY]);
  const dictionary = stored[STORAGE_KEY] || {};
  const defaultText =
    typeof stored[DEFAULT_OUTPUT_KEY] === "string"
      ? stored[DEFAULT_OUTPUT_KEY]
      : DEFAULT_OUTPUT_TEXT;

  const normalizedSelected = normalizeText(cleanedSelected);
  const matches = Object.entries(dictionary)
    .filter(([key]) => {
      const normalizedKey = normalizeText(key);
      return normalizedKey && normalizedSelected.includes(normalizedKey);
    })
    .map(([key, value]) => ({ key, value: String(value) }));

  return {
    matches,
    defaultText
  };
}

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}\u4e00-\u9fff]/gu, "");
}

async function ensureContextMenu() {
  try {
    await chrome.contextMenus.remove(MENU_ID);
  } catch (_) {
    // Menu might not exist yet.
  }

  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Keyword Reminder",
    contexts: ["selection"]
  });
}

async function sendModalMessage(tabId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, payload);
    return true;
  } catch (_) {
    return false;
  }
}
