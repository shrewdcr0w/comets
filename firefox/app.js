let allSnippets = [];
let userStats = { bookmarks: {}, theme: 'theme-dark' };
let activeSection = 'all';

// --- 1. Boot ---
async function boot() {

  await chrome.storage.local.clear();
  // We no longer need to fetch windowBounds here! background.js handles it.
  const storage = await chrome.storage.local.get(['snippets', 'bookmarks', 'theme', 'fontSize']);
  
  // 2. Load Data from /data/snippets.json
  if (!storage.snippets) {
    try {
      const response = await fetch('/data/snippets.json');
      allSnippets = await response.json();
    } catch (e) {
      console.warn("Could not load data/snippets.json. Loading defaults instead.", e);
      allSnippets = [
        { id: "1", section: "windows", title: "Find Process by Port", description: "PowerShell command to find PID", code: "Get-Process -Id (Get-NetTCPConnection -LocalPort <port>).OwningProcess" },
        { id: "2", section: "linux", title: "Find Process by Port", description: "Bash command to find PID", code: "lsof -i :<port>" }
      ];
    }
    chrome.storage.local.set({ snippets: allSnippets });
  } else {
    allSnippets = storage.snippets;
  }

  userStats.bookmarks = storage.bookmarks || {};
  
  if (storage.theme) {
    document.body.className = storage.theme;
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = storage.theme;
  }
  
  if (storage.fontSize) {
    document.documentElement.style.setProperty('--font-base', storage.fontSize);
  }
  
  render();
}

// --- 2. HTML Escaping Helper ---
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- 3. Rendering Logic ---
function render() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const container = document.getElementById('list-container');
  
  let filtered = allSnippets.filter(s => {
    if (activeSection === 'bookmarks' && !userStats.bookmarks[s.id]) return false;
    if (activeSection !== 'all' && activeSection !== 'bookmarks' && s.section !== activeSection) return false;
    if (query) {
      const kw = Array.isArray(s.keywords) ? s.keywords.join(' ') : '';
      const haystack = `${s.title} ${s.description} ${s.code} ${kw}`.toLowerCase();
    return haystack.includes(query);
}
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p style="color:var(--text-dim); text-align:center; padding:20px;">No commands found.</p>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="command-card">
      <div class="card-header">
        <span class="card-title">${escapeHtml(item.title)}</span>
        <button class="bookmark-btn ${userStats.bookmarks[item.id] ? 'bookmarked' : ''}" data-id="${item.id}">
          ${userStats.bookmarks[item.id] ? '★ SAVED' : '☆ SAVE'}
        </button>
      </div>
      <p style="margin:0; font-size:0.9em; color:var(--text-dim)">${escapeHtml(item.description || '')}</p>
      <div class="code-box">
        <code>${escapeHtml(item.code)}</code>
        <button class="copy-btn" data-code="${encodeURIComponent(item.code)}">COPY</button>
      </div>
    </div>
  `).join('');
}

// --- 4. Event Listeners ---
document.getElementById('search-input').addEventListener('input', render);

document.getElementById('section-nav').addEventListener('click', (e) => {
  if (e.target.classList.contains('nav-tab')) {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    activeSection = e.target.getAttribute('data-sec');
    render();
  }
});

const themeSelect = document.getElementById('theme-select');
if (themeSelect) {
  themeSelect.addEventListener('change', (e) => {
    document.body.className = e.target.value;
    chrome.storage.local.set({ theme: e.target.value });
  });
}

document.getElementById('open-dashboard').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('list-container').addEventListener('click', async (e) => {
  if (e.target.classList.contains('copy-btn')) {
    const code = decodeURIComponent(e.target.getAttribute('data-code'));
    await navigator.clipboard.writeText(code);
    const originalText = e.target.innerText;
    e.target.innerText = 'COPIED';
    setTimeout(() => e.target.innerText = originalText, 1000);
  }
  
  if (e.target.classList.contains('bookmark-btn')) {
    const id = e.target.getAttribute('data-id');
    if (userStats.bookmarks[id]) delete userStats.bookmarks[id];
    else userStats.bookmarks[id] = true;
    
    chrome.storage.local.set({ bookmarks: userStats.bookmarks });
    render();
  }
});

// --- 5. Zoom Controls ---
function changeZoom(delta) {
  const root = document.documentElement;
  let currentSize = parseInt(getComputedStyle(root).getPropertyValue('--font-base')) || 14;
  let newSize = Math.max(10, Math.min(24, currentSize + delta));
  
  root.style.setProperty('--font-base', `${newSize}px`);
  chrome.storage.local.set({ fontSize: `${newSize}px` });
}

document.getElementById('zoom-in').addEventListener('click', () => changeZoom(2));
document.getElementById('zoom-out').addEventListener('click', () => changeZoom(-2));

// --- 6. Live Storage Sync ---
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.snippets) {
      allSnippets = changes.snippets.newValue || [];
      render();
    }
    if (changes.bookmarks) {
      userStats.bookmarks = changes.bookmarks.newValue || {};
      render();
    }
  }
});

// --- 7. Bulletproof Window Layout Tracking ---
let saveTimeout = null;
let lastBoundsStr = "";

function saveBounds() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    // Exclude minimized states (-32000 coordinates on Windows)
    if (window.screenX <= -32000 || window.screenY <= -32000) return;
    
    const currentBounds = {
      left: Math.round(window.screenX),
      top: Math.round(window.screenY),
      width: Math.round(window.outerWidth),
      height: Math.round(window.outerHeight)
    };

    const boundsString = JSON.stringify(currentBounds);
    
    // Only write to local storage if it actually moved or resized
    if (lastBoundsStr !== boundsString) {
      lastBoundsStr = boundsString;
      await chrome.storage.local.set({ windowBounds: currentBounds });
    }
  }, 300);
}

window.addEventListener('resize', saveBounds);
setInterval(saveBounds, 1000); // Polling catches drag-and-drop moves safely

// Initialize application
boot();