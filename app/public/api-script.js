/**
 * Linker — Developer API Documentation Frontend Logic
 */

/* ── DOM References ──────────────────────────────────────── */
const sandboxForm = document.getElementById('sandbox-form');
const sandboxUrl = document.getElementById('sandbox-url');
const sandboxExpiry = document.getElementById('sandbox-expiry');
const sandboxSubmit = document.getElementById('sandbox-submit');
const responseStatusText = document.getElementById('response-status-text');
const responseBodyCode = document.getElementById('response-body-code');
const toast = document.getElementById('toast');

/* ── Toast Notifications ─────────────────────────────────── */
let toastTimer = null;
function showToast(message, type = 'default') {
  toast.textContent = message;
  toast.className = `toast show${type !== 'default' ? ' ' + type : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

/* ── Code Template Data ──────────────────────────────────── */
const origin = window.location.origin || 'http://localhost:3000';

const codeTemplates = {
  shorten: {
    curl: `curl -X POST ${origin}/shorten \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/very/long/url", "expiresIn": 3600000}'`,
    js: `fetch('${origin}/shorten', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/very/long/url',
    expiresIn: 3600000 // optional, in milliseconds
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));`,
    python: `import requests

payload = {
    "url": "https://example.com/very/long/url",
    "expiresIn": 3600000 # optional, in milliseconds
}
response = requests.post("${origin}/shorten", json=payload)
print(response.json())`,
    go: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    data := map[string]interface{}{
        "url":       "https://example.com/very/long/url",
        "expiresIn": 3600000,
    }
    jsonData, _ := json.Marshal(data)
    
    resp, err := http.Post("${origin}/shorten", "application/json", bytes.NewBuffer(jsonData))
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Println(result)
}`
  },
  stats: {
    curl: `curl -X GET ${origin}/api/stats`,
    js: `fetch('${origin}/api/stats')
  .then(res => res.json())
  .then(data => console.log(data));`,
    python: `import requests

response = requests.get("${origin}/api/stats")
print(response.json())`,
    go: `package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    resp, err := http.Get("${origin}/api/stats")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Println(result)
}`
  }
};

/* ── Code Tab Switching ──────────────────────────────────── */
function updateCodeBlocks() {
  document.querySelectorAll('.code-tabs').forEach(tabContainer => {
    const endpoint = tabContainer.getAttribute('data-endpoint');
    const activeTab = tabContainer.querySelector('.tab-btn.active');
    if (!activeTab) return;
    
    const lang = activeTab.getAttribute('data-lang');
    const codeBlock = document.getElementById(`code-${endpoint}-block`);
    if (codeBlock && codeTemplates[endpoint] && codeTemplates[endpoint][lang]) {
      codeBlock.textContent = codeTemplates[endpoint][lang];
    }
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const siblings = e.target.parentElement.querySelectorAll('.tab-btn');
    siblings.forEach(s => s.classList.remove('active'));
    e.target.classList.add('active');
    updateCodeBlocks();
  });
});

/* ── Live Playground Sandbox Console ─────────────────────── */
sandboxForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const rawUrl = sandboxUrl.value.trim();
  const rawExpiry = sandboxExpiry.value;
  
  if (!rawUrl) {
    showToast('❌ Please provide a URL', 'error');
    return;
  }
  
  sandboxSubmit.disabled = true;
  const originalText = sandboxSubmit.innerHTML;
  sandboxSubmit.innerHTML = '<span>Sending...</span><span class="btn-loader" style="display:block;border-color:rgba(255,255,255,0.3);border-top-color:#fff;width:14px;height:14px;"></span>';
  
  responseStatusText.textContent = 'Sending...';
  responseStatusText.className = 'response-status';
  responseBodyCode.textContent = 'Executing network request...';
  
  try {
    const payload = { url: rawUrl };
    if (rawExpiry !== 'none') {
      payload.expiresIn = Number(rawExpiry);
    }
    
    const startTime = performance.now();
    const res = await fetch('/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    const statusText = `${res.status} ${res.statusText} (${duration}ms)`;
    responseStatusText.textContent = statusText;
    
    const data = await res.json().catch(() => ({}));
    
    responseBodyCode.textContent = JSON.stringify(data, null, 2);
    
    if (res.ok) {
      responseStatusText.classList.add('success');
      showToast('⚡ Live request successful!', 'success');
    } else {
      responseStatusText.classList.add('error');
      showToast(`❌ Request failed: ${data.message || res.statusText}`, 'error');
    }
  } catch (err) {
    responseStatusText.textContent = 'Error';
    responseStatusText.classList.add('error');
    responseBodyCode.textContent = `Network Error:\n${err.message}`;
    showToast('❌ Network connection error', 'error');
  } finally {
    sandboxSubmit.disabled = false;
    sandboxSubmit.innerHTML = originalText;
  }
});

/* ── Init ────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  updateCodeBlocks();
});
