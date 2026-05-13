import UserSettings from '../models/UserSettings.js';
import { isDatabaseReady } from './databaseService.js';

const defaults = {
  profile: {
    fullName: 'Alex Chen',
    email: 'alex.chen@debugai.tech',
    biography: 'Senior Backend Engineer specializing in distributed systems and automated error remediation.'
  },
  preferences: {
    theme: 'dark',
    accent: 'primary',
    tokenRotation: true,
    aiProvider: 'gemini',

    notifications: {
      criticalErrors: true,
      weeklyReport: false,
      slackIntegration: true
    }
  }
};

let memorySettings = structuredClone(defaults);

function mergeSettings(current, patch) {
  return {
    profile: {
      ...current.profile,
      ...(patch.profile || {})
    },
    preferences: {
      ...current.preferences,
      ...(patch.preferences || {}),
      notifications: {
        ...current.preferences.notifications,
        ...(patch.preferences?.notifications || {})
      }
    }
  };
}


export function getDefaultSettings() {
  return structuredClone(defaults);
}

export async function getSettings() {
  if (isDatabaseReady()) {
    const doc = await UserSettings.findOneAndUpdate(
      { key: 'default' },
      { $setOnInsert: { key: 'default', ...defaults } },
      { upsert: true, new: true, lean: true }
    );
    return {
      profile: doc.profile,
      preferences: doc.preferences
    };
  }

  return structuredClone(memorySettings);
}

export async function updateSettings(patch) {
  const current = await getSettings();
  const next = mergeSettings(current, patch);

  if (isDatabaseReady()) {
    const doc = await UserSettings.findOneAndUpdate(
      { key: 'default' },
      { ...next, updatedAt: new Date() },
      { upsert: true, new: true, lean: true }
    );
    return {
      profile: doc.profile,
      preferences: doc.preferences
    };
  }

  memorySettings = structuredClone(next);
  return structuredClone(memorySettings);
}

export async function resetSettings() {
  memorySettings = structuredClone(defaults);

  if (isDatabaseReady()) {
    await UserSettings.findOneAndUpdate(
      { key: 'default' },
      { key: 'default', ...defaults, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }

  return structuredClone(defaults);
}
