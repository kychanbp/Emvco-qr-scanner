// Merchant visit capture — pairs with the EMVCo scanner for field use.
// Schema mirrors the interview guide + cashout signals checklist.

const VISIT_STORAGE_KEY = 'emvco_visits_v1';

// Form schema: groups of fields. Each field has type and options.
const VISIT_SCHEMA = [
  {
    group: 'Basic info',
    fields: [
      { id: 'merchant', label: 'Merchant name', type: 'text', placeholder: 'e.g., Legato Music Enterprise' },
      { id: 'location', label: 'Location / address', type: 'text', placeholder: 'e.g., East Coast Mall G-12, Kuantan' },
      { id: 'type', label: 'Merchant type', type: 'radio', options: ['F&B', 'Retail', 'Services', 'Tourism', 'Mobile/electronics', 'Gold/jewellery', 'Other'] },
      { id: 'size', label: 'Size', type: 'radio', options: ['Single-op', 'SME (2–10 staff)', 'Chain'] },
      { id: 'years_op', label: 'Years in operation', type: 'text', placeholder: 'e.g., 3 years' },
    ],
  },
  {
    group: 'Payment mix',
    fields: [
      { id: 'pct_cash', label: 'Cash %', type: 'number', min: 0, max: 100 },
      { id: 'pct_qr', label: 'QR %', type: 'number', min: 0, max: 100 },
      { id: 'pct_card', label: 'Card %', type: 'number', min: 0, max: 100 },
      { id: 'acquirer', label: 'Acquirer (from QR scan or self-reported)', type: 'text', placeholder: 'e.g., Public Bank Berhad' },
      { id: 'wallets_accepted', label: 'E-wallets accepted', type: 'checkboxes', options: ['DuitNow QR', 'TNG eWallet', 'Boost', 'GrabPay', 'ShopeePay', 'MAE', 'BigPay', 'Other'] },
      { id: 'avg_ticket', label: 'Average ticket size (rough)', type: 'radio', options: ['< MYR 50', 'MYR 50–200', 'MYR 200–500', 'MYR 500–2000', '> MYR 2000'] },
      { id: 'qr_scan_refs', label: 'Linked QR scan refs (timestamps or merchant IDs)', type: 'textarea', placeholder: 'Optional — paste scan timestamps or notes' },
    ],
  },
  {
    group: 'Pain points',
    fields: [
      { id: 'pain_settlement', label: 'Settlement timing issues?', type: 'radio', options: ['Yes', 'No', 'Unknown'] },
      { id: 'pain_failed_txn', label: 'Failed transaction / dispute pain?', type: 'radio', options: ['Yes', 'No', 'Unknown'] },
      { id: 'pain_other', label: 'Top 3 pain points (in their words)', type: 'textarea', placeholder: '1.\n2.\n3.' },
    ],
  },
  {
    group: 'Credit & financing',
    fields: [
      { id: 'inventory_funding', label: 'How they fund inventory', type: 'radio', options: ['Cash only', 'Supplier credit', 'Bank loan', 'Koperasi / Bank Rakyat', 'Personal funds', 'Aeon Credit / other BNPL', 'Other'] },
      { id: 'last_credit_need', label: 'Last time they needed extra cashflow (their words)', type: 'text', placeholder: 'e.g., Last month for Hari Raya stock' },
      { id: 'customer_asks_installments', label: 'Customers ask for installments?', type: 'radio', options: ['Often', 'Sometimes', 'Rarely', 'Never'] },
      { id: 'bnpl_awareness', label: 'BNPLs they\'re aware of', type: 'checkboxes', options: ['SPayLater', 'Atome', 'GrabPay PayLater', 'Aeon Credit', 'Maybank Ezy', 'PayLater by Bank Islam', 'None'] },
      { id: 'bnpl_integrated', label: 'Already integrated with', type: 'checkboxes', options: ['SPayLater', 'Atome', 'GrabPay PayLater', 'Aeon Credit', 'Other', 'None'] },
      { id: 'spl_interest', label: 'SPayLater interest level', type: 'radio', options: ['High — wants to integrate', 'Medium — wants more info', 'Low — not interested', 'Already integrated'] },
    ],
  },
  {
    group: 'Cashout signals (visual + soft diagnostic)',
    fields: [
      { id: 'visual_flags', label: 'Visual red flags observed', type: 'checkboxes', options: [
        'Inventory does not match claimed sales volume',
        'Single operator handling very high tickets',
        'BNPL stickers prominent, other payments hidden',
        'Customers in/out fast with no bags',
        'Customers walked in with phone open, no browsing',
        'Located in low-foot-traffic area',
        'Cash-counting machine visible',
        'Stack of identical / pre-printed receipts',
        'Multiple POS terminals / multiple acquirer stickers',
        'Merchant volunteered "flexible" arrangements',
      ] },
      { id: 'soft_diagnostic_response', label: 'Response to "have customers tried to use BNPL for cash?"', type: 'radio', options: [
        'Confused — does not understand the question',
        'Knowing nod, declines doing it',
        'Knowing nod, evasive about own practice',
        'Self-disclosed they help customers',
        'Defensive / changed subject',
        'Did not ask',
      ] },
      { id: 'cashout_risk_assessment', label: 'Your gut risk assessment', type: 'radio', options: ['Low', 'Medium', 'High', 'Suspected ring participant'] },
      { id: 'cashout_notes', label: 'Specific cashout-related observations', type: 'textarea', placeholder: 'e.g., Inventory display shows 3 phones but transaction logs claim 50/month' },
    ],
  },
  {
    group: 'Outcome & follow-up',
    fields: [
      { id: 'lighthouse_potential', label: 'SPL lighthouse potential', type: 'radio', options: ['High', 'Medium', 'Low', 'Already integrated', 'Block / do not onboard'] },
      { id: 'next_step', label: 'Next step', type: 'radio', options: ['Send info', 'Schedule call', 'Refer to local rep', 'Risk review needed', 'No follow-up'] },
      { id: 'contact_name', label: 'Contact name', type: 'text', placeholder: 'Optional' },
      { id: 'contact_phone', label: 'Contact phone / WhatsApp', type: 'text', placeholder: 'Optional' },
      { id: 'observation', label: 'Surprise / outlier observation', type: 'textarea', placeholder: 'One thing you did not expect' },
    ],
  },
];

