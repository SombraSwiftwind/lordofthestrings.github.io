// js/ubuntu.js
// Adds a fake Konsole terminal window on double-click in ubuntuView.html

document.addEventListener('DOMContentLoaded', () => {
  const konsoleApp = document.querySelector('.app#Konsole');
  const desktop = document.querySelector('.desktop') || document.body;

  // show a small welcome/resistance window on Ubuntu open
  function showUbuntuWelcome() {
    try {
      window.__winZ = window.__winZ || 20000;
      const w = document.createElement('div');
      w.className = 'window';
      w.style.width = '520px';
      w.style.height = '180px';
      w.style.zIndex = ++window.__winZ;
      w.tabIndex = -1;
      w.innerHTML = `
        <div class="titlebar">
          <div class="title">La Résistance</div>
          <div class="controls">
            <div class="win-btn close" title="Fermer">✕</div>
          </div>
        </div>
        <div class="content" style="padding:14px; font-family: system-ui, monospace;">
          <div style="font-size:16px; font-weight:700; margin-bottom:8px;">Bienvenue</div>
          <div>Nous sommes au bon endroit pour lutter contre les Big Tech.</div>
        </div>
      `;
      desktop.appendChild(w);
      // bring to front on pointerdown
      w.addEventListener('pointerdown', () => { w.style.zIndex = ++window.__winZ; });
      const btnClose = w.querySelector('.win-btn.close');
      btnClose.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); ev.preventDefault(); w.remove(); });
    } catch (e) { /* ignore errors */ }
  }
  showUbuntuWelcome();

  function openTerminal() {
    // debounce: avoid multiple opens when double events fire
    const now = Date.now();
    if (!openTerminal._last) openTerminal._last = 0;
    if (now - openTerminal._last < 300) return;
    openTerminal._last = now;

    const termWin = document.createElement('div');
    termWin.className = 'window';
    termWin.style.width = '700px';
    termWin.style.height = '420px';
    termWin.style.maxWidth = 'calc(100vw - 40px)';
    termWin.style.maxHeight = 'calc(100vh - 100px)';

    window.__winZ = window.__winZ || 20000;
    termWin.style.zIndex = ++window.__winZ;
    termWin.tabIndex = -1;

    termWin.innerHTML = `
      <div class="titlebar">
        <div class="title">Konsole</div>
        <div class="controls">
          <div class="win-btn minimize" title="Minimize">—</div>
          <div class="win-btn maximize" title="Maximize">▢</div>
          <div class="win-btn close" title="Close">✕</div>
        </div>
      </div>
      <div class="content" style="padding:0; display:flex; flex-direction:column; height: calc(100% - 40px); background: #0b0b0b; color: #e6e6e6; font-family: monospace;">
        <div class="terminal-output" style="padding:12px; overflow:auto; flex:1 1 auto; white-space:pre-wrap; font-size:13px; line-height:1.4;"></div>
        <div style="padding:8px; border-top:1px solid rgba(255,255,255,0.04); display:flex; gap:8px; align-items:center;">
          <span style="color:#8bd18b; font-weight:700;">user@ubuntu:~$</span>
          <input class="terminal-input" type="text" style="flex:1; background:transparent; border:0; color:#fff; outline:none; font-family: monospace; font-size:13px;" />
        </div>
      </div>
    `;

    // append to desktop
    desktop.appendChild(termWin);
    // focus input
    const input = termWin.querySelector('.terminal-input');
    const output = termWin.querySelector('.terminal-output');
    input.focus();

    // bring to front on pointerdown
    termWin.addEventListener('pointerdown', () => { termWin.style.zIndex = ++window.__winZ; });

    // basic command handling
    function printLine(text = '') {
      const line = document.createElement('div');
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    function handleCommand(cmd) {
      const c = (cmd || '').trim();
      if (!c) return;
      printLine('user@ubuntu:~$ ' + c);
      const parts = c.split(/\s+/);
      const base = parts[0];
      if (base === 'ls') {
        printLine('Desktop Documents Downloads Music Pictures Public Templates Videos');
      } else if (base === 'whoami') {
        printLine('user');
      } else if (base === 'pwd') {
        printLine('/home/user');
      } else if (base === 'clear') {
        output.innerHTML = '';
      } else if (base === 'help') {
        printLine('Available commands: ls, whoami, pwd, clear, help, echo');
      } else if (base === 'echo') {
        printLine(parts.slice(1).join(' '));
        } else if (base === 'snake') {
          // launch a simple snake game inside the terminal output area
          startSnakeGame();
      } else {
        printLine(base + ': command not found');
      }
    }

      // Snake game implementation
      function startSnakeGame() {
        if (termWin._snakeActive) return;
        termWin._snakeActive = true;
        input.disabled = true;
        output.innerHTML = '';

        // create canvas
        const canvas = document.createElement('canvas');
        canvas.className = 'snake-canvas';
        canvas.style.background = '#000';
        canvas.style.display = 'block';
        output.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const cell = 16;
        // compute size so that canvas dimensions are exact multiples of cell
        const rect = output.getBoundingClientRect();
        // compute border thickness from computed style (accounts for CSS .snake-canvas)
        const cs = getComputedStyle(canvas);
        const borderW = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
        const borderH = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
        const availableW = Math.max(240, Math.floor(rect.width - borderW));
        const availableH = Math.max(160, Math.floor(rect.height - borderH));
        let cols = Math.max(1, Math.floor(availableW / cell));
        let rows = Math.max(1, Math.floor(availableH / cell));
        canvas.width = cols * cell;
        canvas.height = rows * cell;
        // set style size to match drawing buffer (avoid CSS scaling)
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';

        let snake = [{x: Math.floor(cols/2), y: Math.floor(rows/2)}];
        let dir = {x: 1, y: 0};
        let food = null;
        let alive = true;
        let score = 0;

        function placeFood() {
          // always compute using current canvas resolution to avoid off-canvas spawns
          const maxCols = Math.max(1, Math.floor(canvas.width / cell));
          const maxRows = Math.max(1, Math.floor(canvas.height / cell));
          let attempts = 0;
          while (true) {
            const fx = Math.floor(Math.random() * maxCols);
            const fy = Math.floor(Math.random() * maxRows);
            // safety: ensure food inside bounds and not on the snake
            if (!snake.some(s => s.x === fx && s.y === fy)) { food = {x: fx, y: fy}; break; }
            if (++attempts > 200) { food = {x: 0, y: 0}; break; }
          }
          // clamp to current grid
          food.x = Math.max(0, Math.min(Math.floor(canvas.width/cell) - 1, food.x));
          food.y = Math.max(0, Math.min(Math.floor(canvas.height/cell) - 1, food.y));
        }
        placeFood();

        function draw() {
          // clear full canvas using its current dimensions
          ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
          // draw food
          if (food) { ctx.fillStyle = '#d9534f'; ctx.fillRect(food.x*cell, food.y*cell, cell, cell); }
          // draw snake
          ctx.fillStyle = '#5dd85d';
          for (let i=0;i<snake.length;i++) {
            const s = snake[i]; ctx.fillRect(s.x*cell+1, s.y*cell+1, cell-2, cell-2);
          }
          // score
          ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.fillText('Score: ' + score, 6, 14);
          // ensure terminal-output doesn't scroll and top wall stays visible
          try { output.scrollTop = 0; } catch (e) {}
        }

        function step() {
          if (!alive) return;
          // ensure cols/rows reflect current canvas size
          cols = Math.max(1, Math.floor(canvas.width / cell));
          rows = Math.max(1, Math.floor(canvas.height / cell));
          const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
          // collision with walls
          if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
            alive = false; endGame(); return;
          }
          // self collision
          if (snake.some(s => s.x === head.x && s.y === head.y)) { alive = false; endGame(); return; }
          snake.unshift(head);
          // eat food
          if (food && head.x === food.x && head.y === food.y) { score += 1; placeFood(); }
          else snake.pop();
          draw();
        }

        function endGame() {
          clearInterval(termWin._snakeTimer);
          termWin._snakeTimer = null;
          window.removeEventListener('keydown', termWin._snakeListener);
          window.removeEventListener('resize', termWin._snakeResizeListener);
          termWin._snakeActive = false;
          // restore terminal-output overflow and overscroll-behavior if we changed them
          try {
            if (typeof termWin._snakePrevOverflow !== 'undefined') output.style.overflow = termWin._snakePrevOverflow;
            if (typeof termWin._snakePrevOverscroll !== 'undefined') output.style.overscrollBehavior = termWin._snakePrevOverscroll;
          } catch (e) {}
          // remove canvas and print result
          setTimeout(() => {
            if (canvas && canvas.parentElement) canvas.remove();
            printLine('\nGame over. Score: ' + score);
            input.disabled = false; input.focus();
          }, 200);
        }

        // key listener (prevent default scrolling) — use Z Q S D for AZERTY layout
        termWin._snakeListener = function(e) {
          const k = (e.key || '').toLowerCase();
          // prevent default for arrow keys and our control keys
          if (['arrowup','arrowdown','arrowleft','arrowright','z','q','s','d','escape','q'].includes(k) || k === 'q') {
            try { e.preventDefault(); } catch (er) {}
          }
          if (k === 'arrowup' || k === 'z') { if (dir.y !== 1) dir = {x:0,y:-1}; }
          else if (k === 'arrowdown' || k === 's') { if (dir.y !== -1) dir = {x:0,y:1}; }
          else if (k === 'arrowleft' || k === 'q') { if (dir.x !== 1) dir = {x:-1,y:0}; }
          else if (k === 'arrowright' || k === 'd') { if (dir.x !== -1) dir = {x:1,y:0}; }
          else if (k === 'q' && (e.ctrlKey || e.metaKey)) { /* ignore ctrl+q */ }
          else if (k === 'escape' || k === 'q' && false) { alive = false; endGame(); }
          else if (k === 'q' && false) { /* noop placeholder */ }
          else if (k === 'q') { /* mapped above as left */ }
          else if (k === 'q') { /* keep */ }
          // allow 'q' as left per AZERTY mapping; use 'escape' to quit
          if (k === 'escape') { alive = false; endGame(); }
        };

        window.addEventListener('keydown', termWin._snakeListener);

        // responsive resize handler to keep canvas in-sync with the terminal output area
        termWin._snakeResizeListener = function() {
          const r = output.getBoundingClientRect();
          const cs2 = getComputedStyle(canvas);
          const bw = (parseFloat(cs2.borderLeftWidth) || 0) + (parseFloat(cs2.borderRightWidth) || 0);
          const bh = (parseFloat(cs2.borderTopWidth) || 0) + (parseFloat(cs2.borderBottomWidth) || 0);
          const availW = Math.max(240, Math.min(1200, Math.floor(r.width - bw)));
          const availH = Math.max(160, Math.min(window.innerHeight, Math.floor(r.height - bh)));
          const newCols = Math.max(1, Math.floor(availW / cell));
          const newRows = Math.max(1, Math.floor(availH / cell));
          const newWidth = newCols * cell;
          const newHeight = newRows * cell;
          // only change if different to avoid flicker
          if (canvas.width !== newWidth || canvas.height !== newHeight) {
            // set new drawing buffer and style size
            canvas.width = newWidth; canvas.height = newHeight;
            canvas.style.width = canvas.width + 'px'; canvas.style.height = canvas.height + 'px';
            cols = newCols; rows = newRows;
            // clamp positions
            snake.forEach(s => { s.x = Math.max(0, Math.min(cols-1, s.x)); s.y = Math.max(0, Math.min(rows-1, s.y)); });
            if (food) { food.x = Math.max(0, Math.min(cols-1, food.x)); food.y = Math.max(0, Math.min(rows-1, food.y)); }
            draw();
          }
        };
        window.addEventListener('resize', termWin._snakeResizeListener);

        // hide terminal scrollbars and prevent overscroll during the game so the top wall is always visible
        try {
          termWin._snakePrevOverflow = output.style.overflow || '';
          termWin._snakePrevOverscroll = output.style.overscrollBehavior || '';
          output.style.overflow = 'hidden';
          output.style.overscrollBehavior = 'contain';
          output.scrollTop = 0; output.scrollLeft = 0;
        } catch (e) {}

        // start game loop
        termWin._snakeTimer = setInterval(step, 120);
        draw();
        printLine('Starting snake — use arrow keys (or ZQSD)');
      }

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const val = input.value;
        handleCommand(val);
        input.value = '';
      }
    });

    // wire close button
    const btnClose = termWin.querySelector('.win-btn.close');
    btnClose.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      try { if (termWin._snakeActive && typeof endGame === 'function') endGame(); } catch (e) {}
      termWin.remove();
    });

    // minimize
    const btnMin = termWin.querySelector('.win-btn.minimize');
    btnMin.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      termWin.style.display = 'none'; termWin.hidden = true;
      // create taskbar item to restore (simple implementation)
      const taskbar = document.querySelector('.taskbar');
      const containerForTb = taskbar || document.body;
      const tb = document.createElement('div'); tb.className = 'tb-item'; tb.textContent = 'Konsole';
      tb.addEventListener('pointerdown', (tev) => { tev.stopPropagation(); tev.preventDefault(); termWin.style.display = ''; termWin.hidden = false; tb.remove(); termWin.style.zIndex = ++window.__winZ; });
      (taskbar || document.body).appendChild(tb);
    });

    // maximize toggle (simulate Win10 app maximize — do not use browser fullscreen)
    const btnMax = termWin.querySelector('.win-btn.maximize');
    btnMax.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      const isMax = termWin.classList.contains('maximized');
      const taskbarEl = document.querySelector('.taskbar');
      const taskbarHeight = taskbarEl ? taskbarEl.getBoundingClientRect().height : 0;
      if (!isMax) {
        termWin.dataset._prev = JSON.stringify({ left: termWin.style.left || '', top: termWin.style.top || '', width: termWin.style.width || '', height: termWin.style.height || '', transform: termWin.style.transform || '' });
        termWin.classList.add('maximized');
        termWin.style.left = '0'; termWin.style.top = '0'; termWin.style.transform = 'none';
        termWin.style.width = '100vw'; termWin.style.height = `calc(100vh - ${taskbarHeight}px)`;
      } else {
        const prev = termWin.dataset._prev ? JSON.parse(termWin.dataset._prev) : {};
        termWin.classList.remove('maximized');
        termWin.style.left = prev.left || ''; termWin.style.top = prev.top || '';
        termWin.style.width = prev.width || '700px'; termWin.style.height = prev.height || '420px';
        termWin.style.transform = prev.transform || 'translate(-50%, -50%)';
        delete termWin.dataset._prev;
      }
      // if a snake game is active, trigger a resize to reflow canvas
      if (termWin._snakeActive && termWin._snakeResizeListener) termWin._snakeResizeListener();
    });
  }

  // open on double click
  konsoleApp.addEventListener('dblclick', () => openTerminal());
  // fallback for click.detail
  konsoleApp.addEventListener('click', (e) => { if (e.detail === 2) openTerminal(); });
});
