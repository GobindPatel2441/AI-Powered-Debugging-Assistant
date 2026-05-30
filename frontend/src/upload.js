import { authFetch } from './auth.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const selectFilesBtn = document.getElementById('select-files-btn');
const fileQueueCard = document.getElementById('file-queue-card');
const fileList = document.getElementById('file-list');
const queueCount = document.getElementById('queue-count');
const startAnalysisBtn = document.getElementById('start-analysis-btn');
const extractedErrorsList = document.getElementById('extracted-errors-list');
const fixModal = document.getElementById('fix-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalCopyBtn = document.getElementById('modal-copy');
const modalCode = document.getElementById('modal-code');

let selectedFiles = [];
let analysisId = null;
let pollInterval = null;

// --- XSS-safe HTML escape ---
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// --- Event Listeners ---
if (selectFilesBtn) selectFilesBtn.onclick = () => fileInput && fileInput.click();
if (fileInput) fileInput.onchange = (e) => addFiles(e.target.files);

if (dropZone) {
  dropZone.ondragover = (e) => {
    e.preventDefault();
    dropZone.classList.add('border-primary', 'bg-primary/5');
  };
  dropZone.ondragleave = () => {
    dropZone.classList.remove('border-primary', 'bg-primary/5');
  };
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-primary', 'bg-primary/5');
    addFiles(e.dataTransfer.files);
  };
}

if (startAnalysisBtn) startAnalysisBtn.onclick = startAnalysis;

// Event delegation for file list remove buttons — avoids XSS-prone window globals
if (fileList) {
  fileList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-index]');
    if (btn) {
      const index = parseInt(btn.dataset.removeIndex, 10);
      removeFile(index);
    }
  });
}

// Event delegation for extracted issues — avoids XSS-prone inline onclick
if (extractedErrorsList) {
  extractedErrorsList.addEventListener('click', (e) => {
    const item = e.target.closest('[data-analysis-id]');
    if (item && item.dataset.issueIndex !== undefined) {
      const aId = item.dataset.analysisId;
      const iIdx = item.dataset.issueIndex;
      window.location.href = `/analyze.html?analysisId=${encodeURIComponent(aId)}&issueIndex=${encodeURIComponent(iIdx)}`;
    }
  });
}

// Modal controls
if (closeModalBtn && fixModal) closeModalBtn.onclick = () => fixModal.classList.add('hidden');
if (modalCopyBtn) {
  modalCopyBtn.onclick = async () => {
    const code = modalCode ? modalCode.textContent : '';
    try {
      await navigator.clipboard.writeText(code);
      modalCopyBtn.textContent = 'Copied!';
      setTimeout(() => { modalCopyBtn.textContent = 'Copy Fix'; }, 2000);
    } catch { /* clipboard blocked */ }
  };
}

// --- Logic ---
function addFiles(files) {
  const newFiles = Array.from(files);
  selectedFiles = [...selectedFiles, ...newFiles];
  renderQueue();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderQueue();
}

function renderQueue() {
  if (!fileQueueCard || !fileList || !queueCount) return;
  fileQueueCard.classList.toggle('hidden', selectedFiles.length === 0);
  queueCount.textContent = `${selectedFiles.length} FILES DETECTED`;

  // Use data attributes, no global onclick — XSS safe
  fileList.innerHTML = selectedFiles.map((file, i) => `
    <div class="flex items-center justify-between p-3 mb-2 bg-surface/50 border border-outline-variant/10 rounded-xl hover:bg-surface-variant/5 transition-all group">
      <div class="flex items-center gap-4 overflow-hidden">
        <div class="w-10 h-10 min-w-[40px] rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
          <span class="material-symbols-outlined text-xl">${getFileIcon(file.name)}</span>
        </div>
        <div class="flex flex-col overflow-hidden">
          <span class="font-code-sm text-sm text-on-surface truncate pr-2">${escapeHtml(file.name)}</span>
          <span class="text-[10px] text-on-surface-variant font-medium">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      </div>
      <button data-remove-index="${i}" class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-all" title="Remove file">
        <span class="material-symbols-outlined text-lg">delete</span>
      </button>
    </div>
  `).join('');
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) return 'code';
  if (ext === 'py') return 'terminal';
  if (ext === 'log' || ext === 'txt') return 'article';
  if (ext === 'json') return 'data_object';
  return 'description';
}

