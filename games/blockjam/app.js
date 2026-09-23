// app.js
const BOARD_SIZE = 9;

let COLORS = ["#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0", "#a78bfa", "#f472b6", "#ffb703"];

function setPieceColorPalette(colors) {
  COLORS = colors;
}

const SHAPES = [
  [[0,0]],                                   // dot
  [[0,0],[0,1]],                              // 1x2
  [[0,0],[1,0]],                              // 2x1
  [[0,0],[0,1],[0,2]],                        // 1x3
  [[0,0],[1,0],[2,0]],                        // 3x1
  [[0,0],[0,1],[0,2],[0,3]],                  // 1x4
  [[0,0],[1,0],[2,0],[3,0]],                  // 4x1
  [[0,0],[0,1],[0,2],[0,3],[0,4]],            // 1x5
  [[0,0],[1,0],[2,0],[3,0],[4,0]],            // 5x1
  [[0,0],[0,1],[1,0],[1,1]],                  // 2x2 square
  [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]], // 3x3 square
  [[0,0],[1,0],[2,0],[2,1]],                  // L
  [[0,1],[1,1],[2,1],[2,0]],                  // J
  [[0,0],[0,1],[1,1],[1,2]],                  // S
  [[0,1],[0,2],[1,0],[1,1]],                  // Z
  [[0,0],[0,1],[0,2],[1,1]],                  // T
  [[0,1],[1,0],[1,1],[1,2]],                  // T upside
  [[0,1],[1,0],[1,1],[1,2],[2,1]],            // plus
  [[0,0],[0,1],[1,0]],                        // small corner
  [[0,0],[0,1],[1,1]],
  [[0,0],[1,0],[1,1]],
  [[0,1],[1,0],[1,1]]
];

let state = {
  board: [],       // BOARD_SIZE x BOARD_SIZE, null or color hex
  tray: [null, null, null],
  score: 0,
  gameOver: false
};

let sessionStats = {
  linesThisGame: 0
};

let dragCtx = null; // active drag context

// ---------- Utility ----------
function el(id) { return document.getElementById(id); }
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ---------- Screen navigation ----------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  el(id).classList.add("active");
}

// ---------- Board setup ----------
function createEmptyBoard() {
  const b = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    b.push(new Array(BOARD_SIZE).fill(null));
  }
  return b;
}

function renderBoardSkeleton() {
  const boardEl = el("board");
  boardEl.innerHTML = "";
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      const boxRow = Math.floor(r / 3);
      const boxCol = Math.floor(c / 3);
      if ((boxRow + boxCol) % 2 === 1) cell.classList.add("box-shade");
      boardEl.appendChild(cell);
    }
  }
}

function getCellEl(r, c) {
  return el("board").querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}

function redrawBoard() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cellEl = getCellEl(r, c);
      const color = state.board[r][c];
      cellEl.classList.remove("preview-valid", "preview-invalid", "filled");
      if (color) {
        cellEl.style.background = color;
        cellEl.classList.add("filled");
      } else {
        cellEl.style.background = "";
      }
    }
  }
}

// ---------- Piece generation ----------
function randomPiece() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { shape, color, id: Math.random().toString(36).slice(2) };
}

function refillTrayIfEmpty() {
  if (state.tray.every(p => p === null)) {
    state.tray = [randomPiece(), randomPiece(), randomPiece()];
    renderTray();
    checkGameOverSoon();
  }
}

function renderTray() {
  for (let i = 0; i < 3; i++) {
    const slot = document.querySelector(`.tray-slot[data-slot="${i}"]`);
    slot.innerHTML = "";
    const piece = state.tray[i];
    if (!piece) continue;
    slot.appendChild(buildPieceGridEl(piece, 22));
  }
}

function pieceBounds(shape) {
  const rows = shape.map(p => p[0]);
  const cols = shape.map(p => p[1]);
  return {
    minR: Math.min(...rows), maxR: Math.max(...rows),
    minC: Math.min(...cols), maxC: Math.max(...cols)
  };
}

function buildPieceGridEl(piece, cellPx) {
  const { minR, maxR, minC, maxC } = pieceBounds(piece.shape);
  const h = maxR - minR + 1;
  const w = maxC - minC + 1;
  const grid = document.createElement("div");
  grid.className = "piece-grid";
  grid.style.gridTemplateColumns = `repeat(${w}, ${cellPx}px)`;
  grid.style.gridTemplateRows = `repeat(${h}, ${cellPx}px)`;
  const filled = new Set(piece.shape.map(([r, c]) => `${r - minR},${c - minC}`));
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const cell = document.createElement("div");
      cell.className = "piece-cell";
      if (filled.has(`${r},${c}`)) {
        cell.style.background = piece.color;
      } else {
        cell.classList.add("empty");
      }
      cell.style.width = cellPx + "px";
      cell.style.height = cellPx + "px";
      grid.appendChild(cell);
    }
  }
  return grid;
}

