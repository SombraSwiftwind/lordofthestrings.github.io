// app-windows.js
// Builds the 16x32 grid, sizes cells, and handles opening simple app windows on double-click.

document.addEventListener('DOMContentLoaded', () => {
  // show initial loading screen for 5s centered gif
  (function showInitialLoading() {
    try {
      const ls = document.createElement('div');
      ls.className = 'loading-screen';
      const gif = document.createElement('img');
      gif.src = 'images/win10_assets/just-a-moment-loading.gif';
      gif.alt = 'Loading';
      ls.appendChild(gif);
      document.body.appendChild(ls);
      // remove after 5 seconds with a small fade
      setTimeout(() => {
        ls.classList.add('loading-screen--hide');
        setTimeout(() => {
          ls.remove();
          try {
            // signal other code that the desktop finished loading
            document.dispatchEvent(new Event('desktop:loaded'));
            // set a flag so late listeners can detect it
            window.__desktopLoaded = true;
          } catch (err) {
            console.warn('desktop loaded event dispatch failed', err);
          }
        }, 360);
      }, 5000);
    } catch (err) {
      console.warn('loading screen failed', err);
    }
  })();

  

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

  // Open a search window showing Bing results for a query.
  function openSearchWindow(query) {
    if (!query) return;
    const title = `Bing: ${query}`;
    const win = document.createElement('div');
    win.className = 'window';
    win.style.width = '1000px';
    win.style.height = '600px';
    win.style.maxWidth = 'none';
    const winId = 'win-search-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
    win.dataset.winId = winId;
    win.innerHTML = `
      <div class="titlebar">
        <div class="title">${title}</div>
        <div class="controls">
          <div class="win-btn minimize" title="Minimize">—</div>
          <div class="win-btn maximize" title="Maximize">▢</div>
          <div class="win-btn close" title="Close">✕</div>
        </div>
      </div>
      <div class="content" style="padding:0; height: calc(100% - 40px);">
        <iframe class="search-iframe" src="https://www.bing.com/search?q=${encodeURIComponent(query)}" style="border:0; width:100%; height:100%;"></iframe>
      </div>
    `;
    // append and focus
    desktop.appendChild(win);
    win.tabIndex = -1; win.focus();
    window.__winZ = window.__winZ || 20000; win.style.zIndex = ++window.__winZ;
    win.addEventListener('pointerdown', () => { win.style.zIndex = ++window.__winZ; }, { passive: true });

    const taskbar = document.querySelector('.taskbar');
    const taskbarRight = taskbar ? taskbar.querySelector('.tb-right') : null;

    // CLOSE
    const btnClose = win.querySelector('.win-btn.close');
    btnClose.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      // remove taskbar item if any
      const containerForTb = taskbarRight || taskbar;
      const existing = containerForTb ? Array.from(containerForTb.children).find(c => c.dataset && c.dataset.winId === winId) : null;
      if (existing) existing.remove();
      win.remove();
    });

    // MINIMIZE
    const btnMin = win.querySelector('.win-btn.minimize');
    btnMin.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      const containerForTb = taskbarRight || taskbar;
      const existingTb = containerForTb ? Array.from(containerForTb.children).find(c => c.dataset && c.dataset.winId === winId) : null;
      if (existingTb) { win.style.display = 'none'; win.hidden = true; return; }
      const tb = document.createElement('div'); tb.className = 'tb-item'; tb.dataset.winId = winId; tb.textContent = title;
      tb.addEventListener('pointerdown', (tev) => { tev.stopPropagation(); tev.preventDefault(); win.style.display = ''; win.hidden = false; win.style.zIndex = ++window.__winZ; tb.remove(); });
      (taskbarRight || taskbar).appendChild(tb);
      win.style.display = 'none'; win.hidden = true;
    });

    // MAXIMIZE / RESTORE
    const btnMax = win.querySelector('.win-btn.maximize');
    btnMax.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      const isMax = win.classList.contains('maximized');
      const taskbarEl = document.querySelector('.taskbar');
      const taskbarHeight = taskbarEl ? taskbarEl.getBoundingClientRect().height : 0;
      if (!isMax) {
        win.dataset._prev = JSON.stringify({ left: win.style.left || '', top: win.style.top || '', width: win.style.width || '', height: win.style.height || '', transform: win.style.transform || '' });
        win.classList.add('maximized'); win.style.left = '0'; win.style.top = '0'; win.style.transform = 'none'; win.style.width = '100vw'; win.style.height = `calc(100vh - ${taskbarHeight}px)`;
      } else {
        const prev = win.dataset._prev ? JSON.parse(win.dataset._prev) : {}; win.classList.remove('maximized'); win.style.left = prev.left || ''; win.style.top = prev.top || ''; win.style.width = prev.width || '300px'; win.style.height = prev.height || '600px'; win.style.transform = prev.transform || 'translate(-50%, -50%)'; delete win.dataset._prev;
      }
    });
  }

  // Frustrating search: reverse input text as the user types
  (function frustratingSearch() {
    try {
      const search = document.querySelector('.taskbar-search');
      if (!search) return;
      let composing = false;
      // For IME support: do not transform during composition
      search.addEventListener('compositionstart', () => { composing = true; });
      search.addEventListener('compositionend', () => { composing = false; /* apply final reverse */ search.value = String(search.value).split('').reverse().join(''); });

      search.addEventListener('input', (e) => {
        if (composing) return;
        // reverse entire value to make the input 'frustrating'
        const v = String(search.value || '');
        const rev = v.split('').reverse().join('');
        // set only if different to avoid extra events
        if (rev !== v) search.value = rev;
      });

      // optional: keep caret at end (we force end position)
      search.addEventListener('keydown', () => { setTimeout(() => { try { search.selectionStart = search.selectionEnd = search.value.length; } catch (err) {} }, 0); });
      // on Enter, open search window and a browser tab with Bing results
      search.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !composing) {
          const q = String(search.value || '').trim();
          if (q.length > 0) {
            ev.preventDefault();
            try { openSearchWindow(q); } catch (err) { console.warn('openSearchWindow failed', err); }
          }
        }
      });
    } catch (err) {
      console.warn('Frustrating search init failed', err);
    }
  })();

  // Notifications system (only active on Win10 desktop pages)
  (function initNotifications() {
    try {
      // run only when body has win10-bg class
      if (!document.body.classList.contains('win10-bg')) return;

      const area = document.createElement('div');
      area.className = 'notification-area';
      document.body.appendChild(area);

      let notifCount = 0;
      const MAX_NOTIFS = 8;

      function startNotifications() {
        // create the first one immediately
        const first = sampleMsgs[0]; createNotification(first[0], first[1], 'images/win10_assets/Windows_logo_w.svg');
        // spawn a notification every 10s
        setInterval(() => {
          const idx = Math.floor(Math.random() * sampleMsgs.length);
          const s = sampleMsgs[idx];
          // optionally use Windows logo as icon
          createNotification(s[0], s[1], 'images/win10_assets/Windows_logo_w.svg');
        }, 10000);
      }

      function createNotification(title, body, iconSrc) {
        const n = document.createElement('div');
        n.className = 'notification';

        const ic = document.createElement('div');
        ic.className = 'notif-icon';
        if (iconSrc) {
          const im = document.createElement('img');
          im.src = iconSrc;
          im.alt = '';
          im.style.width = '28px';
          im.style.height = '28px';
          ic.appendChild(im);
        }

        const txt = document.createElement('div');
        txt.className = 'notif-text';
        const t = document.createElement('div'); t.className = 'notif-title'; t.textContent = title || 'Notification';
        const b = document.createElement('div'); b.className = 'notif-body'; b.textContent = body || '';
        txt.appendChild(t); txt.appendChild(b);

        n.appendChild(ic);
        n.appendChild(txt);

        // append so DOM order + column-reverse placement produces
        // notifications stacked above previous ones (newer on top)
        area.appendChild(n);

        notifCount++;

        function removeNotification(el) {
          if (!el) return;
          el.classList.add('removing');
          setTimeout(() => { if (el && el.parentElement) el.remove(); }, 240);
        }

        // if too many notifications, remove the oldest (bottom-most)
        if (area.children.length > MAX_NOTIFS) {
          const oldest = area.firstElementChild; // oldest is now firstElementChild due to append
          if (oldest) removeNotification(oldest);
        }

        // add a close button (top-right) — the only way to dismiss the notif
        const closeBtn = document.createElement('div');
        closeBtn.className = 'notif-close';
        closeBtn.title = 'Close';
        closeBtn.innerHTML = '✕';
        closeBtn.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); ev.preventDefault(); removeNotification(n); });
        n.appendChild(closeBtn);
      }

      // sample messages — you can customize these or replace with dynamic content
      const sampleMsgs = [
        ['Mise à jour', 'Votre système a installé une mise à jour.'],
        ['Courriel', 'Vous avez reçu un nouveau message.'],
        ['Rappel', 'Réunion dans 30 minutes.'],
        ['Sécurité', 'Un périphérique inattendu a été détecté.'],
        ['Sauvegarde', 'Sauvegarde terminée avec succès.']
      ];

      // start the notifications after the desktop loading screen finishes
      if (window.__desktopLoaded) {
        startNotifications();
      } else {
        document.addEventListener('desktop:loaded', startNotifications, { once: true });
      }
    } catch (err) {
      console.warn('Notifications init failed', err);
    }
  })();

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
      // add centered resistance message and clippy gif
      const centerWrap = document.createElement('div');
      centerWrap.className = 'start-panel-center';
      const resText = document.createElement('div');
      resText.className = 'resistance-text';
      resText.textContent = 'La Résistance commence! Quitte cet OS immédiatement et rejoins Linux!';
      const clippyImg = document.createElement('img');
      clippyImg.className = 'start-clippy';
      clippyImg.src = 'images/win10_assets/clippy.gif';
      clippyImg.alt = 'clippy';
      centerWrap.appendChild(resText);
      centerWrap.appendChild(clippyImg);
      panel.appendChild(centerWrap);
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

      // shutdown action: show persistent shutdown page with process list
      shutdown.addEventListener('pointerdown', (sev) => {
        sev.stopPropagation(); sev.preventDefault();
        const ok = confirm('Voulez-vous éteindre ?');
        if (!ok) return;
        // remove the start panel
        if (panel && panel.parentElement) panel.remove();

        // build shutdown page
        const shutdownPage = document.createElement('div');
        shutdownPage.className = 'shutdown-page';
        shutdownPage.tabIndex = -1;

        const container = document.createElement('div');
        container.className = 'shutdown-container';

        const header = document.createElement('div');
        header.className = 'shutdown-header';
        header.textContent = 'Closing 0 app and shutting down';
        container.appendChild(header);

        const list = document.createElement('div');
        list.className = 'shutdown-list';

        // controls will be fixed at bottom
        const controls = document.createElement('div');
        controls.className = 'shutdown-controls fixed-bottom';
        const btn = document.createElement('button');
        btn.className = 'shutdown-btn';
        btn.type = 'button';
        btn.textContent = 'Shut down anyway';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'shutdown-cancel';
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        controls.appendChild(cancelBtn);
        controls.appendChild(btn);

        container.appendChild(list);
        shutdownPage.appendChild(container);
        // controls are fixed; append them to the shutdown page so they are in the DOM
        shutdownPage.appendChild(controls);
        document.body.appendChild(shutdownPage);

        // pick apps (exclude bin)
        const apps = Array.from(document.querySelectorAll('.app')).filter(a => a.id !== 'bin');
        function addProcessFromRandomApp() {
          if (!apps || apps.length === 0) return;
          const a = apps[Math.floor(Math.random() * apps.length)];
          const proc = document.createElement('div');
          proc.className = 'proc-item';
          const iconWrap = document.createElement('div');
          iconWrap.className = 'proc-icon';
          const iconEl = a.querySelector('img, svg');
          if (iconEl) {
            if (iconEl.tagName.toLowerCase() === 'img') {
              const im = document.createElement('img');
              im.src = iconEl.src;
              im.alt = iconEl.alt || '';
              iconWrap.appendChild(im);
            } else {
              const clone = iconEl.cloneNode(true);
              // ensure svg sizing
              clone.style.width = '24px'; clone.style.height = '24px';
              iconWrap.appendChild(clone);
            }
          } else {
            const ph = document.createElement('div');
            ph.style.width = '28px'; ph.style.height = '28px'; ph.style.background = 'rgba(255,255,255,0.12)'; ph.style.borderRadius = '6px';
            iconWrap.appendChild(ph);
          }

          const nameWrap = document.createElement('div');
          nameWrap.className = 'proc-name';
          const name = (a.querySelector('.appName') && a.querySelector('.appName').textContent.trim()) || a.id || 'App';
          nameWrap.textContent = name;

          proc.appendChild(iconWrap);
          proc.appendChild(nameWrap);
          list.appendChild(proc);
          // scroll to bottom so newest is visible
          list.scrollTop = list.scrollHeight;
          // update header count
          if (typeof updateHeader === 'function') updateHeader();
          // track how many processes have been spawned in total
          try {
            spawnedCount = (typeof spawnedCount === 'number') ? spawnedCount + 1 : 1;
          } catch (err) {
            spawnedCount = 1;
          }
          // if we've reached the maximum allowed spawns, stop the spawner
          if (spawnedCount >= MAX_SPAWN) {
            spawnedCount = MAX_SPAWN;
            maxReached = true;
            if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
          }
        }

        function updateHeader() {
          const n = list.children.length;
          header.textContent = `Closing ${n} apps and shutting down`;
          // if we've previously reached the spawn maximum and the user
          // has reduced the visible list to zero, show the final shutdown
          // overlay. This ensures the overlay appears whether the last
          // removal happened via the button or other UI actions.
          try {
            if (typeof showFinalShutdown === 'function' && maxReached && n === 0) {
              showFinalShutdown();
            }
          } catch (err) {
            console.warn('Error checking final shutdown condition', err);
          }
        }

        // spawning control variables
        let spawnInterval = 500; // start at 500ms
        let spawnTimer = null;
        let spawnedCount = 0;
        const MAX_SPAWN = 150;
        let maxReached = false;

        function startSpawner() {
          if (spawnTimer) return;
          // guard: don't start if already at max
          if (maxReached) return;
          spawnTimer = setInterval(() => {
            addProcessFromRandomApp();
          }, spawnInterval);
        }

        function restartSpawner() {
          if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
          if (maxReached) return;
          spawnTimer = setInterval(() => addProcessFromRandomApp(), spawnInterval);
        }

        // show the final fullscreen shutdown overlay (when max reached and list emptied)
        function showFinalShutdown() {
          try {
            if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
            // remove the shutdown page to avoid layering issues
            if (shutdownPage && shutdownPage.parentElement) shutdownPage.remove();

            const overlay = document.createElement('div');
            overlay.className = 'final-shutdown-overlay';
            // initial background is the blue page color (CSS covers core styling)
            overlay.style.zIndex = 999999;

            const img = document.createElement('img');
            img.className = 'final-shutdown-gif';
            // use the shipped asset (note spelling in file name)
            img.src = 'images/win10_assets/shuttting_down.gif';
            img.alt = 'Shutting down';
            overlay.appendChild(img);

            document.body.appendChild(overlay);

            // Sequence: show GIF for 3s, then black screen for 2s, then show link
            setTimeout(() => {
              // switch to black background
              overlay.classList.add('final-shutdown-black');
              // remove the gif to reveal the black screen
              if (img && img.parentElement) img.remove();

              // after 2s of black screen, automatically redirect to ubuntuView.html
              setTimeout(() => {
                try {
                  window.location.href = 'ubuntuView.html';
                } catch (err) {
                  // fallback: create a visible link if redirect is blocked
                  const a = document.createElement('a');
                  a.href = 'ubuntuView.html';
                  a.className = 'final-shutdown-link visible';
                  a.textContent = 'Continuer vers Ubuntu View';
                  overlay.appendChild(a);
                }
              }, 2000);
            }, 3000);
          } catch (err) {
            console.warn('Failed to show final shutdown overlay', err);
          }
        }

        btn.addEventListener('pointerdown', (e) => {
          e.stopPropagation(); e.preventDefault();
          // remove the topmost process if exists
          if (list.firstElementChild) list.removeChild(list.firstElementChild);

          // update header after removal
          updateHeader();

          // start spawner on first click
          if (!spawnTimer && !maxReached) {
            startSpawner();
          }

          // decrease interval by 200ms on each click until 150ms
          const newInterval = Math.max(250, spawnInterval - 50);
          if (newInterval !== spawnInterval) {
            spawnInterval = newInterval;
            restartSpawner();
          }

          // if spawner previously reached max and now player reduced list to 0, show final shutdown
          if (maxReached && list.children.length === 0) {
            showFinalShutdown();
          }
        });

        // cancel returns to desktop and clears timers
        cancelBtn.addEventListener('pointerdown', (e) => {
          e.stopPropagation(); e.preventDefault();
          if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
          if (shutdownPage && shutdownPage.parentElement) shutdownPage.remove();
        });

        // add one initial process on open and update header
        addProcessFromRandomApp();
        updateHeader();
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
    win.style.width = '1000px';
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
