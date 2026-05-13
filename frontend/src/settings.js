import { apiFetch } from './api.js';
import {
  applySettings,
  mergeSettings,
  readLocalSettings,
  resetLocalSettings,
  writeLocalSettings
} from './theme.js';

import { getStoredUser, authFetch } from './auth.js';
import { updateProfile, getProfile, subscribe, setProfile, loadProfile } from './userProfile.js';
import { ImageCropModal } from './imageCrop.js';

let settings = getStoredUser() || { profile: {}, preferences: { notifications: {} } };

const profileSection = [...document.querySelectorAll('h3')]
  .find((node) => node.textContent.includes('Profile settings'))
  ?.closest('section');
const apiSection = [...document.querySelectorAll('h3')]
  .find((node) => node.textContent.includes('API Configuration'))
  ?.closest('section');
const appearanceSection = [...document.querySelectorAll('h3')]
  .find((node) => node.textContent.includes('Appearance'))
  ?.closest('section');
const notificationsSection = [...document.querySelectorAll('h3')]
  .find((node) => node.textContent.includes('Notifications'))
  ?.closest('section');

const aiProviderSection = [...document.querySelectorAll('h3')]
  .find((node) => node.textContent.includes('AI Model Provider'))
  ?.closest('section');
const providerButtons = [...(aiProviderSection?.querySelectorAll('.provider-btn') || [])];
const providerDisplayText = document.getElementById('current-provider-text');

const fullNameInput = document.querySelector('[data-profile-name]');
const emailInput = document.querySelector('[data-profile-email]');
const bioInput = document.querySelector('[data-profile-bio]');
const saveProfileButton = document.getElementById('save-profile-btn');

const apiKeyInput = apiSection?.querySelector('input[type="password"]');
const copyKeyButton = apiSection?.querySelector('button');
const tokenRotationButton = [...(apiSection?.querySelectorAll('button') || [])]
  .find((button) => !button.textContent.includes('content_copy'));

const themeButtons = [...(appearanceSection?.querySelectorAll('button') || [])];
const accentSwatches = [...(appearanceSection?.querySelectorAll('.rounded-full.cursor-pointer') || [])];
const deleteButton = [...document.querySelectorAll('button')]
  .find((button) => button.textContent.includes('Delete Account'));

const notificationRows = {
  criticalErrors: [...(notificationsSection?.querySelectorAll('.flex.items-center.justify-between') || [])]
    .find((row) => row.textContent.includes('Critical Errors')),
  weeklyReport: [...(notificationsSection?.querySelectorAll('.flex.items-center.justify-between') || [])]
    .find((row) => row.textContent.includes('Weekly Report')),
  slackIntegration: [...(notificationsSection?.querySelectorAll('.flex.items-center.justify-between') || [])]
    .find((row) => row.textContent.includes('Slack Integration'))
};

// Profile Image Upload Hook
const profileImageContainer = document.getElementById('profile-image-container');
const profileImageInput = document.getElementById('profile-image-input');
const cropModal = new ImageCropModal();

if (profileImageContainer && profileImageInput) {
  profileImageContainer.addEventListener('click', () => {
    profileImageInput.click();
  });

  profileImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const croppedBlob = await cropModal.open(file);
      if (!croppedBlob) return;
      
      const formData = new FormData();
      formData.append('profileImage', croppedBlob, 'profile.jpg');
      
      toast('Uploading profile image...', 'primary');
      
      const response = await authFetch('/api/user/profile-image', {
        method: 'POST',
        body: formData
      });
      
      if (response.user) {
        setProfile(response.user);
        toast('Profile image updated successfully.');
      }
    } catch (err) {
      toast(err.message || 'Failed to upload image.', 'error');
    } finally {
      profileImageInput.value = ''; // Reset input
    }
  });
}

function toast(message, tone = 'primary') {
  let node = document.querySelector('[data-settings-toast]');
  if (!node) {
    node = document.createElement('div');
    node.dataset.settingsToast = 'true';
    node.className = 'fixed bottom-6 right-6 z-[100] max-w-sm rounded-lg px-4 py-3 text-sm font-semibold shadow-xl border transition-opacity';
    document.body.appendChild(node);
  }

  const toneClass = tone === 'error'
    ? 'bg-error text-on-error border-error'
    : 'bg-surface-container-high text-on-surface border-outline-variant';
  node.className = `fixed bottom-6 right-6 z-[100] max-w-sm rounded-lg px-4 py-3 text-sm font-semibold shadow-xl border transition-opacity ${toneClass}`;
  node.textContent = message;
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    node.remove();
  }, 2800);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setSwitch(button, enabled) {
  if (!button) return;
  const knob = button.querySelector('div');
  button.setAttribute('aria-pressed', String(enabled));
  button.classList.remove('bg-primary', 'bg-primary/20', 'bg-surface-container-highest');
  button.classList.add(enabled ? 'bg-primary' : 'bg-surface-container-highest');

  if (knob) {
    knob.classList.remove('translate-x-0', 'translate-x-5', 'translate-x-6', 'bg-primary', 'bg-on-primary', 'bg-outline');
    knob.classList.add(enabled ? (button.classList.contains('w-12') ? 'translate-x-6' : 'translate-x-5') : 'translate-x-0');
    knob.classList.add(enabled ? 'bg-on-primary' : 'bg-outline');
  }
}

