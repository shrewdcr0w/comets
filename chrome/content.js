console.log("comets: Content script loaded and listening!");

document.addEventListener('keydown', (e) => {
// e.code is strictly the physical key, ignoring language layouts
if ((e.ctrlKey || e.metaKey) && e.code === 'Backquote') {
console.log("comets: Shortcut pressed! Sending signal...");
e.preventDefault();
chrome.runtime.sendMessage({ action: "open_comets" });
}
});