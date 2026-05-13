import { apiFetch, escapeHtml } from './api.js';

const codeTextarea = document.getElementById('source-code');
const errorTextarea = document.getElementById('error-message');
const clearButton = document.querySelector('button[title="Clear all"]');

const analyzeButton = [...document.querySelectorAll('button')].find((button) =>
  button.textContent.includes('Analyze with AI')
);

const explanationCard = [...document.querySelectorAll('h3')].find((node) => node.textContent.includes('Error Explanation'))?.closest('.rounded-xl');
const fixCard = [...document.querySelectorAll('h3')].find((node) => node.textContent.includes('Suggested Fix'))?.closest('.rounded-xl');
const codeBlock = document.querySelector('pre code');
const resultsContainer = document.getElementById('analysis-results');

function setStatus(message, tone = 'text-on-surface-variant') {
  let status = document.querySelector('[data-debugai-status]');
  if (!status) {
    status = document.createElement('p');
    status.dataset.debugaiStatus = 'true';
    status.className = `text-sm ${tone}`;
    analyzeButton?.parentElement?.appendChild(status);
  }
  status.className = `text-sm ${tone}`;
  status.textContent = message;
}

function renderResult(result, isHistory = false) {
  if (resultsContainer) resultsContainer.classList.remove('hidden');

  if (explanationCard) {
    const paragraph = explanationCard.querySelector('p.text-on-surface');
    if (paragraph) paragraph.textContent = result.explanation;
  }

  if (fixCard) {
    const list = fixCard.querySelector('ul');
    if (list) {
      list.innerHTML = `
        <li class="flex items-start gap-3">
          <span class="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>
          <span class="text-on-surface text-sm">${escapeHtml(result.suggestedFix || result.fix)}</span>
        </li>`;
    }
  }

  if (codeBlock) {
    codeBlock.textContent = result.exampleCode || result.recommendedCode || '// No code example returned.';
  }

  if (isHistory) {
    setStatus('Viewing historical session. You can edit the code and verify the fix.', 'text-secondary font-semibold');
    
    // Add Verify Fix button if it doesn't exist
    if (!document.getElementById('verify-fix-btn')) {
      const verifyBtn = document.createElement('button');
      verifyBtn.id = 'verify-fix-btn';
      verifyBtn.className = 'w-full py-3 bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 mt-4 hover:bg-emerald-600 transition-all';
      verifyBtn.innerHTML = '<span class="material-symbols-outlined">verified</span> Verify Fix';
      verifyBtn.onclick = handleVerifyFix;
      analyzeButton?.parentElement?.appendChild(verifyBtn);
    }

    if (analyzeButton) {
      analyzeButton.innerHTML = '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">refresh</span> Re-analyze with AI';
    }
    
    // Pre-fill inputs
    if (codeTextarea) codeTextarea.value = result.code || result.sourceCode || '';
    if (errorTextarea) errorTextarea.value = result.message || result.errorMessage || '';
  }

  // Smooth scroll to results
  setTimeout(() => {
    resultsContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

async function handleVerifyFix() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');
  const updatedCode = codeTextarea?.value.trim();

  if (!sessionId || !updatedCode) return;

  const verifyBtn = document.getElementById('verify-fix-btn');
  verifyBtn.disabled = true;
  verifyBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Verifying...';

  try {
    const result = await apiFetch(`/api/history/${sessionId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updatedCode })
    });

    if (result.isFixed) {
      setStatus('Success! The fix has been verified and marked as resolved.', 'text-emerald-500 font-bold');
      verifyBtn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Verified';
      verifyBtn.className = 'w-full py-3 bg-emerald-500/20 text-emerald-500 font-bold rounded-xl flex items-center justify-center gap-2 mt-4 cursor-default';
      verifyBtn.onclick = null;
    } else {
      setStatus('Verification failed. The original error may still persist in the updated code.', 'text-error font-bold');
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = '<span class="material-symbols-outlined">warning</span> Retry Verification';
    }
  } catch (error) {
    setStatus('Verification service error. Please try again later.', 'text-error');
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = '<span class="material-symbols-outlined">verified</span> Verify Fix';
  }
}

async function loadSession() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');
  const analysisId = urlParams.get('analysisId');
  const issueIndex = urlParams.get('issueIndex');

  if (sessionId) {
    setStatus('Loading debugging session...');
    try {
      const session = await apiFetch(`/api/history/${sessionId}`);
      renderResult(session, true);
    } catch (error) {
      console.error('Failed to load session:', error);
      setStatus('Session not found or database error.', 'text-error');
    }
  } else if (analysisId && issueIndex !== null) {
    setStatus('Loading extracted issue from analysis...');
    try {
      const result = await apiFetch(`/api/uploads/${analysisId}`);
      const issue = result.issues[parseInt(issueIndex)];
      
      if (issue) {
        // Pre-fill inputs
        if (codeTextarea) codeTextarea.value = issue.codeSnippet || '';
        if (errorTextarea) errorTextarea.value = issue.message || '';
        
        // If AI already analyzed it in the background, show results
        if (issue.explanation) {
          renderResult({
            explanation: issue.explanation,
            suggestedFix: issue.suggestedFix,
            exampleCode: issue.correctedCode
          });
          setStatus('Viewing issue from upload session.', 'text-primary font-semibold');
        } else {
          // Otherwise trigger analysis automatically
          analyzeButton.click();
        }
      }
    } catch (error) {
      console.error('Failed to load analysis issue:', error);
      setStatus('Analysis result not found.', 'text-error');
    }
  }
}

const copyCodeButton = document.querySelector('#analysis-results button');
copyCodeButton?.addEventListener('click', async () => {
  if (codeBlock?.textContent) {
    try {
      await navigator.clipboard.writeText(codeBlock.textContent);
      const icon = copyCodeButton.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = 'check';
        setTimeout(() => { icon.textContent = 'content_copy'; }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  }
});

clearButton?.addEventListener('click', () => {
  if (codeTextarea) codeTextarea.value = '';
  if (errorTextarea) errorTextarea.value = '';
  if (resultsContainer) resultsContainer.classList.add('hidden');
  document.getElementById('verify-fix-btn')?.remove();
  setStatus('');
  // Clear ID from URL without reload
  const url = new URL(window.location);
  url.searchParams.delete('id');
  window.history.pushState({}, '', url);
});

analyzeButton?.addEventListener('click', async () => {
  const code = codeTextarea?.value.trim();
  const message = errorTextarea?.value.trim();

  if (!message) {
    setStatus('Paste at least the error message before analyzing.', 'text-error');
    errorTextarea?.focus();
    return;
  }

  analyzeButton.disabled = true;
  analyzeButton.classList.add('opacity-60');
  setStatus('Analyzing with code context...');

  try {
    const result = await apiFetch('/api/analyze-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, code })
    });
    renderResult(result);
    setStatus('Analysis complete. Refined fix generated.', 'text-primary');
    
    // Clear history mode if it was on
    const url = new URL(window.location);
    if (url.searchParams.has('id')) {
        url.searchParams.delete('id');
        window.history.pushState({}, '', url);
        document.getElementById('verify-fix-btn')?.remove();
    }
  } catch (error) {
    setStatus(error.message, 'text-error');
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.classList.remove('opacity-60');
  }
});

// Auto-init
loadSession();