async function startAnalysis() {
  if (!selectedFiles.length || !startAnalysisBtn) return;

  // Always clear any prior polling before starting new one
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  startAnalysisBtn.disabled = true;
  startAnalysisBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm mr-2">sync</span>Analyzing...';

  const formData = new FormData();
  selectedFiles.forEach(file => formData.append('files', file));

  try {
    const data = await authFetch('/api/uploads', {
      method: 'POST',
      body: formData
    });
    analysisId = data.analysisId;
    pollInterval = setInterval(pollResults, 2000);
    renderExtractedPlaceholder('Analyzing your files with AI...');
  } catch (err) {
    console.error('Upload failed:', err);
    renderExtractedPlaceholder(`Failed to start analysis: ${escapeHtml(err.message)}`);
    startAnalysisBtn.disabled = false;
    startAnalysisBtn.textContent = 'Start AI Analysis';
  }
}

async function pollResults() {
  if (!analysisId) return;
  try {
    const data = await authFetch(`/api/uploads/${analysisId}`);
    updateStats(data);

    if (data.status === 'COMPLETED' || data.status === 'ANALYZING') {
      renderIssues(data.issues);
    }
    if (data.status === 'COMPLETED') {
      clearInterval(pollInterval);
      pollInterval = null;
      if (startAnalysisBtn) {
        startAnalysisBtn.innerHTML = '<span class="material-symbols-outlined text-sm mr-2">check</span>Analysis Complete';
        startAnalysisBtn.classList.replace('bg-primary', 'bg-emerald-500');
      }
    } else if (data.status === 'FAILED') {
      clearInterval(pollInterval);
      pollInterval = null;
      renderExtractedPlaceholder('Analysis failed. Please try again.');
      if (startAnalysisBtn) {
        startAnalysisBtn.disabled = false;
        startAnalysisBtn.textContent = 'Start AI Analysis';
      }
    }
  } catch (err) {
    console.error('Polling failed:', err);
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function updateStats(data) {
  const dashboard = document.getElementById('analysis-dashboard');
  if (dashboard) dashboard.classList.remove('hidden');

  const filesEl = document.getElementById('stat-files');
  const issuesEl = document.getElementById('stat-issues');
  const criticalEl = document.getElementById('stat-critical');
  const statusEl = document.getElementById('stat-status');

  // FIX: Backend returns `analyzedFiles`, not `files`
  if (filesEl) filesEl.textContent = (data.analyzedFiles || []).length;
  if (issuesEl) issuesEl.textContent = data.totalIssues || 0;
  if (criticalEl) criticalEl.textContent = data.criticalIssues || 0;
  if (statusEl) {
    statusEl.textContent = data.status;
    if (data.status === 'COMPLETED') statusEl.className = 'text-xs font-bold text-emerald-500';
  }
}

function renderIssues(issues) {
  if (!extractedErrorsList) return;
  if (!issues || issues.length === 0) {
    renderExtractedPlaceholder('No issues detected in the uploaded files.');
    return;
  }
  // Use data-* attributes and event delegation instead of inline onclick with globals
  extractedErrorsList.innerHTML = issues.map((issue, idx) => `
    <div class="p-4 border-b border-outline-variant/10 hover:bg-surface-variant/10 transition-all cursor-pointer group"
         data-analysis-id="${escapeHtml(String(analysisId))}"
         data-issue-index="${idx}"
         role="button"
         tabindex="0"
         aria-label="View issue: ${escapeHtml(issue.title || '')}">
      <div class="flex justify-between items-start mb-2">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityClass(issue.severity)} font-code-sm">${escapeHtml(issue.severity || 'INFO')}</span>
        <span class="text-[10px] text-on-surface-variant font-code-sm">${issue.timestamp ? new Date(issue.timestamp).toLocaleTimeString() : ''}</span>
      </div>
      <p class="font-code-sm text-sm text-on-surface mb-1 leading-relaxed group-hover:text-primary transition-colors">
        ${escapeHtml(issue.title || '')}
      </p>
      <div class="flex items-center gap-2 text-[10px] text-on-surface-variant">
        <span class="material-symbols-outlined text-[12px]">draft</span>
        <span>${escapeHtml(String(issue.file || ''))}:${issue.line || ''}</span>
      </div>
    </div>
  `).join('');
}

function renderExtractedPlaceholder(msg) {
  if (!extractedErrorsList) return;
  extractedErrorsList.innerHTML = `
    <div class="p-8 text-center animate-in fade-in">
      <span class="material-symbols-outlined text-on-surface-variant/30 text-4xl mb-3 animate-pulse">troubleshoot</span>
      <p class="text-on-surface-variant text-sm">${escapeHtml(msg)}</p>
    </div>
  `;
}

function getSeverityClass(sev) {
  if (sev === 'CRITICAL') return 'bg-error text-on-error';
  if (sev === 'WARNING') return 'bg-tertiary text-on-tertiary';
  return 'bg-secondary text-on-secondary';
}

// Prevent memory leaks — clean up polling on navigation
window.addEventListener('beforeunload', () => {
  if (pollInterval) clearInterval(pollInterval);
});
