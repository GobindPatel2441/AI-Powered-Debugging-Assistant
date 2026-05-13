(function() {
  // Prevent flashing during theme hydration
  document.documentElement.classList.add('no-transitions');
  
  const STORAGE_KEY = 'debugai.settings';
  const AUTH_KEY = 'debugai-user';
  
  let theme = 'dark'; // Default
  
  try {
    // Check if user is logged in
    const authData = localStorage.getItem(AUTH_KEY);
    if (authData) {
      const user = JSON.parse(authData);
      if (user.preferences && user.preferences.theme) {
        theme = user.preferences.theme;
      }
    } else {
      // Check local settings
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const settings = JSON.parse(localData);
        if (settings.preferences && settings.preferences.theme) {
          theme = settings.preferences.theme;
        }
      }
    }
  } catch (e) {
    console.warn('Theme hydration failed', e);
  }
  
  if (theme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('debugai-light');
    document.documentElement.style.backgroundColor = '#F5F7FB';
    if (document.body) document.body.style.backgroundColor = '#F5F7FB';
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('debugai-light');
    document.documentElement.style.backgroundColor = '#0b1326';
    if (document.body) document.body.style.backgroundColor = '#0b1326';
  }
  
  // Re-enable transitions after initial render
  window.addEventListener('load', () => {
    // Small delay to allow layout to settle
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions');
      const overlay = document.querySelector('.page-transition-overlay');
      if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 400);
      }
    });
  });
})();
