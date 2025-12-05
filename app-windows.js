// app-windows.js
// Builds the 16x32 grid, sizes cells, and handles opening simple app windows on double-click.

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.grid');
  const desktop = document.querySelector('.desktop');
  if (!grid || !desktop) return;

  const COLS = 16;
  const ROWS = 32;
  const TOTAL = COLS * ROWS;

  // Keep existing `.app` elements in place so CSS grid positioning (via
  // selectors like `#word { grid-column: X; grid-row: Y; }`) continues to work.
  // We only compute cell sizing here so icon sizes adapt to the grid cell.
  const existingApps = Array.from(grid.querySelectorAll('.app'));
  // guard against rapid duplicate opens (dblclick + click fallback)
  const _lastOpen = new WeakMap();

  // compute cell size so 16x32 fits desktop area
  function computeCellSize() {
    const gridStyle = getComputedStyle(grid);
    const gap = parseFloat(gridStyle.gap) || 0;
    const desktopRect = desktop.getBoundingClientRect();
    const taskbar = document.querySelector('.taskbar');
    const taskbarRight = taskbar ? taskbar.querySelector('.tb-right') : null;
    const taskbarHeight = taskbar ? taskbar.getBoundingClientRect().height : 0;
    const availW = desktopRect.width - (parseFloat(gridStyle.paddingLeft) || 0) - (parseFloat(gridStyle.paddingRight) || 0);
    const availH = desktopRect.height - taskbarHeight - (parseFloat(gridStyle.paddingTop) || 0) - (parseFloat(gridStyle.paddingBottom) || 0);
    const cellW = Math.floor((availW - (COLS - 1) * gap) / COLS);
    const cellH = Math.floor((availH - (ROWS - 1) * gap) / ROWS);
    const size = Math.max(20, Math.min(cellW, cellH));
    grid.style.setProperty('--cell-size', size + 'px');
  }

  computeCellSize();
  window.addEventListener('resize', computeCellSize);

  // START button behavior: open a fixed black panel anchored to bottom-left (next to taskbar)
  const startBtn = document.querySelector('.start-btn');
  if (startBtn) {
    startBtn.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      const existing = document.querySelector('.start-panel');
      const taskbarEl = document.querySelector('.taskbar');
      const taskbarHeight = taskbarEl ? taskbarEl.getBoundingClientRect().height : 0;
      if (existing) {
        existing.remove();
        return;
      }
      const panel = document.createElement('div');
      panel.className = 'start-panel';
      panel.style.position = 'fixed';
      panel.style.left = '0px';
      panel.style.bottom = `${taskbarHeight}px`;
      panel.style.width = '800px';
      panel.style.height = '700px';
      panel.style.background = '#1b1b1bff';
      panel.style.zIndex = ++window.__winZ;
      panel.tabIndex = -1;
      // add shutdown button at bottom-left
      const shutdown = document.createElement('button');
      shutdown.className = 'start-shutdown';
      shutdown.type = 'button';
      shutdown.title = 'Shutdown';
      const img = document.createElement('img');
      img.src = 'images/win10_assets/shutdown.svg';
      img.alt = 'Shutdown';
      img.width = 20;
      img.height = 20;
      shutdown.appendChild(img);
      panel.appendChild(shutdown);

      // shutdown action: confirm then show temporary shutting down overlay
      shutdown.addEventListener('pointerdown', (sev) => {
        sev.stopPropagation(); sev.preventDefault();
        const ok = confirm('Voulez-vous éteindre ?');
        if (!ok) return;
        const overlay = document.createElement('div');
        overlay.className = 'shutdown-overlay';
        overlay.textContent = 'Shutting down…';
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = '#000';
        overlay.style.color = '#fff';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.fontSize = '20px';
        overlay.style.zIndex = ++window.__winZ;
        document.body.appendChild(overlay);
        // remove panel and overlay after a short delay
        if (panel && panel.parentElement) panel.remove();
        setTimeout(() => overlay.remove(), 1200);
      });

      desktop.appendChild(panel);
    });
  }

  // open a simple window for the clicked app
  function openWindowForApp(app) {
    // Block opening a window for the Recycle Bin (id="bin")
    if (app && app.id === 'bin') return;
    // debounce per app: ignore if opened very recently
    const now = Date.now();
    const last = _lastOpen.get(app) || 0;
    if (now - last < 600) return; // ignore duplicate open within 600ms
    _lastOpen.set(app, now);
    const nameEl = app.querySelector('.appName');
    const title = nameEl ? nameEl.textContent.trim() : (app.querySelector('img')?.alt || 'App');

    const win = document.createElement('div');
    win.className = 'window';
    // Force size 300x600 as requested
    win.style.width = '300px';
    win.style.height = '600px';
    // ensure CSS max-width doesn't override our explicit size
    win.style.maxWidth = 'none';
    win.innerHTML = `
      <div class="titlebar">
        <div class="title">${title}</div>
        <div class="controls">
          <div class="win-btn minimize" title="Minimize">—</div>
          <div class="win-btn maximize" title="Maximize">▢</div>
          <div class="win-btn close" title="Close">✕</div>
        </div>
      </div>
      <div class="content"><p>Fenêtre ouverte pour <strong>${title}</strong>. Ceci est un paragraphe d'exemple.</p></div>
    `;

    // unique id for taskbar mapping
    const winId = 'win-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
    win.dataset.winId = winId;

    // append before wiring handlers so querySelector works
    desktop.appendChild(win);
    // make window focusable and put focus on it so first click interactions register
    win.tabIndex = -1;
    win.focus();
    // ensure clicking brings window to front
    window.__winZ = window.__winZ || 20000;
    win.style.zIndex = ++window.__winZ;
    // bring to front on pointerdown (runs before focus change)
    win.addEventListener('pointerdown', () => {
      win.style.zIndex = ++window.__winZ;
    }, { passive: true });

    const taskbar = document.querySelector('.taskbar');
    const taskbarRight = taskbar ? taskbar.querySelector('.tb-right') : null;

    // helper to remove any taskbar item for this window
    function removeTaskbarItem() {
      const containerForTb = taskbarRight || taskbar;
      if (!containerForTb) return;
      const existing = Array.from(containerForTb.children).find(c => c.dataset && c.dataset.winId === winId);
      if (existing) existing.remove();
    }

    // CLOSE
    const btnClose = win.querySelector('.win-btn.close');
    btnClose.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      removeTaskbarItem();
      win.remove();
    });

    // MINIMIZE -> hide window and create taskbar button to restore
    const btnMin = win.querySelector('.win-btn.minimize');
    btnMin.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      if (!taskbar) {
        win.style.display = 'none';
        win.hidden = true;
        return;
      }
      // check for existing tb item by dataset to avoid selector pitfalls
      const containerForTb = taskbarRight || taskbar;
      const existingTb = containerForTb ? Array.from(containerForTb.children).find(c => c.dataset && c.dataset.winId === winId) : null;
      if (existingTb) {
        // already have a taskbar item; just hide the window
        win.style.display = 'none';
        win.hidden = true;
        return;
      }
      const tb = document.createElement('div');
      tb.className = 'tb-item';
      tb.dataset.winId = winId;
      tb.textContent = title;
      tb.addEventListener('pointerdown', (tev) => {
        tev.stopPropagation(); tev.preventDefault();
        win.style.display = '';
        win.hidden = false;
        // bring to front
        win.style.zIndex = ++window.__winZ;
        tb.remove();
      });
      (taskbarRight || taskbar).appendChild(tb);
      // hide the window in two ways to be robust across browsers
      win.style.display = 'none';
      win.hidden = true;
    });

    // MAXIMIZE / RESTORE
    const btnMax = win.querySelector('.win-btn.maximize');
    btnMax.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      const isMax = win.classList.contains('maximized');
      const taskbarEl = document.querySelector('.taskbar');
      const taskbarHeight = taskbarEl ? taskbarEl.getBoundingClientRect().height : 0;
      if (!isMax) {
        // save current inline styles to restore later
        win.dataset._prev = JSON.stringify({
          left: win.style.left || '',
          top: win.style.top || '',
          width: win.style.width || '',
          height: win.style.height || '',
          transform: win.style.transform || ''
        });
        win.classList.add('maximized');
        // ensure it fills viewport minus taskbar
        win.style.left = '0';
        win.style.top = '0';
        win.style.transform = 'none';
        win.style.width = '100vw';
        win.style.height = `calc(100vh - ${taskbarHeight}px)`;
      } else {
        // restore
        const prev = win.dataset._prev ? JSON.parse(win.dataset._prev) : {};
        win.classList.remove('maximized');
        win.style.left = prev.left || '';
        win.style.top = prev.top || '';
        win.style.width = prev.width || '300px';
        win.style.height = prev.height || '600px';
        win.style.transform = prev.transform || 'translate(-50%, -50%)';
        delete win.dataset._prev;
      }
    });
  }

  grid.addEventListener('dblclick', (e) => {
    const app = e.target.closest('.app');
    if (!app) return;
    openWindowForApp(app);
  });

  // fallback: double click detection via click.detail
  grid.addEventListener('click', (e) => {
    if (e.detail === 2) {
      const app = e.target.closest('.app');
      if (!app) return;
      openWindowForApp(app);
    }
  });

  // helper to programmatically add apps to a grid position (index -> col/row)
  window.addAppToGrid = function (appEl, index) {
    if (!appEl) return;
    const targetIndex = Math.max(0, Math.min(TOTAL - 1, index || 0));
    const col = (targetIndex % COLS) + 1;
    const row = Math.floor(targetIndex / COLS) + 1;
    appEl.style.gridColumn = String(col);
    appEl.style.gridRow = String(row);
    grid.appendChild(appEl);
  };
});
