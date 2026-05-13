import { apiFetch, escapeHtml } from './api.js';

const tbody = document.querySelector('tbody');
const totalLogsEl = [...document.querySelectorAll('p')].find((node) => node.textContent === '14,292');

// Filters & Controls
const searchInput = document.getElementById('history-search');
const severityFilter = document.getElementById('filter-severity');
const statusFilter = document.getElementById('filter-status');
const exportBtn = document.getElementById('export-csv-btn');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumbersEl = document.getElementById('page-numbers');
const startCountEl = document.getElementById('start-count');
const endCountEl = document.getElementById('end-count');
const totalCountEl = document.getElementById('total-count');

let currentPage = 1;
const limit = 10;
let totalPages = 1;

function formatDate(value) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

async function toggleFixStatus(id, currentStatus) {
  try {
    const newStatus = !currentStatus;
    await apiFetch(`/api/history/${id}/fix`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFixed: newStatus })
    });
    loadHistory();
  } catch (error) {
    console.error('Failed to update fix status:', error);
  }
}

function renderHistory(data) {
  const { errors, total, pages, currentPage: current } = data;
  totalPages = pages;
  
  if (totalLogsEl) totalLogsEl.textContent = total.toLocaleString();
  if (totalCountEl) totalCountEl.textContent = total.toLocaleString();
  if (startCountEl) startCountEl.textContent = total > 0 ? (current - 1) * limit + 1 : 0;
  if (endCountEl) endCountEl.textContent = Math.min(current * limit, total);

  if (!tbody) return;

  if (!errors.length) {
    tbody.innerHTML = `<tr><td class="px-6 py-8 text-center text-on-surface-variant" colspan="5">No matching sessions found.</td></tr>`;
    return;
  }

  tbody.innerHTML = errors
    .map((item) => {
      const severityColor = item.severity === 'Critical' ? 'bg-error-container text-on-error-container' : 
                          item.severity === 'High' ? 'bg-orange-500/10 text-orange-500' : 
                          item.severity === 'Medium' ? 'bg-secondary-container text-secondary' : 'bg-primary-container text-on-primary-container';
      
      return `
      <tr class="hover:bg-surface-container-high/20 transition-colors group">
        <td class="px-6 py-4">
          <div class="flex items-start gap-3">
            <div class="mt-1 w-2 h-2 rounded-full ${item.isFixed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-error animate-pulse'}"></div>
            <div>
              <p class="text-on-surface font-code-sm text-sm group-hover:text-primary transition-colors">${escapeHtml(item.message)}</p>
              <p class="text-[10px] text-outline-variant font-body-base mt-1 line-clamp-1 opacity-60">${escapeHtml(item.explanation)}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <p class="text-on-surface-variant text-sm font-medium">${formatDate(item.createdAt)}</p>
          <p class="text-[10px] text-outline-variant uppercase tracking-tighter opacity-50">${item.errorType || 'Runtime'}</p>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${severityColor}">${item.severity || 'Medium'}</span>
        </td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-2">
            <button 
              class="fix-toggle flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-200 ${item.isFixed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-surface-container hover:bg-emerald-500/5 text-on-surface-variant border-outline-variant/30'}"
              data-id="${item._id}" 
              data-fixed="${item.isFixed}"
            >
              <span class="material-symbols-outlined text-[14px]">${item.isFixed ? 'check_circle' : 'radio_button_unchecked'}</span>
              <span class="text-[10px] font-bold uppercase">${item.isFixed ? 'Fixed' : 'Pending'}</span>
            </button>
          </div>
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex justify-end gap-2">
            <button 
              class="p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-all view-details-btn" 
              onclick="window.location.href='/analyze.html?id=${item._id}'"
              title="View full session"
            >
              <span class="material-symbols-outlined text-[18px]">visibility</span>
            </button>
          </div>
        </td>
      </tr>`;
    })
    .join('');

  renderPagination(pages, current);
  attachEventListeners();
}

function renderPagination(pages, current) {
  if (!pageNumbersEl) return;
  pageNumbersEl.innerHTML = '';
  
  prevPageBtn.disabled = current <= 1;
  nextPageBtn.disabled = current >= pages;

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement('button');
    btn.className = `w-8 h-8 rounded-lg text-xs font-bold transition-all ${i === current ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-surface-container-high border border-outline-variant/20 text-on-surface-variant hover:border-primary'}`;
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      loadHistory();
    };
    pageNumbersEl.appendChild(btn);
  }
}

function attachEventListeners() {
  document.querySelectorAll('.fix-toggle').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const isFixed = btn.getAttribute('data-fixed') === 'true';
      toggleFixStatus(id, isFixed);
    };
  });
}

async function loadHistory() {
  try {
    const search = searchInput?.value || '';
    const severity = severityFilter?.value || '';
    const status = statusFilter?.value || '';
    
    const query = new URLSearchParams({
      page: currentPage,
      limit,
      search,
      severity,
      status
    });

    const result = await apiFetch(`/api/history?${query.toString()}`);
    renderHistory(result);
  } catch (error) {
    if (tbody) {
      tbody.innerHTML = `<tr><td class="px-6 py-8 text-center text-error" colspan="5">${escapeHtml(error.message)}</td></tr>`;
    }
  }
}

// Debounced Search
let searchTimeout;
searchInput?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage = 1;
    loadHistory();
  }, 400);
});

[severityFilter, statusFilter].forEach(el => {
  el?.addEventListener('change', () => {
    currentPage = 1;
    loadHistory();
  });
});

prevPageBtn?.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadHistory();
  }
});

nextPageBtn?.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    loadHistory();
  }
});

exportBtn?.addEventListener('click', () => {
  window.location.href = '/api/history/export-csv';
});

// Initial Load
loadHistory();