// ---------- Placement logic ----------
function canPlace(shape, anchorR, anchorC) {
  for (const [dr, dc] of shape) {
    const r = anchorR + dr;
    const c = anchorC + dc;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (state.board[r][c]) return false;
  }
  return true;
}

function anyValidPlacement(shape) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(shape, r, c)) return true;
    }
  }
  return false;
}

function placePiece(piece, anchorR, anchorC) {
  piece.shape.forEach(([dr, dc]) => {
    state.board[anchorR + dr][anchorC + dc] = piece.color;
  });
  state.score += piece.shape.length;
  SoundManager.playPlace();
  clearCompletedLines();
  redrawBoard();
  updateScoreUI();
}

function clearCompletedLines() {
  const fullRows = [];
  const fullCols = [];
  const fullBoxes = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (state.board[r].every(v => v)) fullRows.push(r);
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) if (!state.board[r][c]) { full = false; break; }
    if (full) fullCols.push(c);
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      let full = true;
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) {
          if (!state.board[r][c]) { full = false; break; }
        }
        if (!full) break;
      }
      if (full) fullBoxes.push([br, bc]);
    }
  }

  const totalLines = fullRows.length + fullCols.length + fullBoxes.length;
  if (totalLines === 0) return;

  const cellsToClear = new Set();
  fullRows.forEach(r => { for (let c = 0; c < BOARD_SIZE; c++) cellsToClear.add(`${r},${c}`); });
  fullCols.forEach(c => { for (let r = 0; r < BOARD_SIZE; r++) cellsToClear.add(`${r},${c}`); });
  fullBoxes.forEach(([br, bc]) => {
    for (let r = br * 3; r < br * 3 + 3; r++)
      for (let c = bc * 3; c < bc * 3 + 3; c++) cellsToClear.add(`${r},${c}`);
  });

  cellsToClear.forEach(key => {
    const [r, c] = key.split(",").map(Number);
    state.board[r][c] = null;
  });

  const bonus = cellsToClear.size * 2 + (totalLines > 1 ? totalLines * 20 : 0);
  state.score += bonus;
  SoundManager.playClear(totalLines);

  sessionStats.linesThisGame += totalLines;
  sessionStats.maxLinesThisClear = Math.max(sessionStats.maxLinesThisClear || 0, totalLines);

  if (state.board.every(row => row.every(v => v === null))) {
    sessionStats.boardCleared = true;
  }
}

// ---------- Game over ----------
function checkGameOverSoon() {
  setTimeout(checkGameOver, 50);
}

function checkGameOver() {
  const activePieces = state.tray.filter(p => p !== null);
  const canPlaceAny = activePieces.some(p => anyValidPlacement(p.shape));
  if (!canPlaceAny && activePieces.length > 0) {
    triggerGameOver();
  }
}

function triggerGameOver() {
  state.gameOver = true;
  SoundManager.playGameOver();

  const stats = loadStats();
  const isNewBest = state.score > stats.bestScore;
  stats.bestScore = Math.max(stats.bestScore, state.score);
  stats.gamesPlayed += 1;
  stats.totalLinesCleared += sessionStats.linesThisGame || 0;
  stats.maxLinesInOneClear = Math.max(stats.maxLinesInOneClear, sessionStats.maxLinesThisClear || 0);
  if (sessionStats.boardCleared) stats.boardClearedCount = (stats.boardClearedCount || 0) + 1;
  const today = todayStr();
  if (!stats.daysPlayed.includes(today)) stats.daysPlayed.push(today);
  saveStats(stats);

  const newAchievements = checkAndUnlockAchievements(stats);

  el("final-score").textContent = state.score;
  el("new-best-badge").classList.toggle("show", isNewBest);
  el("gameover-modal").classList.add("active");
  el("menu-best-score").textContent = stats.bestScore;

  if (newAchievements.length) {
    queueAchievementToasts(newAchievements);
  }
}

function queueAchievementToasts(list) {
  let i = 0;
  function showNext() {
    if (i >= list.length) return;
    const a = list[i++];
    el("toast-name").textContent = a.name;
    SoundManager.playAchievement();
    const toast = el("achievement-toast");
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(showNext, 400);
    }, 2200);
  }
  showNext();
}

