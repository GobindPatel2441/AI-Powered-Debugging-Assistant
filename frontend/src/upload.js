import { authFetch } from './auth.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const selectFilesBtn = document.getElementById('select-files-btn');
const fileQueueCard = document.getElementById('file-queue-card');
const fileList = document.getElementById('file-list');
const queueCount = document.getElementById('queue-count');
const startAnalysisBtn = document.getElementById('start-analysis-btn');
const extractedErrorsList = document.getElementById('extracted-errors-list');

let selectedFiles = [];
let analysisId = null;
let pollInterval = null;

// --- Event Listeners ---

selectFilesBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => addFiles(e.target.files);

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

startAnalysisBtn.onclick = startAnalysis;

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
  if (selectedFiles.length > 0) {
    fileQueueCard.classList.remove('hidden');
  } else {
    fileQueueCard.classList.add('hidden');
  }

  queueCount.textContent = `${selectedFiles.length} FILES DETECTED`;
  fileList.innerHTML = selectedFiles.map((file, i) => `
    <div class="flex items-center justify-between p-3 mb-2 bg-surface/50 border border-outline-variant/10 rounded-xl hover:bg-surface-variant/5 transition-all group">
      <div class="flex items-center gap-4 overflow-hidden">
        <div class="w-10 h-10 min-w-[40px] rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
          <span class="material-symbols-outlined text-xl">${getFileIcon(file.name)}</span>
        </div>
        <div class="flex flex-col overflow-hidden">
          <span class="font-code-sm text-sm text-on-surface truncate pr-2">${file.name}</span>
          <span class="text-[10px] text-on-surface-variant font-medium">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      </div>
      <button onclick="window.removeFile(${i})" class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-all">
        <span class="material-symbols-outlined text-lg">delete</span>
      </button>
    </div>
  `).join('');
}

window.removeFile = removeFile; // Expose to inline onclick

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) return 'code';
  if (ext === 'py') return 'terminal';
  if (ext === 'log' || ext === 'txt') return 'article';
  if (ext === 'json') return 'data_object';
  return 'description';
}

async function startAnalysis() {
  if (selectedFiles.length === 0) return;

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
    
    // Start polling for results
    pollInterval = setInterval(pollResults, 2000);
    renderExtractedPlaceholder('Analyzing your files with AI...');
  } catch (err) {
    console.error(err);
    alert('Failed to start analysis');
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
      startAnalysisBtn.innerHTML = '<span class="material-symbols-outlined text-sm mr-2">check</span>Analysis Complete';
      startAnalysisBtn.classList.replace('bg-primary', 'bg-emerald-500');
    }
  } catch (err) {
    console.error('Polling failed:', err);
    clearInterval(pollInterval);
  }
}

function updateStats(data) {
  const dashboard = document.getElementById('analysis-dashboard');
  if (dashboard) dashboard.classList.remove('hidden');

  const filesEl = document.getElementById('stat-files');
  const issuesEl = document.getElementById('stat-issues');
  const criticalEl = document.getElementById('stat-critical');
  const statusEl = document.getElementById('stat-status');

  if (filesEl) filesEl.textContent = data.files.length;
  if (issuesEl) issuesEl.textContent = data.totalIssues || 0;
  if (criticalEl) criticalEl.textContent = data.criticalIssues || 0;
  if (statusEl) {
    statusEl.textContent = data.status;
    if (data.status === 'COMPLETED') {
      statusEl.className = 'text-xs font-bold text-emerald-500';
    }
  }
}

function renderIssues(issues) {
  if (!issues || issues.length === 0) {
    renderExtractedPlaceholder('No issues detected in the uploaded files.');
    return;
  }

  extractedErrorsList.innerHTML = issues.map((issue, idx) => `
    <div class="p-4 border-b border-outline-variant/10 hover:bg-surface-variant/10 transition-all cursor-pointer group" 
         onclick="window.navigateToAnalyze('${analysisId}', ${idx})">
      <div class="flex justify-between items-start mb-2">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityClass(issue.severity)} font-code-sm">
          ${issue.severity}
        </span>
        <span class="text-[10px] text-on-surface-variant font-code-sm">${new Date(issue.timestamp).toLocaleTimeString()}</span>
      </div>
      <p class="font-code-sm text-sm text-on-surface mb-1 leading-relaxed group-hover:text-primary transition-colors">
        ${issue.title}
      </p>
      <div class="flex items-center gap-2 text-[10px] text-on-surface-variant">
        <span class="material-symbols-outlined text-[12px]">draft</span>
        <span>${issue.file}:${issue.line}</span>
      </div>
    </div>
  `).join('');
}

function renderExtractedPlaceholder(msg) {
  extractedErrorsList.innerHTML = `
    <div class="p-8 text-center animate-in fade-in">
      <span class="material-symbols-outlined text-on-surface-variant/30 text-4xl mb-3 animate-pulse">troubleshoot</span>
      <p class="text-on-surface-variant text-sm">${msg}</p>
    </div>
  `;
}

function getSeverityClass(sev) {
  if (sev === 'CRITICAL') return 'bg-error text-on-error';
  if (sev === 'WARNING') return 'bg-tertiary text-on-tertiary';
  return 'bg-secondary text-on-secondary';
}

window.navigateToAnalyze = (aId, iIdx) => {
  window.location.href = `/analyze.html?analysisId=${aId}&issueIndex=${iIdx}`;
};