const elsV = {
  newBtn: null, list: null, form: null, count: null,
  exportJson: null, exportCsv: null, clear: null,
};

function initVisit() {
  elsV.newBtn = document.getElementById('newVisitBtn');
  elsV.list = document.getElementById('visitList');
  elsV.form = document.getElementById('visitForm');
  elsV.count = document.getElementById('visitCount');
  elsV.exportJson = document.getElementById('exportVisitsJsonBtn');
  elsV.exportCsv = document.getElementById('exportVisitsCsvBtn');
  elsV.clear = document.getElementById('clearVisitsBtn');

  elsV.newBtn.addEventListener('click', () => openForm(null));
  elsV.exportJson.addEventListener('click', exportVisitsJson);
  elsV.exportCsv.addEventListener('click', exportVisitsCsv);
  elsV.clear.addEventListener('click', () => {
    if (confirm('Clear all visit records?')) {
      saveVisits([]);
      renderVisitList();
    }
  });

  renderVisitList();
}

function loadVisits() {
  try { return JSON.parse(localStorage.getItem(VISIT_STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveVisits(arr) {
  localStorage.setItem(VISIT_STORAGE_KEY, JSON.stringify(arr));
  updateVisitCount();
}

function updateVisitCount() {
  if (elsV.count) elsV.count.textContent = loadVisits().length;
}

function renderVisitList() {
  const arr = loadVisits();
  updateVisitCount();
  elsV.form.classList.add('hidden');
  elsV.list.innerHTML = '';
  if (arr.length === 0) {
    elsV.list.innerHTML = '<p class="muted">No visits captured yet. Tap "+ New visit" to start.</p>';
    return;
  }
  arr.forEach(v => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const ts = new Date(v.ts).toLocaleString();
    const merchant = v.data.merchant || '(unnamed merchant)';
    const location = v.data.location || '';
    const risk = v.data.cashout_risk_assessment || '';
    const lighthouse = v.data.lighthouse_potential || '';
    const riskClass = risk === 'High' || risk === 'Suspected ring participant' ? 'crc-bad' : (risk === 'Medium' ? '' : 'crc-ok');
    item.innerHTML = `
      <div class="merchant">${escapeV(merchant)}</div>
      <div class="meta">
        ${location ? escapeV(location) + ' · ' : ''}
        ${v.data.type ? escapeV(v.data.type) + ' · ' : ''}
        ${risk ? '<span class="' + riskClass + '">risk: ' + escapeV(risk) + '</span> · ' : ''}
        ${lighthouse ? 'fit: ' + escapeV(lighthouse) + ' · ' : ''}
        ${ts}
      </div>
    `;
    item.addEventListener('click', () => openForm(v.id));
    elsV.list.appendChild(item);
  });
}

function openForm(visitId) {
  const arr = loadVisits();
  let visit = visitId ? arr.find(v => v.id === visitId) : null;
  const isNew = !visit;
  if (isNew) {
    visit = { id: 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), ts: new Date().toISOString(), data: {} };
  }

  elsV.list.innerHTML = '';
  elsV.form.classList.remove('hidden');
  elsV.form.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'visit-form-header';
  header.innerHTML = `
    <h2 style="margin: 0; font-size: 16px;">${isNew ? 'New visit' : 'Edit visit'}</h2>
    <div>
      <button id="cancelVisitBtn" class="secondary">Cancel</button>
      ${!isNew ? '<button id="deleteVisitBtn" class="danger">Delete</button>' : ''}
      <button id="saveVisitBtn" class="primary">Save</button>
    </div>
  `;
  elsV.form.appendChild(header);

  VISIT_SCHEMA.forEach(group => {
    const sec = document.createElement('div');
    sec.className = 'visit-group';
    sec.innerHTML = `<h3>${escapeV(group.group)}</h3>`;
    group.fields.forEach(f => sec.appendChild(renderField(f, visit.data)));
    elsV.form.appendChild(sec);
  });

  elsV.form.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('cancelVisitBtn').addEventListener('click', renderVisitList);
  document.getElementById('saveVisitBtn').addEventListener('click', () => {
    visit.data = collectFormData();
    const all = loadVisits();
    const idx = all.findIndex(v => v.id === visit.id);
    if (idx >= 0) all[idx] = visit;
    else all.unshift(visit);
    saveVisits(all);
    renderVisitList();
  });
  if (!isNew) {
    document.getElementById('deleteVisitBtn').addEventListener('click', () => {
      if (confirm('Delete this visit?')) {
        const all = loadVisits().filter(v => v.id !== visit.id);
        saveVisits(all);
        renderVisitList();
      }
    });
  }
}

function renderField(f, data) {
  const wrap = document.createElement('div');
  wrap.className = 'visit-field';
  const label = document.createElement('label');
  label.textContent = f.label;
  label.htmlFor = 'f_' + f.id;
  wrap.appendChild(label);

  let input;
  if (f.type === 'text') {
    input = document.createElement('input');
    input.type = 'text';
    input.id = 'f_' + f.id;
    input.name = f.id;
    if (f.placeholder) input.placeholder = f.placeholder;
    if (data[f.id] !== undefined) input.value = data[f.id];
  } else if (f.type === 'number') {
    input = document.createElement('input');
    input.type = 'number';
    input.id = 'f_' + f.id;
    input.name = f.id;
    if (f.min !== undefined) input.min = f.min;
    if (f.max !== undefined) input.max = f.max;
    input.inputMode = 'numeric';
    if (data[f.id] !== undefined) input.value = data[f.id];
  } else if (f.type === 'textarea') {
    input = document.createElement('textarea');
    input.id = 'f_' + f.id;
    input.name = f.id;
    input.rows = 3;
    if (f.placeholder) input.placeholder = f.placeholder;
    if (data[f.id] !== undefined) input.value = data[f.id];
  } else if (f.type === 'radio') {
    input = document.createElement('div');
    input.className = 'option-grid';
    f.options.forEach((opt, i) => {
      const oid = 'f_' + f.id + '_' + i;
      const optWrap = document.createElement('label');
      optWrap.className = 'option';
      const oin = document.createElement('input');
      oin.type = 'radio';
      oin.name = f.id;
      oin.value = opt;
      oin.id = oid;
      if (data[f.id] === opt) oin.checked = true;
      optWrap.appendChild(oin);
      optWrap.appendChild(document.createTextNode(opt));
      input.appendChild(optWrap);
    });
  } else if (f.type === 'checkboxes') {
    input = document.createElement('div');
    input.className = 'option-grid';
    const existing = Array.isArray(data[f.id]) ? data[f.id] : [];
    f.options.forEach((opt, i) => {
      const oid = 'f_' + f.id + '_' + i;
      const optWrap = document.createElement('label');
      optWrap.className = 'option';
      const oin = document.createElement('input');
      oin.type = 'checkbox';
      oin.name = f.id + '[]';
      oin.value = opt;
      oin.id = oid;
      if (existing.includes(opt)) oin.checked = true;
      optWrap.appendChild(oin);
      optWrap.appendChild(document.createTextNode(opt));
      input.appendChild(optWrap);
    });
  }
  wrap.appendChild(input);
  return wrap;
}

function collectFormData() {
  const data = {};
  VISIT_SCHEMA.forEach(group => {
    group.fields.forEach(f => {
      if (f.type === 'text' || f.type === 'textarea' || f.type === 'number') {
        const el = document.getElementById('f_' + f.id);
        if (el && el.value !== '') data[f.id] = f.type === 'number' ? Number(el.value) : el.value;
      } else if (f.type === 'radio') {
        const checked = document.querySelector(`input[name="${f.id}"]:checked`);
        if (checked) data[f.id] = checked.value;
      } else if (f.type === 'checkboxes') {
        const checked = Array.from(document.querySelectorAll(`input[name="${f.id}[]"]:checked`));
        if (checked.length) data[f.id] = checked.map(c => c.value);
      }
    });
  });
  return data;
}

function exportVisitsJson() {
  const arr = loadVisits();
  downloadFileV('merchant-visits.json', 'application/json', JSON.stringify(arr, null, 2));
}

function exportVisitsCsv() {
  const arr = loadVisits();
  const fieldIds = VISIT_SCHEMA.flatMap(g => g.fields.map(f => f.id));
  const headers = ['id', 'timestamp', ...fieldIds];
  const rows = arr.map(v => {
    const base = [v.id, v.ts];
    const fields = fieldIds.map(fid => {
      const val = v.data[fid];
      if (val === undefined) return '';
      if (Array.isArray(val)) return val.join('; ');
      return val;
    });
    return [...base, ...fields];
  });
  const csv = [headers, ...rows].map(r =>
    r.map(c => {
      const s = c == null ? '' : String(c);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')
  ).join('\n');
  downloadFileV('merchant-visits.csv', 'text/csv', csv);
}

function downloadFileV(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeV(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Hook into tab switch — wait for DOM
window.addEventListener('DOMContentLoaded', initVisit);

// Also expose count update so app.js's tab switching can refresh us
window.refreshVisitList = renderVisitList;