// ---------- New game ----------
function startNewGame() {
  state.board = createEmptyBoard();
  state.tray = [randomPiece(), randomPiece(), randomPiece()];
  state.score = 0;
  state.gameOver = false;
  sessionStats = { linesThisGame: 0, maxLinesThisClear: 0, boardCleared: false };

  renderBoardSkeleton();
  redrawBoard();
  renderTray();
  updateScoreUI();
  el("gameover-modal").classList.remove("active");

  const stats = loadStats();
  el("game-best-score").textContent = stats.bestScore;

  showScreen("game-screen");
  checkGameOverSoon();
}

function updateScoreUI() {
  el("current-score").textContent = state.score;
}

// ---------- Drag & Drop (pointer events, mouse + touch) ----------
function attachTrayDragHandlers() {
  document.querySelectorAll(".tray-slot").forEach(slot => {
    slot.addEventListener("pointerdown", onTrayPointerDown);
  });
}

function onTrayPointerDown(e) {
  if (state.gameOver) return;
  const slot = e.currentTarget;
  const slotIndex = parseInt(slot.dataset.slot, 10);
  const piece = state.tray[slotIndex];
  if (!piece) return;

  e.preventDefault();
  const boardEl = el("board");
  const boardRect = boardEl.getBoundingClientRect();
  const cellSize = boardRect.width / BOARD_SIZE;
  const { minR, maxR, minC, maxC } = pieceBounds(piece.shape);
  const h = maxR - minR + 1;
  const w = maxC - minC + 1;

  const ghost = buildPieceGridEl(piece, cellSize - 3);
  ghost.classList.add("drag-ghost");
  document.body.appendChild(ghost);
  slot.style.visibility = "hidden";

  dragCtx = {
    piece, slotIndex, boardRect, cellSize, h, w, ghost,
    offsetY: -cellSize * 1.6 // lift above finger
  };

  positionGhost(e.clientX, e.clientY);
  updatePreview(e.clientX, e.clientY);

  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd);
}

function positionGhost(clientX, clientY) {
  const { ghost, cellSize, h, w, offsetY } = dragCtx;
  const totalW = w * cellSize;
  const totalH = h * cellSize;
  ghost.style.left = (clientX - totalW / 2) + "px";
  ghost.style.top = (clientY - totalH / 2 + offsetY) + "px";
}

function computeAnchor(clientX, clientY) {
  const { boardRect, cellSize, h, w, offsetY } = dragCtx;
  const pieceCenterX = clientX;
  const pieceCenterY = clientY + offsetY;
  const topLeftX = pieceCenterX - (w * cellSize) / 2;
  const topLeftY = pieceCenterY - (h * cellSize) / 2;
  const anchorC = Math.round((topLeftX - boardRect.left) / cellSize);
  const anchorR = Math.round((topLeftY - boardRect.top) / cellSize);
  return { anchorR, anchorC };
}

function clearPreview() {
  document.querySelectorAll(".cell.preview-valid, .cell.preview-invalid").forEach(c => {
    c.classList.remove("preview-valid", "preview-invalid");
  });
}

function updatePreview(clientX, clientY) {
  clearPreview();
  const { piece } = dragCtx;
  const { anchorR, anchorC } = computeAnchor(clientX, clientY);
  const valid = canPlace(piece.shape, anchorR, anchorC);
  piece.shape.forEach(([dr, dc]) => {
    const r = anchorR + dr;
    const c = anchorC + dc;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      const cellEl = getCellEl(r, c);
      cellEl.classList.add(valid ? "preview-valid" : "preview-invalid");
    }
  });
  dragCtx.lastValid = valid;
  dragCtx.lastAnchor = { anchorR, anchorC };
}

function onDragMove(e) {
  if (!dragCtx) return;
  positionGhost(e.clientX, e.clientY);
  updatePreview(e.clientX, e.clientY);
}

function onDragEnd(e) {
  if (!dragCtx) return;
  clearPreview();
  const { piece, slotIndex, ghost, lastValid, lastAnchor } = dragCtx;

  ghost.remove();
  const slot = document.querySelector(`.tray-slot[data-slot="${slotIndex}"]`);
  slot.style.visibility = "visible";

  window.removeEventListener("pointermove", onDragMove);
  window.removeEventListener("pointerup", onDragEnd);
  dragCtx = null;

  if (lastValid) {
    placePiece(piece, lastAnchor.anchorR, lastAnchor.anchorC);
    state.tray[slotIndex] = null;
    slot.innerHTML = "";
    refillTrayIfEmpty();
    checkGameOverSoon();
  } else {
    SoundManager.playInvalid();
  }
}

