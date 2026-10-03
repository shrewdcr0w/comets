document.getElementById('save-btn').addEventListener('click', async () => {
  const storage = await chrome.storage.local.get(['snippets']);
  const snippets = storage.snippets || [];
  
  const newSnippet = {
    id: "cmd_" + Date.now(),
    title: document.getElementById('add-title').value,
    section: document.getElementById('add-section').value,
    description: document.getElementById('add-desc').value,
    code: document.getElementById('add-code').value
  };
  
  if (!newSnippet.title || !newSnippet.code) return alert("Title and Code are required.");
  
  snippets.push(newSnippet);
  await chrome.storage.local.set({ snippets });
  
  document.getElementById('status-msg').innerText = "Snippet saved successfully!";
  setTimeout(() => document.getElementById('status-msg').innerText = "", 2000);
  
  // Clear inputs
  document.querySelectorAll('input[type="text"], textarea').forEach(el => el.value = '');
});