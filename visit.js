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
      { id: 'gps', label: 'GPS coordinates', type: 'gps' },
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
      { id: 'qr_scans', label: 'Scanned QRs (one merchant may have multiple)', type: 'qr_scans' },
    ],
  },
  {
    group: 'Acquirer onboarding',
    fields: [
      { id: 'onboarding_method', label: 'How they were onboarded', type: 'radio', options: ['Bank branch visit', 'App self-service', 'Field sales rep visit', 'Online / web form', 'Partner / co-acquired', 'Inherited (took over existing business)', 'Other', 'Unknown'] },
      { id: 'onboarding_who', label: 'Who reached them first (named person/team if known)', type: 'text', placeholder: 'e.g., Maybank Kuantan branch officer; or Boost field rep' },
      { id: 'onboarded_when', label: 'When', type: 'radio', options: ['< 6 months ago', '6–12 months ago', '1–2 years ago', '2–5 years ago', '> 5 years ago', 'Unknown'] },
      { id: 'onboarding_time_to_live', label: 'How long from sign-up to first transaction', type: 'radio', options: ['Same day', '1–3 days', '4–7 days', '1–2 weeks', '> 2 weeks', 'Unknown'] },
      { id: 'onboarding_docs', label: 'Documents required', type: 'checkboxes', options: ['NRIC only', 'Business registration (SSM)', 'Bank account / book', 'Premise photo / video', 'Tax documents', 'Trade licence', 'Halal cert', 'Other'] },
      { id: 'onboarding_pain', label: 'Onboarding pain points (in their words)', type: 'textarea', placeholder: 'e.g., Took 3 weeks to get first payout; had to revisit branch twice' },
      { id: 'considered_switching', label: 'Have they considered switching acquirer?', type: 'radio', options: ['Yes — actively looking', 'Yes — somewhat open', 'No — happy with current', 'No — inertia / too much hassle', 'Unknown'] },
      { id: 'acquirer_multi', label: 'Number of acquirers used', type: 'radio', options: ['Single acquirer only', 'Two acquirers', 'Three or more', 'Unknown'] },
      { id: 'acquirer_field_rep_visits', label: 'Acquirer rep visits since onboarding', type: 'radio', options: ['Regularly (monthly+)', 'Occasionally (few times/year)', 'Once at onboarding only', 'Never since onboarding', 'Unknown'] },
      { id: 'onboarding_cost_to_merchant', label: 'Cost to merchant for onboarding', type: 'radio', options: ['Free', 'One-time fee', 'Equipment rental', 'Other charges', 'Unknown'] },
    ],
  },
  {
    group: 'QR sticker provenance',
    fields: [
      { id: 'qr_source', label: 'Who provided the QR sticker', type: 'radio', options: ['Bank acquirer', 'E-wallet provider', 'Third-party printer / agent', 'Self-generated from app', 'Came with POS terminal', 'Inherited from previous owner', 'Got from another merchant / friend', 'Other', 'Unknown'] },
      { id: 'qr_source_named', label: 'Specific entity (bank / wallet / person name)', type: 'text', placeholder: 'e.g., Maybank field rep, TNG sales agent, neighbour' },
      { id: 'qr_received_how', label: 'How they received it', type: 'radio', options: ['Hand-delivered by rep on site', 'Picked up from branch', 'Mailed / posted', 'WhatsApp / message link', 'Printed from app themselves', 'Other', 'Unknown'] },
      { id: 'qr_received_when', label: 'When they received it', type: 'radio', options: ['At business opening', 'Within 1 month of opening', '> 1 month after opening', '< 6 months ago (recent)', 'Unknown'] },
      { id: 'qr_cost', label: 'Cost for the QR', type: 'radio', options: ['Free', 'One-time fee', 'Bundled with bank/wallet account', 'Equipment rental', 'Other charges', 'Unknown'] },
      { id: 'qr_display', label: 'How displayed', type: 'checkboxes', options: ['Sticker on counter', 'Sticker on wall', 'Table tent / standing card', 'Framed / hung', 'On POS screen', 'On phone / tablet screen', 'Multiple locations in shop', 'Other'] },
      { id: 'qr_branding', label: 'Branding visible on the QR', type: 'checkboxes', options: ['DuitNow logo', 'Bank logo (Maybank / PBB / CIMB etc.)', 'Wallet brand logo (TNG / Boost / GrabPay / SPay)', 'No branding / plain', 'Custom merchant design', 'Other'] },
      { id: 'qr_replacement_count', label: 'Has the QR ever been replaced?', type: 'radio', options: ['Original (never replaced)', 'Once', 'Multiple times', 'Unknown'] },
      { id: 'qr_unusual_offers', label: 'Any unusual offers? (someone offering free QR for a fee, sharing QRs, etc.)', type: 'textarea', placeholder: 'Note any cashout-risk-flavoured stories the merchant volunteers' },
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
    // Persist stub immediately so even a refresh keeps the record
    const all = loadVisits();
    all.unshift(visit);
    saveVisits(all);
  }

  elsV.list.innerHTML = '';
  elsV.form.classList.remove('hidden');
  elsV.form.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'visit-form-header';
  header.innerHTML = `
    <h2 style="margin: 0; font-size: 16px;">${isNew ? 'New visit' : 'Edit visit'}</h2>
    <div class="visit-form-header-actions">
      <span id="autosaveIndicator" class="autosave-indicator">Saved</span>
      <button id="deleteVisitBtn" class="danger">Delete</button>
      <button id="doneVisitBtn" class="primary">Back to list</button>
    </div>
  `;
  elsV.form.appendChild(header);

  VISIT_SCHEMA.forEach((group, gi) => {
    const sec = document.createElement('div');
    sec.className = 'visit-group';
    // First group expanded by default; others collapsed
    if (gi > 0) sec.classList.add('collapsed');
    sec.dataset.groupIdx = gi;

    const header = document.createElement('h3');
    header.className = 'visit-group-header';
    header.innerHTML = `
      <span class="visit-group-chevron">▾</span>
      <span class="visit-group-title">${escapeV(group.group)}</span>
      <span class="visit-group-count" data-group-count="${gi}"></span>
    `;
    header.addEventListener('click', () => {
      sec.classList.toggle('collapsed');
    });
    sec.appendChild(header);

    const body = document.createElement('div');
    body.className = 'visit-group-body';
    group.fields.forEach(f => body.appendChild(renderField(f, visit.data)));
    sec.appendChild(body);

    elsV.form.appendChild(sec);
  });

  updateGroupCounts(visit.data);

  elsV.form.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Auto-save: any change to any field persists immediately.
  const indicator = document.getElementById('autosaveIndicator');
  let saveTimer = null;
  function autoSave() {
    visit.data = collectFormData();
    const all = loadVisits();
    const idx = all.findIndex(v => v.id === visit.id);
    if (idx >= 0) all[idx] = visit;
    else all.unshift(visit);
    saveVisits(all);
    updateGroupCounts(visit.data);
    if (indicator) {
      indicator.textContent = 'Saved ✓';
      indicator.classList.add('autosave-flash');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => indicator.classList.remove('autosave-flash'), 700);
    }
  }
  // Listen to all input and change events bubbling within the form
  elsV.form.addEventListener('input', autoSave);
  elsV.form.addEventListener('change', autoSave);

  document.getElementById('doneVisitBtn').addEventListener('click', () => {
    autoSave(); // belt-and-braces final save
    renderVisitList();
  });
  document.getElementById('deleteVisitBtn').addEventListener('click', () => {
    if (confirm('Delete this visit? This cannot be undone.')) {
      const all = loadVisits().filter(v => v.id !== visit.id);
      saveVisits(all);
      renderVisitList();
    }
  });
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
    if (f.options.includes('Other')) {
      input.appendChild(buildOtherInput(f, data, () => {
        const checked = document.querySelector(`input[name="${f.id}"]:checked`);
        return checked && checked.value === 'Other';
      }));
    }
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
    if (f.options.includes('Other')) {
      input.appendChild(buildOtherInput(f, data, () => {
        return !!document.querySelector(`input[name="${f.id}[]"][value="Other"]:checked`);
      }));
    }
  } else if (f.type === 'gps') {
    input = renderGpsField(f, data);
  } else if (f.type === 'qr_scans') {
    input = renderQrScansField(f, data);
  }
  wrap.appendChild(input);
  return wrap;
}