// ---------- Achievements screen ----------
function renderAchievementsScreen() {
  const unlocked = loadUnlockedAchievements();
  const listEl = el("achievements-list");
  listEl.innerHTML = "";
  ACHIEVEMENTS.forEach(a => {
    const isUnlocked = !!unlocked[a.id];
    const item = document.createElement("div");
    item.className = "achievement-item" + (isUnlocked ? " unlocked" : "");
    item.innerHTML = `
      <div class="achievement-icon">${isUnlocked ? a.icon : "🔒"}</div>
      <div>
        <div class="achievement-name">${a.name}</div>
        <div class="achievement-desc">${a.desc}</div>
      </div>
    `;
    listEl.appendChild(item);
  });
}

// ---------- Profile screen ----------
function renderThemePicker() {
  const container = el("theme-picker");
  container.innerHTML = "";
  const settings = loadSettings();
  let lastGroup = null;
  THEME_ORDER.forEach(id => {
    const theme = THEMES[id];
    if (theme.group !== lastGroup) {
      const label = document.createElement("div");
      label.className = "theme-group-label";
      label.textContent = theme.group;
      container.appendChild(label);
      lastGroup = theme.group;
    }
    const swatch = document.createElement("button");
    swatch.className = "theme-swatch" + (settings.theme === id ? " selected" : "");
    swatch.style.background = `linear-gradient(135deg, ${theme.vars["--bg-2"]}, ${theme.vars["--accent"]})`;
    swatch.dataset.themeId = id;
    swatch.innerHTML = `<span class="swatch-icon">${theme.icon}</span><span>${theme.label}</span>`;
    swatch.addEventListener("click", () => {
      SoundManager.playClick();
      const s = loadSettings();
      s.theme = id;
      saveSettings(s);
      applyTheme(id);
      renderThemePicker();
    });
    container.appendChild(swatch);
  });
}

function refreshRecentAchievement() {
  const recent = getMostRecentAchievement();
  const box = el("recent-achievement");
  if (!recent) {
    box.innerHTML = `
      <div class="achievement-icon">🔒</div>
      <div>
        <div class="achievement-name">None yet</div>
        <div class="achievement-desc">Play a game to unlock your first one!</div>
      </div>`;
    return;
  }
  box.innerHTML = `
    <div class="achievement-icon">${recent.icon}</div>
    <div>
      <div class="achievement-name">${recent.name}</div>
      <div class="achievement-desc">${recent.desc}</div>
    </div>`;
}

function setToggleUI(buttonEl, on) {
  buttonEl.setAttribute("aria-checked", on ? "true" : "false");
}

function renderProfileScreen() {
  const profile = loadProfile();
  const settings = loadSettings();
  el("profile-name-input").value = profile.name;
  setToggleUI(el("toggle-sfx"), settings.sound);
  setToggleUI(el("toggle-music"), settings.music);
  refreshRecentAchievement();
  renderThemePicker();
}

function updateMusicFabIcon() {
  const settings = loadSettings();
  const fab = el("btn-music-fab");
  fab.textContent = settings.music ? "🎵" : "🔇";
  fab.classList.toggle("muted", !settings.music);
}

// ---------- Init / event wiring ----------
function init() {
  BackgroundFX.init();
  const stats = loadStats();
  el("menu-best-score").textContent = stats.bestScore;

  const settings = loadSettings();
  applyTheme(settings.theme);
  SoundManager.setSfxOn(settings.sound);
  SoundManager.setMusicOn(settings.music);
  SoundManager.unlockAudioOnFirstGesture();
  updateMusicFabIcon();

  const nav = (fn) => () => { SoundManager.playClick(); fn(); };

  el("btn-play").addEventListener("click", nav(startNewGame));
  el("btn-profile").addEventListener("click", nav(() => {
    renderProfileScreen();
    showScreen("profile-screen");
  }));
  el("btn-achievements").addEventListener("click", nav(() => {
    renderAchievementsScreen();
    showScreen("achievements-screen");
  }));
  el("btn-howto").addEventListener("click", nav(() => showScreen("howto-screen")));
  el("btn-back-menu").addEventListener("click", nav(() => showScreen("menu-screen")));
  el("btn-back-from-achievements").addEventListener("click", nav(() => showScreen("menu-screen")));
  el("btn-back-from-howto").addEventListener("click", nav(() => showScreen("menu-screen")));
  el("btn-back-from-profile").addEventListener("click", nav(() => showScreen("menu-screen")));
  el("btn-play-again").addEventListener("click", nav(startNewGame));
  el("btn-modal-menu").addEventListener("click", nav(() => {
    el("gameover-modal").classList.remove("active");
    const s = loadStats();
    el("menu-best-score").textContent = s.bestScore;
    showScreen("menu-screen");
  }));

  el("btn-music-fab").addEventListener("click", () => {
    const s = loadSettings();
    s.music = !s.music;
    saveSettings(s);
    SoundManager.setMusicOn(s.music);
    updateMusicFabIcon();
    const toggle = el("toggle-music");
    if (toggle) setToggleUI(toggle, s.music);
  });

  el("toggle-sfx").addEventListener("click", () => {
    const s = loadSettings();
    s.sound = !s.sound;
    saveSettings(s);
    SoundManager.setSfxOn(s.sound);
    setToggleUI(el("toggle-sfx"), s.sound);
    if (s.sound) SoundManager.playClick();
  });

  el("toggle-music").addEventListener("click", () => {
    const s = loadSettings();
    s.music = !s.music;
    saveSettings(s);
    SoundManager.setMusicOn(s.music);
    setToggleUI(el("toggle-music"), s.music);
    updateMusicFabIcon();
  });

  el("profile-name-input").addEventListener("change", (e) => {
    const name = (e.target.value || "").trim() || "Player";
    saveProfile({ name });
    e.target.value = name;
  });

  attachTrayDragHandlers();
  showScreen("menu-screen");
}

