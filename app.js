// App logic: camera, scanning loop, history, export, paste decode.

const els = {
  video: document.getElementById('video'),
  overlay: document.getElementById('overlay'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  flipBtn: document.getElementById('flipBtn'),
  scanStatus: document.getElementById('scanStatus'),
  result: document.getElementById('result'),
  resultBody: document.getElementById('resultBody'),
  closeResult: document.getElementById('closeResult'),
  historyList: document.getElementById('historyList'),
  historyCount: document.getElementById('historyCount'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  clearBtn: document.getElementById('clearBtn'),
  pasteInput: document.getElementById('pasteInput'),
  parsePasteBtn: document.getElementById('parsePasteBtn'),
  pasteResult: document.getElementById('pasteResult'),
  tabs: document.querySelectorAll('.tab'),
};

const STORAGE_KEY = 'emvco_scans_v1';
let stream = null;
let scanning = false;
let useFacingMode = 'environment';
let lastDecoded = null;

// --- Tab navigation ---
els.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const view = tab.dataset.view;
    els.tabs.forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
    if (view === 'history') renderHistory();
  });
});

// --- Camera ---
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: useFacingMode },
      audio: false,
    });
    els.video.srcObject = stream;
    await els.video.play();
    scanning = true;
    els.startBtn.disabled = true;
    els.stopBtn.disabled = false;
    els.flipBtn.disabled = false;
    els.scanStatus.textContent = 'Scanning… point at a QR code.';
    requestAnimationFrame(scanLoop);
  } catch (err) {
    els.scanStatus.textContent = 'Camera error: ' + err.message;
  }
}

function stopCamera() {
  scanning = false;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  els.startBtn.disabled = false;
  els.stopBtn.disabled = true;
  els.flipBtn.disabled = true;
  els.scanStatus.textContent = 'Stopped.';
}

function flipCamera() {
  useFacingMode = useFacingMode === 'environment' ? 'user' : 'environment';
  stopCamera();
  setTimeout(startCamera, 100);
}

els.startBtn.addEventListener('click', startCamera);
els.stopBtn.addEventListener('click', stopCamera);
els.flipBtn.addEventListener('click', flipCamera);

// --- Scan loop ---
function scanLoop() {
  if (!scanning) return;
  if (els.video.readyState === els.video.HAVE_ENOUGH_DATA) {
    const canvas = els.overlay;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = els.video.videoWidth;
    canvas.height = els.video.videoHeight;
    ctx.drawImage(els.video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code && code.data) {
      handleDecoded(code.data);
      return; // pause scanning until user dismisses
    }
  }
  requestAnimationFrame(scanLoop);
}

