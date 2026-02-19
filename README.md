# Keyword Reminder (Chrome Extension)

## Features
- Click the extension icon to add `keyword -> reminder text` entries.
- Search entries in the popup and edit keyword or reminder text quickly.
- Optional auto-detect mode for selected text on web pages.
- Right-click selected text and use `Keyword Reminder` to trigger reminders.
- If no keyword matches, it can show your saved default text (only via right-click trigger).
- If default text is empty and no keyword matches, no popup is shown.
- Import and export dictionary JSON from the options page.

## Usage
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select this folder
5. Click the extension icon to manage keywords
6. Select text on a page and trigger reminders by:
   - Auto-detect (if enabled), or
   - Right-click -> `Keyword Reminder`

## Example Dictionary JSON
```json
{
  "API": "Application Programming Interface",
  "SDK": "Software Development Kit",
  "compliance": "Check policy requirements before publishing."
}
```