// Check whether a field has been filled in by the user
function isFieldFilled(field, value) {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

// Refresh the "(X/Y)" count displayed on each group header
function updateGroupCounts(data) {
  VISIT_SCHEMA.forEach((group, gi) => {
    const filled = group.fields.filter(f => isFieldFilled(f, data[f.id])).length;
    const total = group.fields.length;
    const el = document.querySelector(`[data-group-count="${gi}"]`);
    if (el) {
      el.textContent = `${filled}/${total}`;
      el.classList.toggle('visit-group-count-complete', filled === total);
      el.classList.toggle('visit-group-count-partial', filled > 0 && filled < total);
    }
  });
}

// Build the "Other: please specify" input that appears when "Other" is selected/checked.
// `isVisibleFn` is a function called on every relevant change to decide visibility.
function buildOtherInput(f, data, isVisibleFn) {
  const wrap = document.createElement('div');
  wrap.className = 'other-input-wrap';
  const otherId = 'f_' + f.id + '_other';
  const existing = data[f.id + '_other'] || '';
  wrap.innerHTML = `
    <label for="${otherId}" class="other-input-label">Please specify:</label>
    <input type="text" id="${otherId}" placeholder="Enter detail here…" value="${existing.replace(/"/g, '&quot;')}" />
  `;
  // Hidden by default; check after attach
  setTimeout(() => updateVisibility(), 0);
  // Update visibility on any change in the parent option grid
  const parentGrid = wrap.parentNode;
  function updateVisibility() {
    if (isVisibleFn()) {
      wrap.classList.add('other-visible');
    } else {
      wrap.classList.remove('other-visible');
    }
  }
  // Use document-level event listener since the parent reference isn't stable at build time
  setTimeout(() => {
    const grid = wrap.parentElement;
    if (grid) {
      grid.addEventListener('change', updateVisibility);
      updateVisibility();
    }
  }, 0);
  return wrap;
}

// --- GPS field ---
function renderGpsField(f, data) {
  const wrap = document.createElement('div');
  wrap.className = 'gps-field';
  const current = data[f.id] && typeof data[f.id] === 'object' ? data[f.id] : null;

  const display = document.createElement('div');
  display.className = 'gps-display';
  display.id = 'gps-display-' + f.id;
  display.innerHTML = current ? gpsLine(current) : '<span class="muted">No GPS captured yet</span>';

  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.id = 'f_' + f.id;
  hidden.value = current ? JSON.stringify(current) : '';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'secondary';
  btn.textContent = '📍 Capture GPS';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Locating…';
    try {
      const pos = await getGps();
      const obj = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
        ts: new Date().toISOString(),
      };
      hidden.value = JSON.stringify(obj);
      display.innerHTML = gpsLine(obj);
    } catch (err) {
      display.innerHTML = '<span class="crc-bad">GPS error: ' + escapeV(err.message) + '</span>';
    } finally {
      btn.disabled = false;
      btn.textContent = '📍 Re-capture';
    }
  });

  wrap.appendChild(display);
  wrap.appendChild(btn);
  wrap.appendChild(hidden);
  return wrap;
}

function getGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, err => reject(new Error(err.message)), {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function gpsLine(g) {
  const mapUrl = `https://www.google.com/maps?q=${g.lat},${g.lng}`;
  return `<strong>${g.lat.toFixed(6)}, ${g.lng.toFixed(6)}</strong>
    <span class="muted">(±${g.accuracy}m)</span>
    <a href="${mapUrl}" target="_blank" rel="noopener" style="margin-left:8px;">Open in Maps ↗</a>`;
}

// --- QR scans field (inline camera, multi-scan) ---
function renderQrScansField(f, data) {
  const wrap = document.createElement('div');
  wrap.className = 'qrscans-field';
  const existing = Array.isArray(data[f.id]) ? data[f.id].slice() : [];

  const list = document.createElement('div');
  list.className = 'qrscans-list';
  list.id = 'qrscans-list-' + f.id;

  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.id = 'f_' + f.id;
  hidden.value = JSON.stringify(existing);

  function syncList() {
    const arr = JSON.parse(hidden.value || '[]');
    list.innerHTML = '';
    if (arr.length === 0) {
      list.innerHTML = '<p class="muted" style="font-size:12px;margin:4px 0;">No QRs scanned for this visit yet.</p>';
      return;
    }
    arr.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'qrscan-row qrscan-row-clickable';
      row.dataset.idx = i;
      const ts = new Date(s.ts).toLocaleTimeString();
      row.innerHTML = `
        <div class="qrscan-row-body">
          <div class="qrscan-merchant">${escapeV(s.summary?.merchant || '(no name)')}</div>
          <div class="qrscan-meta">
            ${escapeV(s.summary?.acquirer || '—')} ·
            ${escapeV(s.summary?.scheme || '')} ·
            ${escapeV(s.summary?.mcc || '')}${s.summary?.mccLabel ? ' (' + escapeV(s.summary.mccLabel) + ')' : ''} ·
            ${ts}
          </div>
        </div>
        <button class="icon-btn qrscan-remove" data-idx="${i}" aria-label="Remove">&times;</button>
      `;
      list.appendChild(row);
    });
    list.querySelectorAll('.qrscan-row-clickable').forEach(row => {
      row.addEventListener('click', e => {
        // Ignore clicks on the remove button
        if (e.target.closest('.qrscan-remove')) return;
        const idx = parseInt(row.dataset.idx, 10);
        const arr2 = JSON.parse(hidden.value || '[]');
        const scan = arr2[idx];
        if (scan && typeof window.showDecodedResult === 'function') {
          window.showDecodedResult(scan.raw);
        }
      });
    });
    list.querySelectorAll('.qrscan-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const arr2 = JSON.parse(hidden.value || '[]');
        arr2.splice(parseInt(btn.dataset.idx, 10), 1);
        hidden.value = JSON.stringify(arr2);
        syncList();
      });
    });
  }

  // Inline camera area
  const cam = document.createElement('div');
  cam.className = 'qrscans-camera hidden';
  cam.innerHTML = `
    <div class="qrscans-cam-wrap">
      <video playsinline></video>
      <canvas></canvas>
      <div class="qrscans-cam-overlay">
        <div class="qrscans-cam-ind"></div>
      </div>
    </div>
    <div class="qrscans-cam-status muted">Aim at a QR, tap Capture.</div>
    <div class="qrscans-cam-controls">
      <button type="button" class="primary" data-act="capture">📸 Capture</button>
      <label class="qrscans-auto-toggle">
        <input type="checkbox" data-act="auto" />
        <span>Auto-scan</span>
      </label>
      <button type="button" class="secondary" data-act="stop">Done</button>
    </div>
  `;

  const scanBtn = document.createElement('button');
  scanBtn.type = 'button';
  scanBtn.className = 'secondary';
  scanBtn.textContent = '📷 Scan QR';

  let stream = null;
  let videoRunning = false;
  let autoMode = false;
  let lastAutoAt = 0;
  let lastDetectedCode = null; // updated each frame in auto mode; used by Capture button for snappier tap

  function startInlineScan() {
    cam.classList.remove('hidden');
    scanBtn.disabled = true;
    const video = cam.querySelector('video');
    const canvas = cam.querySelector('canvas');
    const statusEl = cam.querySelector('.qrscans-cam-status');
    const indicator = cam.querySelector('.qrscans-cam-ind');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(s => {
        stream = s;
        video.srcObject = s;
        return video.play();
      })
      .then(() => {
        videoRunning = true;
        statusEl.textContent = autoMode ? 'Auto-scan on — pointing detects each QR.' : 'Aim at a QR, tap Capture.';
        loop();
      })
      .catch(err => {
        statusEl.textContent = 'Camera error: ' + err.message;
        scanBtn.disabled = false;
      });

    function loop() {
      if (!videoRunning) return;
      let code = null;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data) {
          lastDetectedCode = code.data;
          indicator.classList.add('detected');
        } else {
          lastDetectedCode = null;
          indicator.classList.remove('detected');
        }
        if (autoMode && code && code.data) {
          const now = Date.now();
          if (now - lastAutoAt > 2000) {
            lastAutoAt = now;
            saveScan(code.data, statusEl);
          }
        }
      }
      requestAnimationFrame(loop);
    }
  }

  function saveScan(rawPayload, statusEl) {
    const decoded = window.EMVCO.decodePayload(rawPayload);
    const arr = JSON.parse(hidden.value || '[]');
    if (arr.some(s => s.raw === decoded.raw)) {
      if (statusEl) statusEl.textContent = `Already captured: ${decoded.summary.merchant || '(no name)'}`;
      return false;
    }
    arr.unshift({
      ts: new Date().toISOString(),
      raw: decoded.raw,
      summary: decoded.summary,
      crcValid: decoded.crcValid,
    });
    hidden.value = JSON.stringify(arr);
    syncList();
    if (statusEl) statusEl.textContent = `✓ Captured: ${decoded.summary.merchant || '(no name)'}`;
    if (typeof window.appendScanToHistory === 'function') {
      window.appendScanToHistory(decoded);
    }
    if (navigator.vibrate) navigator.vibrate(60);
    return true;
  }

  function stopInlineScan() {
    videoRunning = false;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    cam.classList.add('hidden');
    scanBtn.disabled = false;
  }

  scanBtn.addEventListener('click', startInlineScan);
  cam.querySelector('[data-act="stop"]').addEventListener('click', stopInlineScan);
  cam.querySelector('[data-act="capture"]').addEventListener('click', () => {
    const statusEl = cam.querySelector('.qrscans-cam-status');
    const video = cam.querySelector('video');
    const canvas = cam.querySelector('canvas');
    // Use the most recently-detected code if available; otherwise grab a fresh frame
    let payload = lastDetectedCode;
    if (!payload && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      if (code && code.data) payload = code.data;
    }
    if (payload) {
      saveScan(payload, statusEl);
    } else {
      statusEl.textContent = 'No QR detected — aim more squarely / closer and try again.';
    }
  });
  cam.querySelector('[data-act="auto"]').addEventListener('change', e => {
    autoMode = e.target.checked;
    const statusEl = cam.querySelector('.qrscans-cam-status');
    statusEl.textContent = autoMode
      ? 'Auto-scan on — pointing detects each QR.'
      : 'Aim at a QR, tap Capture.';
  });

  // Stop camera when form is left
  window.addEventListener('beforeunload', stopInlineScan);

  wrap.appendChild(list);
  wrap.appendChild(scanBtn);
  wrap.appendChild(cam);
  wrap.appendChild(hidden);
  syncList();
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
      } else if (f.type === 'gps' || f.type === 'qr_scans') {
        const el = document.getElementById('f_' + f.id);
        if (el && el.value) {
          try { data[f.id] = JSON.parse(el.value); } catch {}
        }
      }
      // Capture "Other: please specify" text for radio + checkbox fields
      if ((f.type === 'radio' || f.type === 'checkboxes') && f.options?.includes('Other')) {
        const otherEl = document.getElementById('f_' + f.id + '_other');
        if (otherEl && otherEl.value.trim()) {
          data[f.id + '_other'] = otherEl.value.trim();
        }
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
  // Build column list. Expand 'gps' into gps_lat/lng/accuracy/ts; expand 'qr_scans' into a single
  // semicolon-joined string with merchant|acquirer|scheme|mcc|raw per scan.
  const headers = ['id', 'timestamp'];
  const fields = [];
  VISIT_SCHEMA.forEach(g => g.fields.forEach(f => {
    if (f.type === 'gps') {
      headers.push('gps_lat', 'gps_lng', 'gps_accuracy_m', 'gps_ts');
      fields.push({ id: f.id, kind: 'gps' });
    } else if (f.type === 'qr_scans') {
      headers.push('qr_scans_count', 'qr_scans_detail');
      fields.push({ id: f.id, kind: 'qr_scans' });
    } else {
      headers.push(f.id);
      fields.push({ id: f.id, kind: 'plain' });
    }
  }));

  const rows = arr.map(v => {
    const row = [v.id, v.ts];
    fields.forEach(f => {
      const val = v.data[f.id];
      if (f.kind === 'gps') {
        if (val && typeof val === 'object') {
          row.push(val.lat ?? '', val.lng ?? '', val.accuracy ?? '', val.ts ?? '');
        } else {
          row.push('', '', '', '');
        }
      } else if (f.kind === 'qr_scans') {
        if (Array.isArray(val)) {
          row.push(val.length);
          row.push(val.map(s => [
            s.summary?.merchant || '',
            s.summary?.acquirer || '',
            s.summary?.scheme || '',
            s.summary?.mcc || '',
            s.raw || '',
          ].join('|')).join(';;'));
        } else {
          row.push(0, '');
        }
      } else {
        if (val === undefined || val === null) row.push('');
        else if (Array.isArray(val)) row.push(val.join('; '));
        else row.push(val);
      }
    });
    return row;
  });

  const csv = [headers, ...rows].map(r =>
    r.map(c => {
      const s = c == null ? '' : String(c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
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
