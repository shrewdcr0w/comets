chrome.action.onClicked.addListener(async () => {
  const storage = await chrome.storage.local.get(['popupWindowId', 'windowBounds']);
  
  // 1. Bring to front if already open (Survives background sleeping)
  if (storage.popupWindowId) {
    try {
      // Verify window actually still exists in the OS
      await chrome.windows.get(storage.popupWindowId);
      await chrome.windows.update(storage.popupWindowId, { focused: true });
      return;
    } catch {
      // Window was closed by user, clear the dead ID
      await chrome.storage.local.remove('popupWindowId');
    }
  }

  // 2. Fetch saved dimensions AND position
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

  // Only apply X/Y coordinates if they exist
  if (typeof bounds.left === 'number') createOptions.left = Math.round(bounds.left);
  if (typeof bounds.top === 'number') createOptions.top = Math.round(bounds.top);

  // 3. Create the window and save its new ID to storage
  const win = await chrome.windows.create(createOptions);
  await chrome.storage.local.set({ popupWindowId: win.id });
});

// Clean up tracker when window is closed
chrome.windows.onRemoved.addListener(async (closedWindowId) => {
  const { popupWindowId } = await chrome.storage.local.get('popupWindowId');
  if (closedWindowId === popupWindowId) {
    await chrome.storage.local.remove('popupWindowId');
  }
});