function updateThemeButtons() {
  themeButtons.forEach((button) => {
    const isActive = button.textContent.includes(settings.preferences?.theme === 'dark' ? 'Dark' : 'Light');
    button.classList.toggle('bg-primary', isActive);
    button.classList.toggle('text-on-primary', isActive);
    button.classList.toggle('text-on-surface-variant', !isActive);
  });
}

function updateAccentSwatches() {
  const keys = ['primary', 'secondary', 'tertiary', 'error'];
  accentSwatches.forEach((swatch, index) => {
    const active = settings.preferences?.accent === keys[index];
    swatch.classList.toggle('border-2', active);
    swatch.classList.toggle('border-white', active);
    swatch.classList.toggle('ring-2', active);
  });
}

function render() {
  const currentProvider = settings.preferences?.aiProvider || 'openai';
  providerButtons.forEach((btn) => {
    const active = btn.dataset.provider === currentProvider;
    btn.classList.toggle('border-primary', active);
    btn.classList.toggle('bg-primary/10', active);
    btn.classList.toggle('border-outline-variant', !active);
  });
  if (providerDisplayText) {
    const names = { openai: 'OpenAI', gemini: 'Google Gemini', ollama: 'Ollama (Local)' };
    providerDisplayText.textContent = names[currentProvider] || currentProvider;
  }

  setSwitch(tokenRotationButton, settings.preferences?.tokenRotation);
  setSwitch(notificationRows.criticalErrors?.querySelector('button'), settings.preferences?.notifications?.criticalErrors);
  setSwitch(notificationRows.weeklyReport?.querySelector('button'), settings.preferences?.notifications?.weeklyReport);
  setSwitch(notificationRows.slackIntegration?.querySelector('button'), settings.preferences?.notifications?.slackIntegration);
  updateThemeButtons();
  updateAccentSwatches();
}

async function persist(patch, successMessage) {
  try {
    settings = await updateProfile(patch);
    render();
    if (successMessage) toast(successMessage);
  } catch (error) {
    toast(error.message || 'Failed to save settings', 'error');
  }
}

saveProfileButton?.addEventListener('click', async () => {
  const fullName = fullNameInput?.value.trim() || '';
  const biography = bioInput?.value.trim() || '';

  if (!fullName) {
    toast('Full name is required.', 'error');
    fullNameInput?.focus();
    return;
  }

  const btnText = saveProfileButton.querySelector('span');
  const originalText = btnText.textContent;
  
  try {
    saveProfileButton.disabled = true;
    btnText.textContent = 'Saving...';
    saveProfileButton.classList.add('opacity-70');
    
    await persist({ fullName, biography }, 'Profile settings saved.');
  } finally {
    saveProfileButton.disabled = false;
    btnText.textContent = originalText;
    saveProfileButton.classList.remove('opacity-70');
  }
});

copyKeyButton?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(apiKeyInput?.value || '');
    toast('API key copied to clipboard.');
  } catch {
    toast('Clipboard access is blocked by the browser.', 'error');
  }
});

tokenRotationButton?.addEventListener('click', () => {
  const current = settings.preferences?.tokenRotation || false;
  persist(
    { preferences: { tokenRotation: !current } },
    `Automatic token rotation ${!current ? 'enabled' : 'disabled'}.`
  );
});

themeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const theme = button.textContent.includes('Light') ? 'light' : 'dark';
    persist({ preferences: { theme } }, `${theme === 'light' ? 'Light' : 'Dark'} theme applied.`);
    
    // Also trigger theme.js re-application locally
    import('./theme.js').then(m => m.applySettings({ preferences: { ...settings.preferences, theme } }));
  });
});

accentSwatches.forEach((swatch, index) => {
  const accent = ['primary', 'secondary', 'tertiary', 'error'][index];
  swatch.addEventListener('click', () => {
    persist({ preferences: { accent } }, 'Accent color updated.');
    
    import('./theme.js').then(m => m.applySettings({ preferences: { ...settings.preferences, accent } }));
  });
});

providerButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const provider = btn.dataset.provider;
    persist(
      { preferences: { aiProvider: provider } },
      `Switched to ${btn.querySelector('span.text-sm')?.textContent || provider} for analysis.`
    );
  });
});

Object.entries(notificationRows).forEach(([key, row]) => {
  row?.querySelector('button')?.addEventListener('click', () => {
    const current = settings.preferences?.notifications?.[key] || false;
    persist(
      { preferences: { notifications: { [key]: !current } } },
      `${row.querySelector('p')?.textContent || 'Notification'} ${!current ? 'enabled' : 'disabled'}.`
    );
  });
});

// Subscribe to global profile changes
subscribe((newProfile) => {
  if (newProfile) {
    settings = newProfile;
    render();
  }
});