document.addEventListener("DOMContentLoaded", init);

// ═══════════════════════════════════════════════════════
// DEVELOPER MODE — only active with ?devmode=1 in the URL
// (added by MOS's "Play as DevOps"). Everything below is inert
// otherwise — normal play is completely unaffected.
// ═══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  if (new URLSearchParams(location.search).get("devmode") !== "1") return;

  const panel = document.createElement("div");
  panel.id = "devPanel";
  panel.style.cssText = "position:fixed;top:14px;left:14px;z-index:9999;background:rgba(20,16,24,.92);"
    + "border:1px solid #ffd166;border-radius:12px;padding:10px 12px;font:600 12px system-ui,sans-serif;"
    + "color:#fff;display:flex;flex-direction:column;gap:6px;max-width:200px;box-shadow:0 8px 30px rgba(0,0,0,.5);";
  panel.innerHTML = `
    <div style="letter-spacing:.08em;text-transform:uppercase;font-size:10px;opacity:.7">🛠️ Dev Mode</div>
    <div id="devBlockJamInfo" style="font-size:11px;opacity:.85">—</div>
    <button id="devClearBoard" style="padding:6px 8px;border-radius:8px;background:#ffd166;color:#241a00;border:none;cursor:pointer;font:600 11px inherit">🧹 Clear board</button>
    <button id="devSafeTray" style="padding:6px 8px;border-radius:8px;background:#3a3243;color:#fff;border:none;cursor:pointer;font:600 11px inherit">🔄 Force fitting tray</button>
    <button id="devAddScore" style="padding:6px 8px;border-radius:8px;background:#3a3243;color:#fff;border:none;cursor:pointer;font:600 11px inherit">+1000 score</button>
  `;
  document.body.appendChild(panel);

  const devInfo = () => {
    const el2 = document.getElementById("devBlockJamInfo");
    if (!el2) return;
    if (!state.board.length) { el2.textContent = "No game loaded."; return; }
    const filled = state.board.flat().filter(Boolean).length;
    el2.textContent = `${filled}/${BOARD_SIZE * BOARD_SIZE} filled · score ${state.score}${state.gameOver ? " · GAME OVER" : ""}`;
  };

  document.getElementById("devClearBoard").addEventListener("click", () => {
    if (!state.board.length) return;
    state.board = createEmptyBoard();
    redrawBoard();
    checkGameOverSoon();
    devInfo();
  });

  // Rerolls the tray, preferring a combination where every piece has
  // somewhere to go on the CURRENT board — a direct way to test "does this
  // board state ever legitimately end the game" without grinding into one.
  document.getElementById("devSafeTray").addEventListener("click", () => {
    if (!state.board.length) return;
    const tray = [];
    for (let i = 0; i < 3; i++) {
      let piece = null;
      for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = randomPiece();
        if (anyValidPlacement(candidate.shape)) { piece = candidate; break; }
      }
      tray.push(piece || randomPiece()); // board may genuinely have no room left for anything
    }
    state.tray = tray;
    renderTray();
    checkGameOverSoon();
    devInfo();
  });

  document.getElementById("devAddScore").addEventListener("click", () => {
    if (!state.board.length) return;
    state.score += 1000;
    updateScoreUI();
    devInfo();
  });

  setInterval(() => { if (el("game-screen").classList.contains("active")) devInfo(); }, 1000);
});
