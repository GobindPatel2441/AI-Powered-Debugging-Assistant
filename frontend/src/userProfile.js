import { apiFetch } from './api.js';
import { getStoredUser, setAuth, getToken } from './auth.js';

let currentProfile = null;
const subscribers = new Set();
let isReady = false;

const defaultAvatar = 'https://ui-avatars.com/api/?background=random&color=fff&name=';
const defaultLogo = 'https://ui-avatars.com/api/?background=171f33&color=8ed5ff&name=DA';

function applyToDOM() {
  if (!currentProfile) return;

  const { fullName, email, profileImage, workspaceLogo } = currentProfile;
  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : '??';
  
  const avatarUrl = profileImage || `${defaultAvatar}${encodeURIComponent(fullName || 'User')}`;
  const logoUrl = workspaceLogo || defaultLogo;

  // Update elements with data attributes
  document.querySelectorAll('[data-profile-name]').forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = fullName || '';
    else el.textContent = fullName || 'Anonymous';
  });

  document.querySelectorAll('[data-profile-email]').forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = email || '';
    else el.textContent = email || 'no-email@debugai.com';
  });

  document.querySelectorAll('[data-profile-bio]').forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = currentProfile.biography || '';
    else el.textContent = currentProfile.biography || 'No biography yet.';
  });

  document.querySelectorAll('[data-profile-initials]').forEach(el => {
    el.textContent = initials;
  });

  document.querySelectorAll('[data-profile-avatar]').forEach(el => {
    if (el.tagName === 'IMG') {
      el.src = avatarUrl;
      // Handle error (e.g. broken profile image)
      el.onerror = () => { el.src = `${defaultAvatar}${encodeURIComponent(fullName || 'User')}`; };
    } else {
      el.style.backgroundImage = `url('${avatarUrl}')`;
    }
  });

  document.querySelectorAll('[data-profile-logo]').forEach(el => {
    if (el.tagName === 'IMG') el.src = logoUrl;
    else el.style.backgroundImage = `url('${logoUrl}')`;
  });
}

function notify() {
  subscribers.forEach(cb => cb(currentProfile));
  requestAnimationFrame(() => {
    applyToDOM();
  });
}

export function subscribe(callback) {
  subscribers.add(callback);
  if (isReady) callback(currentProfile);
  return () => subscribers.delete(callback);
}

export function getProfile() {
  return currentProfile;
}

export async function loadProfile() {
  // First load from local storage for fast render
  const storedUser = getStoredUser();
  if (storedUser) {
    currentProfile = storedUser;
    isReady = true;
    notify();
  }

  // Then fetch fresh from API if token exists
  if (getToken()) {
    try {
      const response = await apiFetch('/api/user/profile');
      if (response.user) {
        currentProfile = response.user;
        setAuth(getToken(), currentProfile);
        isReady = true;
        notify();
      }
    } catch (e) {
      console.warn('Failed to fetch profile', e);
    }
  }
}

export async function updateProfile(patch) {
  try {
    const response = await apiFetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    
    if (response.user) {
      currentProfile = response.user;
      setAuth(getToken(), currentProfile);
      notify();
      return currentProfile;
    }
  } catch (e) {
    console.error('Failed to update profile', e);
    throw e;
  }
}

// Set full profile object (used after image uploads)
export function setProfile(newProfile) {
  currentProfile = newProfile;
  setAuth(getToken(), currentProfile);
  notify();
}
