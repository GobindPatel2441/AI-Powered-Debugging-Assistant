import { getStoredUser } from './auth.js';

const STORAGE_KEY = 'debugai.settings';

const defaults = {
  profile: {
    fullName: 'Guest User',
    email: 'guest@debugai.tech',
    biography: ''
  },
  preferences: {
    theme: 'dark',
    accent: 'primary',
    tokenRotation: true,
    notifications: {
      criticalErrors: true,
      weeklyReport: false,
      slackIntegration: true
    }
  }
};

const darkAccentColors = {
  primary: '#8ed5ff',
  secondary: '#ddb7ff',
  tertiary: '#ffc176',
  error: '#ffb4ab'
};

const lightAccentColors = {
  primary: '#2563EB',
  secondary: '#7C3AED',
  tertiary: '#B45309',
  error: '#EF4444'
};

export function mergeSettings(base, patch = {}) {
  return {
    profile: {
      ...base.profile,
      ...(patch.profile || {})
    },
    preferences: {
      ...base.preferences,
      ...(patch.preferences || {}),
      notifications: {
        ...base.preferences.notifications,
        ...(patch.preferences?.notifications || {})
      }
    }
  };
}

export function readLocalSettings() {
  const user = getStoredUser();
  if (user && user.preferences) {
    return {
      profile: user,
      preferences: user.preferences
    };
  }

  try {
    return mergeSettings(defaults, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return structuredClone(defaults);
  }
}

export function writeLocalSettings(settings) {
  // Only write to local storage if not logged in. If logged in, userProfile.js handles this via API.
  if (!getStoredUser()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergeSettings(defaults, settings)));
  }
}

export function resetLocalSettings() {
  localStorage.removeItem(STORAGE_KEY);
  applySettings(defaults);
}

export function applySettings(settings = readLocalSettings()) {
  const next = mergeSettings(defaults, settings);
  const root = document.documentElement;
  const theme = next.preferences.theme || 'dark';
  const palette = theme === 'light' ? lightAccentColors : darkAccentColors;
  const accent = palette[next.preferences.accent] || palette.primary;

  const isLight = theme === 'light';
  root.classList.toggle('dark', !isLight);
  root.classList.toggle('debugai-light', isLight);
  
  root.style.setProperty('--debugai-accent', accent);
  root.style.setProperty('--accent-primary', palette.primary);
  root.style.setProperty('--accent-secondary', palette.secondary);
  root.style.setProperty('--accent-tertiary', palette.tertiary);
  root.style.setProperty('--accent-error', palette.error);

  // Apply to all charts if they exist
  if (window.Chart) {
    Object.values(window.Chart.instances).forEach(chart => {
      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = isLight ? '#4B5563' : '#dae2fd';
      }
      if (chart.options.scales?.y?.ticks) {
        chart.options.scales.y.ticks.color = isLight ? '#94A3B8' : '#87929a';
      }
      if (chart.options.scales?.x?.ticks) {
        chart.options.scales.x.ticks.color = isLight ? '#94A3B8' : '#87929a';
      }
      chart.update('none');
    });
  }
}

export async function toggleTheme() {
  const settings = readLocalSettings();
  settings.preferences.theme = settings.preferences.theme === 'dark' ? 'light' : 'dark';
  
  applySettings(settings);

  // If logged in, update via API
  if (getStoredUser()) {
    try {
      const { updateProfile } = await import('./userProfile.js');
      await updateProfile({ preferences: { theme: settings.preferences.theme } });
    } catch (e) {
      console.error('Failed to sync theme to profile', e);
    }
  } else {
    writeLocalSettings(settings);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
});

applySettings();
