import { loadProfile } from './userProfile.js';
import { logout, requireAuth } from './auth.js';

const routes = {
  Dashboard: '/',
  'Analyze Error': '/analyze.html',
  'Upload Logs': '/upload.html',
  History: '/history.html',
  Settings: '/settings.html',
  Home: '/',
  Analyze: '/analyze.html',
  Upload: '/upload.html'
};

document.querySelectorAll('a').forEach((link) => {
  const label = link.textContent.replace(/\s+/g, ' ').trim();
  const routeKey = Object.keys(routes).find((key) => label === key || label.endsWith(` ${key}`));

  if (routeKey) {
    link.href = routes[routeKey];
  }
});

document.querySelectorAll('button').forEach((button) => {
  if (button.textContent.includes('New Analysis') || button.textContent.trim() === 'add') {
    button.addEventListener('click', () => {
      window.location.href = '/analyze.html';
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Protect all dashboard routes
  requireAuth();

  // Initialize the user profile global state
  loadProfile();

  // Attach logout handler if logout button exists
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Prefetch links for instant navigation
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http')) return;
    link.addEventListener('mouseenter', () => {
      const p = document.createElement('link'); p.rel = 'prefetch'; p.href = href;
      document.head.appendChild(p);
    }, { once: true });
  });
});
