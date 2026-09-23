// storage.js
// Everything is stored locally on-device via localStorage.
// No account, no network calls, no personal data ever leaves the phone.

const STORAGE_KEYS = {
  STATS: "blockjam_stats_v1",
  ACHIEVEMENTS: "blockjam_achievements_v1",
  SETTINGS: "blockjam_settings_v1",
  PROFILE: "blockjam_profile_v1"
};

const DEFAULT_STATS = {
  bestScore: 0,
  gamesPlayed: 0,
  totalLinesCleared: 0,
  maxLinesInOneClear: 0,
  boardClearedCount: 0,
  daysPlayed: [] // array of date strings "YYYY-MM-DD"
};

const ACHIEVEMENTS = [
  { id: "first_clear", name: "First Blood", desc: "Clear your first line", icon: "✨",
    check: s => s.totalLinesCleared >= 1 },
  { id: "century", name: "Century", desc: "Score 100+ in a single game", icon: "💯",
    check: s => s.bestScore >= 100 },
  { id: "high_roller", name: "High Roller", desc: "Score 1000+ in a single game", icon: "🎲",
    check: s => s.bestScore >= 1000 },
  { id: "combo_king", name: "Combo King", desc: "Clear 3 lines at once", icon: "⚡",
    check: s => s.maxLinesInOneClear >= 3 },
  { id: "marathoner", name: "Marathoner", desc: "Play 25 games", icon: "🏃",
    check: s => s.gamesPlayed >= 25 },
  { id: "perfectionist", name: "Perfectionist", desc: "Clear the entire board", icon: "🧹",
    check: s => s.boardClearedCount >= 1 },
  { id: "regular", name: "Regular", desc: "Play on 7 different days", icon: "📅",
    check: s => s.daysPlayed.length >= 7 },
  { id: "veteran", name: "Veteran", desc: "Play 100 games", icon: "🎖️",
    check: s => s.gamesPlayed >= 100 }
];

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_STATS };
  }
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

function loadUnlockedAchievements() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveUnlockedAchievements(obj) {
  localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(obj));
}

const DEFAULT_SETTINGS = { sound: true, music: true, theme: "classic" };

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

const DEFAULT_PROFILE = { name: "Player" };

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_PROFILE };
  }
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

// Returns array of newly unlocked achievement objects
// Unlocked achievements are stored as { id: isoTimestamp } so we can find
// the most recent one for the Profile screen.
function checkAndUnlockAchievements(stats) {
  const unlocked = loadUnlockedAchievements();
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (!unlocked[a.id] && a.check(stats)) {
      unlocked[a.id] = new Date().toISOString();
      newlyUnlocked.push(a);
    }
  });
  if (newlyUnlocked.length) saveUnlockedAchievements(unlocked);
  return newlyUnlocked;
}

// Returns the achievement definition + timestamp for the most recently
// unlocked achievement, or null if none unlocked yet.
function getMostRecentAchievement() {
  const unlocked = loadUnlockedAchievements();
  let best = null;
  Object.entries(unlocked).forEach(([id, ts]) => {
    if (!best || ts > best.ts) {
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (def) best = { ...def, ts };
    }
  });
  return best;
}
