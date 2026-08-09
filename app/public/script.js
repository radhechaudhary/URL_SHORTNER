/**
 * SwiftLink — URL Shortener Frontend Logic
 * Communicates with the Express backend at /api/shorten
 */

/* ── DOM References ──────────────────────────────────────── */
const longUrlInput = document.getElementById('long-url-input');
const inputWrapper = document.getElementById('input-wrapper');
const clearBtn = document.getElementById('clear-btn');
const shortenBtn = document.getElementById('shorten-btn');
const resultGroup = document.getElementById('result-group');
const shortUrlOutput = document.getElementById('short-url-output');
const copyBtn = document.getElementById('copy-btn');
const openLink = document.getElementById('open-link');
const shortenAnotherBtn = document.getElementById('shorten-another-btn');
const urlError = document.getElementById('url-error');
const toast = document.getElementById('toast');

/* ── Toast ───────────────────────────────────────────────── */
let toastTimer = null;

function showToast(message, type = 'default') {
  toast.textContent = message;
  toast.className = `toast show${type !== 'default' ? ' ' + type : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

/* ── URL Validation ──────────────────────────────────────── */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function setError(msg) {
  urlError.textContent = msg;
  inputWrapper.classList.add('error');
}

function clearError() {
  urlError.textContent = '';
  inputWrapper.classList.remove('error');
}

/* ── Input events ────────────────────────────────────────── */
longUrlInput.addEventListener('input', () => {
  clearError();
  clearBtn.hidden = longUrlInput.value.trim() === '';
});

longUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') shortenUrl();
});

clearBtn.addEventListener('click', () => {
  longUrlInput.value = '';
  clearBtn.hidden = true;
  clearError();
  longUrlInput.focus();
  hideResult();
});

/* ── Hide / show result ──────────────────────────────────── */
function hideResult() {
  resultGroup.hidden = true;
  shortUrlOutput.value = '';
  openLink.href = '#';
}

/* ── Shorten URL ─────────────────────────────────────────── */
async function shortenUrl() {
  const raw = longUrlInput.value.trim();

  if (!raw) {
    setError('Please enter a URL.');
    longUrlInput.focus();
    return;
  }

  if (!isValidUrl(raw)) {
    setError('Please enter a valid URL starting with http:// or https://');
    longUrlInput.focus();
    return;
  }

  clearError();
  hideResult();

  /* Loading state */
  shortenBtn.disabled = true;
  shortenBtn.classList.add('loading');

  try {
    const response = await fetch('/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: raw }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Server error (${response.status})`);
    }

    const data = await response.json();
    const shortUrl = data.shortUrl || data.short_url || data.url;

    if (!shortUrl) throw new Error('Invalid response from server.');

    /* Show result */
    shortUrlOutput.value = shortUrl;
    openLink.href = shortUrl;
    resultGroup.hidden = false;

    showToast('✅ Short link created!', 'success');
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
    setError(err.message);
  } finally {
    shortenBtn.disabled = false;
    shortenBtn.classList.remove('loading');
  }
}

shortenBtn.addEventListener('click', shortenUrl);

/* ── Copy to clipboard ───────────────────────────────────── */
copyBtn.addEventListener('click', async () => {
  const text = shortUrlOutput.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.classList.add('copied');
    copyBtn.querySelector('.copy-icon').textContent = '✅';
    copyBtn.querySelector('.copy-text').textContent = 'Copied!';
    showToast('📋 Link copied to clipboard!', 'success');

    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.querySelector('.copy-icon').textContent = '📋';
      copyBtn.querySelector('.copy-text').textContent = 'Copy';
    }, 2500);
  } catch {
    /* Fallback for older browsers */
    shortUrlOutput.select();
    document.execCommand('copy');
    showToast('📋 Link copied!', 'success');
  }
});

/* ── Shorten Another ─────────────────────────────────────── */
shortenAnotherBtn.addEventListener('click', () => {
  longUrlInput.value = '';
  clearBtn.hidden = true;
  clearError();
  hideResult();
  longUrlInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ── Focus input on page load ────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  longUrlInput.focus();
});
