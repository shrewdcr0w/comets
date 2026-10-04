// --- 1. The main function that creates the floating window ---
async function launchComets() {
  const storage = await chrome.storage.local.get(['popupWindowId', 'windowBounds']);
  
  // Bring to front if already open
  if (storage.popupWindowId) {
    try {
      await chrome.windows.get(storage.popupWindowId);
      await chrome.windows.update(storage.popupWindowId, { focused: true });
      return;
    } catch {
      await chrome.storage.local.remove('popupWindowId');
    }
  }

  // Fetch saved dimensions AND position
  const bounds = storage.windowBounds || {};
  const w = bounds.width ? Math.round(bounds.width) : 520;
  const h = bounds.height ? Math.round(bounds.height) : 720;

  const createOptions = {
    url: chrome.runtime.getURL("index.html"),
    type: "popup",
    width: w,
    height: h,
    focused: true
  };

  if (typeof bounds.left === 'number') createOptions.left = Math.round(bounds.left);
  if (typeof bounds.top === 'number') createOptions.top = Math.round(bounds.top);

  // Create the window
  const win = await chrome.windows.create(createOptions);
  await chrome.storage.local.set({ popupWindowId: win.id });
}


// --- 2. Event Listeners ---

// A. Trigger when the puzzle piece is clicked
chrome.action.onClicked.addListener(launchComets);

// B. Clean up tracker when window is closed
chrome.windows.onRemoved.addListener(async (closedWindowId) => {
  const { popupWindowId } = await chrome.storage.local.get('popupWindowId');
  if (closedWindowId === popupWindowId) {
    await chrome.storage.local.remove('popupWindowId');
  }
});

// C. Listen for the custom Ctrl + ` shortcut signal from websites
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_comets") {
    console.log("comets: Signal received! Launching window...");
    launchComets().catch(err => console.error("comets Window Error:", err));
  }
});