// --- Decode flow ---
function handleDecoded(rawPayload) {
  scanning = false;
  els.scanStatus.textContent = 'Decoded. Tap "Start camera" to scan another.';
  els.startBtn.disabled = false;
  els.stopBtn.disabled = true;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  const decoded = window.EMVCO.decodePayload(rawPayload);
  lastDecoded = decoded;
  renderResult(decoded, els.resultBody);
  els.result.classList.remove('hidden');
  saveToHistory(decoded);
  els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

els.closeResult.addEventListener('click', () => {
  els.result.classList.add('hidden');
});

// --- Result rendering ---
function renderResult(decoded, container) {
  container.innerHTML = '';

  // Summary card
  const sum = decoded.summary;
  const summaryHtml = `
    <div class="field"><div><div class="name">Merchant</div><div class="value"><strong>${escape(sum.merchant)}</strong></div></div></div>
    ${sum.scheme ? `<div class="field"><div><div class="name">Payment scheme</div><div class="value">${escape(sum.scheme)}</div></div></div>` : ''}
    ${sum.city || sum.country ? `<div class="field"><div><div class="name">Location</div><div class="value">${escape([sum.city, sum.country].filter(Boolean).join(', '))}</div></div></div>` : ''}
    ${sum.mcc ? `<div class="field"><div><div class="name">MCC</div><div class="value">${escape(sum.mcc)}${sum.mccLabel ? ' — ' + escape(sum.mccLabel) : ''}</div></div></div>` : ''}
    ${sum.currency ? `<div class="field"><div><div class="name">Currency</div><div class="value">${escape(sum.currency)}</div></div></div>` : ''}
    ${sum.amount ? `<div class="field"><div><div class="name">Amount</div><div class="value">${escape(sum.amount)}</div></div></div>` : ''}
    ${sum.initiation ? `<div class="field"><div><div class="name">Type</div><div class="value">${escape(sum.initiation)} QR</div></div></div>` : ''}
    <div class="field">
      <div>
        <div class="name">CRC</div>
        <div class="value">
          ${decoded.crcValid === true ? '<span class="crc-ok">✓ valid</span>' : ''}
          ${decoded.crcValid === false ? '<span class="crc-bad">✗ mismatch</span>' : ''}
          ${decoded.crcValid === null ? '<span class="muted">(no CRC field)</span>' : ''}
        </div>
      </div>
    </div>
  `;
  const summaryDiv = document.createElement('div');
  summaryDiv.innerHTML = `<h3 style="margin: 8px 0 6px; font-size: 14px;">Summary</h3>${summaryHtml}`;
  container.appendChild(summaryDiv);

  // Full TLV tree
  const treeDiv = document.createElement('div');
  treeDiv.innerHTML = '<h3 style="margin: 16px 0 6px; font-size: 14px;">Full TLV tree</h3>';
  treeDiv.appendChild(renderTree(decoded.entries));
  container.appendChild(treeDiv);

  // Raw payload
  const rawDiv = document.createElement('div');
  rawDiv.innerHTML = `
    <h3 style="margin: 16px 0 6px; font-size: 14px;">Raw payload</h3>
    <textarea readonly rows="3">${escape(decoded.raw)}</textarea>
  `;
  container.appendChild(rawDiv);
}

function renderTree(entries) {
  const wrap = document.createElement('div');
  entries.forEach(e => {
    const row = document.createElement('div');
    row.className = 'field';
    const extra = e.extra ? ` <span class="muted">(${escape(e.extra)})</span>` : '';
    const err = e.error ? ` <span class="crc-bad">[${escape(e.error)}]</span>` : '';
    row.innerHTML = `
      <div class="tag">${escape(e.tag)}</div>
      <div>
        <div class="name">${escape(e.name || '')}${err}</div>
        <div class="value">${escape(e.value)}${extra}</div>
      </div>
    `;
    if (e.children?.length) {
      const nested = document.createElement('div');
      nested.className = 'nested';
      nested.appendChild(renderTree(e.children));
      row.appendChild(nested);
    }
    wrap.appendChild(row);
  });
  return wrap;
}

function escape(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- History (localStorage) ---
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveHistory(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  updateHistoryCount();
}

function saveToHistory(decoded) {
  const arr = loadHistory();
  arr.unshift({
    ts: new Date().toISOString(),
    raw: decoded.raw,
    summary: decoded.summary,
    crcValid: decoded.crcValid,
  });
  if (arr.length > 500) arr.length = 500;
  saveHistory(arr);
}

function updateHistoryCount() {
  els.historyCount.textContent = loadHistory().length;
}

function renderHistory() {
  const arr = loadHistory();
  els.historyList.innerHTML = '';
  if (arr.length === 0) {
    els.historyList.innerHTML = '<p class="muted">No scans yet.</p>';
    return;
  }
  arr.forEach((entry, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const ts = new Date(entry.ts).toLocaleString();
    div.innerHTML = `
      <div class="merchant">${escape(entry.summary.merchant)}</div>
      <div class="meta">
        ${entry.summary.scheme ? escape(entry.summary.scheme) + ' · ' : ''}
        ${entry.summary.city ? escape(entry.summary.city) + ' · ' : ''}
        ${entry.summary.mcc ? 'MCC ' + escape(entry.summary.mcc) + ' · ' : ''}
        ${entry.summary.initiation ? escape(entry.summary.initiation) + ' · ' : ''}
        ${ts}
      </div>
    `;
    div.addEventListener('click', () => {
      const decoded = window.EMVCO.decodePayload(entry.raw);
      renderResult(decoded, els.resultBody);
      els.result.classList.remove('hidden');
      els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    els.historyList.appendChild(div);
  });
}

els.clearBtn.addEventListener('click', () => {
  if (confirm('Clear all scan history?')) {
    saveHistory([]);
    renderHistory();
  }
});

els.exportJsonBtn.addEventListener('click', () => {
  const arr = loadHistory();
  downloadFile('emvco-scans.json', 'application/json', JSON.stringify(arr, null, 2));
});

els.exportCsvBtn.addEventListener('click', () => {
  const arr = loadHistory();
  const headers = ['timestamp', 'merchant', 'scheme', 'city', 'country', 'mcc', 'mcc_label', 'currency', 'amount', 'initiation', 'crc_valid', 'raw'];
  const rows = arr.map(e => [
    e.ts,
    e.summary.merchant,
    e.summary.scheme,
    e.summary.city,
    e.summary.country,
    e.summary.mcc,
    e.summary.mccLabel,
    e.summary.currency,
    e.summary.amount,
    e.summary.initiation,
    e.crcValid,
    e.raw,
  ]);
  const csv = [headers, ...rows].map(r =>
    r.map(v => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')
  ).join('\n');
  downloadFile('emvco-scans.csv', 'text/csv', csv);
});

function downloadFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Paste decode ---
els.parsePasteBtn.addEventListener('click', () => {
  const raw = els.pasteInput.value.trim();
  if (!raw) return;
  const decoded = window.EMVCO.decodePayload(raw);
  renderResult(decoded, els.pasteResult);
  saveToHistory(decoded);
});

// --- Init ---
updateHistoryCount();
