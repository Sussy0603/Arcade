// themes.js
// Each theme fully defines the CSS custom properties used across the app,
// plus a matching palette for the game pieces so the board feels cohesive.

const THEMES = {
  classic: {
    label: "Classique", group: "Défaut", icon: "🌌",
    vars: {
      "--bg-1": "#1b1035", "--bg-2": "#2c1a52",
      "--panel": "rgba(255,255,255,0.06)", "--panel-border": "rgba(255,255,255,0.12)",
      "--text-main": "#f4f1fb", "--text-dim": "#b6acd6",
      "--accent": "#ff6b6b", "--accent-2": "#ffd166",
      "--cell-empty": "rgba(255,255,255,0.06)", "--cell-border": "rgba(255,255,255,0.08)"
    },
    pieceColors: ["#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0", "#a78bfa", "#f472b6", "#ffb703"]
  },

  // ---- Saisons ----
  ete: {
    label: "Été", group: "Saisons", icon: "☀️",
    vars: {
      "--bg-1": "#fff8e1", "--bg-2": "#ffe9b3",
      "--panel": "rgba(255,255,255,0.55)", "--panel-border": "rgba(0,0,0,0.08)",
      "--text-main": "#4a3b22", "--text-dim": "#8a7550",
      "--accent": "#ff8a65", "--accent-2": "#8bc34a",
      "--cell-empty": "rgba(0,0,0,0.04)", "--cell-border": "rgba(0,0,0,0.08)"
    },
    pieceColors: ["#fff176", "#aed581", "#ff8a65", "#ffab91", "#ffcc80", "#c5e1a5"]
  },
  printemps: {
    label: "Printemps", group: "Saisons", icon: "🌸",
    vars: {
      "--bg-1": "#f3eefc", "--bg-2": "#e6f7f7",
      "--panel": "rgba(255,255,255,0.55)", "--panel-border": "rgba(0,0,0,0.06)",
      "--text-main": "#4a3f5c", "--text-dim": "#8b81a0",
      "--accent": "#c9a7eb", "--accent-2": "#f7b6c2",
      "--cell-empty": "rgba(0,0,0,0.03)", "--cell-border": "rgba(0,0,0,0.06)"
    },
    pieceColors: ["#d8c2f0", "#ffc2d1", "#b8e0e8", "#8fd8d2", "#dcdcdc", "#fdf6ec"]
  },
  automne: {
    label: "Automne", group: "Saisons", icon: "🍂",
    vars: {
      "--bg-1": "#3d2414", "--bg-2": "#6b3a1e",
      "--panel": "rgba(255,255,255,0.08)", "--panel-border": "rgba(255,255,255,0.14)",
      "--text-main": "#f5e6d3", "--text-dim": "#cbb190",
      "--accent": "#d2691e", "--accent-2": "#c9a227",
      "--cell-empty": "rgba(255,255,255,0.06)", "--cell-border": "rgba(255,255,255,0.1)"
    },
    pieceColors: ["#e07a3f", "#a0522d", "#c9a227", "#808000", "#800020", "#cc7722"]
  },
  hiver: {
    label: "Hiver", group: "Saisons", icon: "❄️",
    vars: {
      "--bg-1": "#0f1c2e", "--bg-2": "#1c2f45",
      "--panel": "rgba(255,255,255,0.07)", "--panel-border": "rgba(255,255,255,0.14)",
      "--text-main": "#f0f4f8", "--text-dim": "#a9b8c9",
      "--accent": "#4169e1", "--accent-2": "#e0115f",
      "--cell-empty": "rgba(255,255,255,0.05)", "--cell-border": "rgba(255,255,255,0.1)"
    },
    pieceColors: ["#ffffff", "#4169e1", "#50c878", "#8b0000", "#e0115f", "#c0c0c0"]
  },

  // ---- Ambiances / Mood ----
  nature: {
    label: "Nature", group: "Ambiances", icon: "🌿",
    vars: {
      "--bg-1": "#f0ede4", "--bg-2": "#dde5d5",
      "--panel": "rgba(255,255,255,0.5)", "--panel-border": "rgba(0,0,0,0.07)",
      "--text-main": "#3d3a2f", "--text-dim": "#7d7a68",
      "--accent": "#87a878", "--accent-2": "#e2a76f",
      "--cell-empty": "rgba(0,0,0,0.04)", "--cell-border": "rgba(0,0,0,0.08)"
    },
    pieceColors: ["#87a878", "#e2a76f", "#c8b89e", "#f0ede4", "#d4a039", "#a9c19a"]
  },
  calme: {
    label: "Calme & Bien-être", group: "Ambiances", icon: "🕊️",
    vars: {
      "--bg-1": "#eaf6f8", "--bg-2": "#e6e9f5",
      "--panel": "rgba(255,255,255,0.55)", "--panel-border": "rgba(0,0,0,0.06)",
      "--text-main": "#39434a", "--text-dim": "#7d8890",
      "--accent": "#5ab8c4", "--accent-2": "#a89bd6",
      "--cell-empty": "rgba(0,0,0,0.03)", "--cell-border": "rgba(0,0,0,0.06)"
    },
    pieceColors: ["#87ceeb", "#4a8fa3", "#c3b1e1", "#e0e0e0", "#a3c9d9", "#d6cdf0"]
  },
  creativite: {
    label: "Créativité", group: "Ambiances", icon: "🎨",
    vars: {
      "--bg-1": "#fff3e0", "--bg-2": "#ffe0b2",
      "--panel": "rgba(255,255,255,0.55)", "--panel-border": "rgba(0,0,0,0.08)",
      "--text-main": "#4a2e00", "--text-dim": "#8a6a2f",
      "--accent": "#ff7043", "--accent-2": "#ffca28",
      "--cell-empty": "rgba(0,0,0,0.04)", "--cell-border": "rgba(0,0,0,0.08)"
    },
    pieceColors: ["#ff7043", "#ffca28", "#ff8a65", "#ffb300", "#ff5252", "#ffd54f"]
  },
  energie: {
    label: "Énergie", group: "Ambiances", icon: "🔥",
    vars: {
      "--bg-1": "#1a0508", "--bg-2": "#2b0a10",
      "--panel": "rgba(255,255,255,0.06)", "--panel-border": "rgba(255,255,255,0.12)",
      "--text-main": "#fbe9eb", "--text-dim": "#c98a95",
      "--accent": "#ff1744", "--accent-2": "#ff4081",
      "--cell-empty": "rgba(255,255,255,0.05)", "--cell-border": "rgba(255,255,255,0.09)"
    },
    pieceColors: ["#ff1744", "#9c1c3a", "#ff4081", "#3a3a3a", "#c2185b", "#d50000"]
  },
  minimaliste: {
    label: "Minimaliste", group: "Ambiances", icon: "⚪",
    vars: {
      "--bg-1": "#0d0d0f", "--bg-2": "#161822",
      "--panel": "rgba(255,255,255,0.05)", "--panel-border": "rgba(255,255,255,0.12)",
      "--text-main": "#f5f5f5", "--text-dim": "#9a9a9f",
      "--accent": "#d4af37", "--accent-2": "#3a4a8f",
      "--cell-empty": "rgba(255,255,255,0.04)", "--cell-border": "rgba(255,255,255,0.08)"
    },
    pieceColors: ["#ffffff", "#d4af37", "#3a4a8f", "#4a4a4a", "#eaeaea", "#8c8c8c"]
  },
  romantique: {
    label: "Romantique", group: "Ambiances", icon: "💗",
    vars: {
      "--bg-1": "#fdf1f0", "--bg-2": "#f6e6ef",
      "--panel": "rgba(255,255,255,0.55)", "--panel-border": "rgba(0,0,0,0.06)",
      "--text-main": "#5c3d47", "--text-dim": "#9c7f88",
      "--accent": "#e8a0bf", "--accent-2": "#c9a7eb",
      "--cell-empty": "rgba(0,0,0,0.03)", "--cell-border": "rgba(0,0,0,0.06)"
    },
    pieceColors: ["#e8a0bf", "#f0dcc8", "#fdf6f0", "#c9a7eb", "#f7cfe0", "#ead6c8"]
  },
  ocean: {
    label: "Océan", group: "Ambiances", icon: "🌊",
    vars: {
      "--bg-1": "#052a3a", "--bg-2": "#0a4a5e",
      "--panel": "rgba(255,255,255,0.07)", "--panel-border": "rgba(255,255,255,0.13)",
      "--text-main": "#e6f7f9", "--text-dim": "#9fc9d1",
      "--accent": "#20b2aa", "--accent-2": "#ff7f50",
      "--cell-empty": "rgba(255,255,255,0.05)", "--cell-border": "rgba(255,255,255,0.09)"
    },
    pieceColors: ["#40e0d0", "#2e7d8f", "#ff7f50", "#f4d9a0", "#20b2aa", "#e6f7f9"]
  },
  neon: {
    label: "Néon / Nuit Urbaine", group: "Ambiances", icon: "🌃",
    vars: {
      "--bg-1": "#0a0014", "--bg-2": "#160029",
      "--panel": "rgba(255,255,255,0.06)", "--panel-border": "rgba(255,255,255,0.14)",
      "--text-main": "#f0e6ff", "--text-dim": "#b39ddb",
      "--accent": "#b026ff", "--accent-2": "#ff2ea6",
      "--cell-empty": "rgba(255,255,255,0.05)", "--cell-border": "rgba(255,255,255,0.1)"
    },
    pieceColors: ["#b026ff", "#ff2ea6", "#00e5ff", "#39ff14", "#ffffff", "#7b2ff7"]
  },
  fancy: {
    label: "Fancy", group: "Ambiances", icon: "👑",
    vars: {
      "--bg-1": "#150a08", "--bg-2": "#2a120d",
      "--panel": "rgba(255,255,255,0.06)", "--panel-border": "rgba(212,175,55,0.25)",
      "--text-main": "#f0e6d2", "--text-dim": "#b89c7a",
      "--accent": "#d4af37", "--accent-2": "#8f0030",
      "--cell-empty": "rgba(255,255,255,0.05)", "--cell-border": "rgba(212,175,55,0.15)"
    },
    pieceColors: ["#d4af37", "#8f0030", "#5c3a1e", "#2b2b2b", "#c9a227", "#7a1f1f"]
  }
};

const THEME_ORDER = [
  "classic",
  "ete", "printemps", "automne", "hiver",
  "nature", "calme", "creativite", "energie", "minimaliste", "romantique", "ocean", "neon", "fancy"
];

function applyTheme(themeId) {
  const theme = THEMES[themeId] || THEMES.classic;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  if (typeof setPieceColorPalette === "function") {
    setPieceColorPalette(theme.pieceColors);
  }
  if (typeof SoundManager !== "undefined" && SoundManager.setSoundTheme) {
    SoundManager.setSoundTheme(themeId);
  }
  if (typeof BackgroundFX !== "undefined" && BackgroundFX.setTheme) {
    BackgroundFX.setTheme(themeId);
  }
}
