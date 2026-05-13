import { getSettings, resetSettings, updateSettings } from '../services/settingsService.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSettings(payload) {
  if (payload.profile?.fullName !== undefined && !String(payload.profile.fullName).trim()) {
    return 'Full name is required.';
  }

  if (payload.profile?.email !== undefined && !isValidEmail(String(payload.profile.email).trim())) {
    return 'A valid email address is required.';
  }

  if (payload.preferences?.theme && !['dark', 'light'].includes(payload.preferences.theme)) {
    return 'Theme must be dark or light.';
  }

  if (payload.preferences?.accent && !['primary', 'secondary', 'tertiary', 'error'].includes(payload.preferences.accent)) {
    return 'Accent color is invalid.';
  }

  return null;
}

export async function readSettings(_req, res, next) {
  try {
    res.json({ settings: await getSettings() });
  } catch (error) {
    next(error);
  }
}

export async function saveSettings(req, res, next) {
  try {
    const validationError = validateSettings(req.body || {});
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    res.json({ settings: await updateSettings(req.body || {}) });
  } catch (error) {
    next(error);
  }
}

export async function deleteSettings(_req, res, next) {
  try {
    res.json({ settings: await resetSettings() });
  } catch (error) {
    next(error);
  }
}
