import { apiFetch, escapeHtml } from './api.js';

let frequencyChart = null;
let typesChart = null;
let currentRange = '24h';

export async function initDashboard() {
  const frequencyButtons = document.querySelectorAll('.flex.bg-surface-container-lowest button');
  const exportButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Export Logs');
  
  // Stats Elements (Using IDs for reliability)
  const totalErrorsEl = document.getElementById('totalErrors');
  const mostCommonTypeEl = document.getElementById('mostCommonType');
  const mostCommonCountEl = document.getElementById('mostCommonCount');
  const priorityBadgeEl = document.getElementById('priorityBadge');
  const fixSuccessRateEl = document.getElementById('fixSuccessRate');
  const fixSuccessProgressEl = document.getElementById('fixSuccessProgress');
  const categoryCountEl = document.getElementById('categoryCount');
  const categoryLegendEl = document.querySelector('section.grid:nth-of-type(2) .space-y-2');
  const recentTableBody = document.querySelector('tbody');

  async function fetchAndRender(range = currentRange) {
    try {
      const stats = await apiFetch(`/api/stats?range=${range}`);
      
      // 1. Basic Stats
      if (totalErrorsEl) totalErrorsEl.textContent = stats.totalErrors.toLocaleString();
      if (mostCommonTypeEl) mostCommonTypeEl.textContent = stats.mostCommonError.type;
      if (mostCommonCountEl) mostCommonCountEl.textContent = `Occurred ${stats.mostCommonError.count.toLocaleString()} times`;
      
      // Update Priority Badge
      if (priorityBadgeEl) {
        priorityBadgeEl.textContent = `${stats.mostCommonError.priority} PRIORITY`;
        const priority = stats.mostCommonError.priority;
        priorityBadgeEl.className = `px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
          priority === 'HIGH' ? 'bg-error-container text-error' : 
          (priority === 'MEDIUM' ? 'bg-secondary-container text-secondary' : 'bg-primary-container text-on-primary-container')
        }`;
      }

      // 2. Success Rate
      if (fixSuccessRateEl) fixSuccessRateEl.textContent = `${stats.fixSuccessRate}%`;
      if (fixSuccessProgressEl) {
        fixSuccessProgressEl.style.transition = 'width 1s ease-out';
        fixSuccessProgressEl.style.width = `${stats.fixSuccessRate}%`;
      }

      // 3. Frequency Chart (Line)
      renderFrequencyChart(stats.errorFrequency);

      // 4. Types Chart (Donut)
      renderTypesChart(stats.errorTypes);
      if (categoryCountEl) categoryCountEl.textContent = stats.errorTypes.length;

      // Update Legend
      if (categoryLegendEl) {
        const isLight = document.documentElement.classList.contains('debugai-light');
        const colors = isLight 
          ? ['#2563EB', '#7C3AED', '#F59E0B', '#EF4444', '#10B981', '#6366F1']
          : ['#8ed5ff', '#ddb7ff', '#ffc176', '#ffb4ab', '#7bd0ff', '#f0dbff'];

        categoryLegendEl.innerHTML = stats.errorTypes.map((t, i) => `
          <div class="flex justify-between items-center text-xs">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" style="background-color: ${colors[i % colors.length]}"></span>
              <span class="text-on-surface-variant">${t.type}</span>
            </div>
            <span class="font-bold text-on-surface">${t.percentage}%</span>
          </div>
        `).join('');
      }


      // 5. Recent Activity
      if (recentTableBody && stats.recentActivity) {
        recentTableBody.innerHTML = stats.recentActivity.map(activity => `
          <tr class="hover:bg-surface-variant/10 transition-colors">
            <td class="px-6 py-4 text-xs font-code-sm text-on-surface-variant">${new Date(activity.createdAt).toLocaleString()}</td>
            <td class="px-6 py-4">
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-on-surface truncate max-w-[300px]">${escapeHtml(activity.message)}</span>
                <span class="text-[10px] text-outline-variant font-code-sm">ID: ${activity.id}</span>
              </div>
            </td>
            <td class="px-6 py-4"><span class="px-2 py-0.5 bg-surface-container rounded text-[11px] text-on-surface-variant">${activity.type}</span></td>
            <td class="px-6 py-4">
              ${activity.isFixed ? 
                `<span class="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full uppercase border border-emerald-500/20"><span class="w-1 h-1 rounded-full bg-emerald-500"></span> RESOLVED</span>` : 
                `<span class="inline-flex items-center gap-1.5 px-2 py-1 bg-tertiary-container/10 text-tertiary text-[10px] font-bold rounded-full uppercase border border-tertiary-container/20"><span class="w-1 h-1 rounded-full bg-tertiary"></span> PENDING</span>`
              }
            </td>
            <td class="px-6 py-4"><a href="/history.html" class="text-primary text-xs font-semibold hover:underline">View Details</a></td>
          </tr>
        `).join('');
      }

    } catch (error) {
      console.error('Dashboard refresh failed:', error);
    }
  }

  function renderFrequencyChart(data) {
    const canvas = document.getElementById('frequencyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (frequencyChart) frequencyChart.destroy();

    const isLight = document.documentElement.classList.contains('debugai-light');
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--debugai-accent').trim() || '#8ed5ff';
    const textColor = isLight ? '#4B5563' : '#bdc8d1';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(218, 226, 253, 0.05)';

    frequencyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Errors',
          data: data.map(d => d.count),
          borderColor: accent,
          backgroundColor: isLight ? 'rgba(37, 99, 235, 0.05)' : 'rgba(142, 213, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointBackgroundColor: accent,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, stepSize: 1 } }
        }
      }
    });
  }

  function renderTypesChart(data) {
    const canvas = document.getElementById('typesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (typesChart) typesChart.destroy();

    const isLight = document.documentElement.classList.contains('debugai-light');
    const colors = isLight 
      ? ['#2563EB', '#7C3AED', '#F59E0B', '#EF4444', '#10B981', '#6366F1']
      : ['#8ed5ff', '#ddb7ff', '#ffc176', '#ffb4ab', '#7bd0ff', '#f0dbff'];

    typesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.type),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '80%',
        plugins: { legend: { display: false } }
      }
    });
  }


  // Time Filters
  frequencyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      frequencyButtons.forEach(b => {
        b.classList.remove('bg-primary/10', 'text-primary', 'font-semibold');
        b.classList.add('text-on-surface-variant');
      });
      btn.classList.add('bg-primary/10', 'text-primary', 'font-semibold');
      btn.classList.remove('text-on-surface-variant');

      currentRange = btn.textContent.trim().toLowerCase();
      fetchAndRender(currentRange);
    });
  });

  // Export Logic — FIX: API returns `errors`, not `history`
  if (exportButton) {
    exportButton.addEventListener('click', async () => {
      try {
        const data = await apiFetch('/api/history?limit=1000');
        const errors = data.errors || [];
        const csvContent = 'data:text/csv;charset=utf-8,'
          + 'Timestamp,Type,Error,Status\n'
          + errors.map(e => `"${e.createdAt}","${e.errorType}","${(e.message || '').replace(/"/g, '""')}","${e.isFixed ? 'FIXED' : 'PENDING'}"`).join('\n');
        const link = document.createElement('a');
        link.href = encodeURI(csvContent);
        link.download = `debugai_export_${new Date().toISOString()}.csv`;
        link.click();
      } catch (err) { console.error('Export failed:', err); }
    });
  }

  // Initial Fetch & Auto-Refresh (30s) — store interval for cleanup
  fetchAndRender();
  const autoRefreshInterval = setInterval(() => fetchAndRender(), 30000);
  window.addEventListener('beforeunload', () => clearInterval(autoRefreshInterval));
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
