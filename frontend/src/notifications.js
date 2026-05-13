const STORAGE_KEY = 'debugai.notifications';

const mockNotifications = [
  {
    id: 1,
    title: 'New Error Detected',
    message: 'TypeError in src/components/Auth.tsx has been captured.',
    time: '2m ago',
    type: 'error',
    read: false
  },
  {
    id: 2,
    title: 'Analysis Complete',
    message: 'The log file server_runtime.log has been fully processed.',
    time: '15m ago',
    type: 'success',
    read: false
  },
  {
    id: 3,
    title: 'System Update',
    message: 'DebugAI v2.4.0-stable is now live with improved neural patterns.',
    time: '1h ago',
    type: 'info',
    read: true
  }
];

function getNotifications() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : mockNotifications;
}

function saveNotifications(notifications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export function initNotifications() {
  const bellBtn = document.getElementById('notification-bell');
  if (!bellBtn) return;

  // Create Dropdown if it doesn't exist
  let panel = document.getElementById('notification-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'notification-panel';
    panel.className = 'absolute right-0 mt-2 w-80 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden z-50 hidden transition-all duration-200 transform origin-top-right scale-95 opacity-0';
    panel.innerHTML = `
      <div class="px-4 py-3 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-highest">
        <h3 class="text-sm font-semibold text-on-surface">Notifications</h3>
        <button id="mark-all-read" class="text-[10px] font-label-caps text-primary hover:underline">Clear all</button>
      </div>
      <div id="notification-list" class="max-h-[400px] overflow-y-auto">
        <!-- Notifications will be injected here -->
      </div>
      <div class="px-4 py-2 border-t border-outline-variant/20 bg-surface-container-low text-center">
        <button class="text-[11px] text-on-surface-variant hover:text-primary transition-colors">View all activity</button>
      </div>
    `;
    bellBtn.parentElement.classList.add('relative');
    bellBtn.parentElement.appendChild(panel);
  }

  function renderList() {
    const allNotifications = getNotifications();
    const unreadNotifications = allNotifications.filter(n => !n.read);
    const list = document.getElementById('notification-list');
    const badge = bellBtn.querySelector('.notification-badge');

    const unreadCount = unreadNotifications.length;
    if (badge) {
      badge.classList.toggle('hidden', unreadCount === 0);
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    }

    if (unreadNotifications.length === 0) {
      list.innerHTML = `
        <div class="p-8 text-center flex flex-col items-center gap-2">
          <span class="material-symbols-outlined text-outline-variant text-4xl">notifications_off</span>
          <p class="text-xs text-on-surface-variant font-medium">All caught up!</p>
          <p class="text-[10px] text-on-surface-variant/60">No new notifications to show.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = unreadNotifications.map(n => `
      <div class="px-4 py-4 border-b border-outline-variant/10 hover:bg-surface-variant/5 transition-colors cursor-pointer group flex items-start gap-3" data-id="${n.id}">
        <div class="w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.type === 'error' ? 'bg-error' : n.type === 'success' ? 'bg-emerald-500' : 'bg-primary'} shadow-[0_0_4px_currentColor]"></div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start mb-1 gap-2">
            <span class="text-[13px] font-bold text-on-surface group-hover:text-primary transition-colors truncate">${n.title}</span>
            <span class="text-[10px] text-on-surface-variant/70 font-medium flex-shrink-0">${n.time}</span>
          </div>
          <p class="text-[12px] text-on-surface-variant/90 leading-relaxed line-clamp-2 font-medium">${n.message}</p>
        </div>
        <button class="mark-single-read opacity-0 group-hover:opacity-100 transition-opacity p-1 text-on-surface-variant hover:text-primary flex-shrink-0" title="Mark as read">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    `).join('');

    // Attach individual read listeners
    list.querySelectorAll('[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.id);
        const current = getNotifications();
        const updated = current.map(notif => notif.id === id ? { ...notif, read: true } : notif);
        saveNotifications(updated);
        renderList();
      });
    });
  }

  // Open/Close logic
  function togglePanel(e) {
    if (e) e.stopPropagation();
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
      panel.classList.remove('hidden');
      setTimeout(() => {
        panel.classList.remove('scale-95', 'opacity-0');
        panel.classList.add('scale-100', 'opacity-100');
      }, 10);
      renderList();
    } else {
      panel.classList.add('scale-95', 'opacity-0');
      panel.classList.remove('scale-100', 'opacity-100');
      setTimeout(() => panel.classList.add('hidden'), 200);
    }
  }

  // Remove old listener if re-initializing
  bellBtn.onclick = togglePanel;

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !bellBtn.contains(e.target)) {
      if (!panel.classList.contains('hidden')) {
        panel.classList.add('scale-95', 'opacity-0');
        panel.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => panel.classList.add('hidden'), 200);
      }
    }
  });

  // Use event delegation for the panel
  panel.onclick = (e) => {
    const target = e.target;
    
    // Mark All Read
    if (target.id === 'mark-all-read') {
      e.stopPropagation();
      const current = getNotifications();
      const updated = current.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      renderList();
    }
    
    // Individual Read
    const item = target.closest('[data-id]');
    if (item) {
      const id = parseInt(item.dataset.id);
      const current = getNotifications();
      const updated = current.map(notif => notif.id === id ? { ...notif, read: true } : notif);
      saveNotifications(updated);
      renderList();
    }
  };

  renderList();
}

// Auto-init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotifications);
} else {
  initNotifications();
}
