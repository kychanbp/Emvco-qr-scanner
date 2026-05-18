// EMVCo MPM (Merchant-Presented Mode) TLV Parser
// Based on EMV QR Code Specification for Payment Systems v1.0+
// All parsing local; no external calls.

const EMVCO_TAGS = {
  '00': { name: 'Payload Format Indicator', desc: '"01" for EMV QRCPS-MPM' },
  '01': { name: 'Point of Initiation Method', desc: '11=static, 12=dynamic' },
  '52': { name: 'Merchant Category Code (MCC)', desc: 'ISO 18245' },
  '53': { name: 'Transaction Currency', desc: 'ISO 4217 numeric (3-digit)' },
  '54': { name: 'Transaction Amount', desc: 'Only present on dynamic QRs' },
  '55': { name: 'Tip or Convenience Indicator', desc: '01/02/03' },
  '56': { name: 'Value of Convenience Fee Fixed', desc: '' },
  '57': { name: 'Value of Convenience Fee Percentage', desc: '' },
  '58': { name: 'Country Code', desc: 'ISO 3166-1 alpha-2' },
  '59': { name: 'Merchant Name', desc: '' },
  '60': { name: 'Merchant City', desc: '' },
  '61': { name: 'Postal Code', desc: '' },
  '62': { name: 'Additional Data Field Template', desc: 'Nested TLV', nested: true },
  '63': { name: 'CRC', desc: 'CRC-16/CCITT-FALSE' },
  '64': { name: 'Merchant Info — Language Template', desc: 'Nested', nested: true },
};

// Tags 02-51: Merchant Account Information (network-specific, nested)
for (let i = 2; i <= 51; i++) {
  const t = i.toString().padStart(2, '0');
  EMVCO_TAGS[t] = { name: `Merchant Account Information ${t}`, desc: 'Network-specific, nested', nested: true };
}
// Tags 65-79: Reserved EMVCo
for (let i = 65; i <= 79; i++) {
  const t = i.toString();
  EMVCO_TAGS[t] = { name: `RFU EMVCo ${t}`, desc: 'Reserved for future use' };
}
// Tags 80-99: Unreserved (custom/network)
for (let i = 80; i <= 99; i++) {
  const t = i.toString();
  EMVCO_TAGS[t] = { name: `Unreserved Template ${t}`, desc: 'Network-specific, often nested', nested: true };
}

// Sub-tags within Additional Data Field Template (tag 62)
const ADDITIONAL_DATA_TAGS = {
  '01': 'Bill Number',
  '02': 'Mobile Number',
  '03': 'Store Label',
  '04': 'Loyalty Number',
  '05': 'Reference Label',
  '06': 'Customer Label',
  '07': 'Terminal Label',
  '08': 'Purpose of Transaction',
  '09': 'Additional Consumer Data Request',
  '10': 'Merchant Tax ID',
  '11': 'Merchant Channel',
};

// Sub-tags within Merchant Account Info (tags 02-51) — generic pattern
const MERCHANT_ACCOUNT_TAGS = {
  '00': 'Globally Unique Identifier (GUID / AID)',
  '01': 'Network-specific (acquirer / participant ID)',
  '02': 'Network-specific (merchant account / sub-merchant)',
  '03': 'Network-specific',
  '04': 'Network-specific',
  '05': 'Network-specific',
};

// Known scheme GUIDs (helps annotate which payment rail the QR belongs to)
const SCHEME_GUIDS = {
  'SG.PAYNOW': 'PayNow (Singapore)',
  'SG.COM.NETS': 'NETS (Singapore)',
  'MY.PAYNET.DUITNOW': 'DuitNow (Malaysia)',
  'MY.COM.MYDUITNOWTNGD': 'DuitNow (TNG)',
  'ID.CO.QRIS.WWW': 'QRIS (Indonesia)',
  'A000000677010111': 'PromptPay (Thailand)',
  'A000000727': 'VietQR (Vietnam)',
  'COM.GRAB': 'Grab',
  'HK.COM.HKICL': 'FPS (Hong Kong)',
  'COM.QR.WORLDPAY': 'Worldpay',
  'COM.STRIPE': 'Stripe',
};

const MCC_LOOKUP = {
  '5411': 'Grocery / Supermarket',
  '5499': 'Misc food / convenience',
  '5812': 'Eating places / Restaurants',
  '5813': 'Bars / Lounges',
  '5814': 'Fast food restaurants',
  '5912': 'Pharmacies',
  '5921': 'Liquor stores',
  '5942': 'Bookstores',
  '5999': 'Misc retail',
  '4111': 'Transportation — Local commuter',
  '4121': 'Taxi / Limousine',
  '4131': 'Bus lines',
  '4789': 'Transport services NEC',
  '5499': 'Misc food stores',
  '5331': 'Variety stores',
  '5311': 'Department stores',
  '7011': 'Hotels / Lodging',
  '7299': 'Misc personal services',
  '8011': 'Doctors',
  '8021': 'Dentists',
  '8062': 'Hospitals',
  '5651': 'Family clothing',
  '5691': 'Apparel — Men/Women',
  '7832': 'Cinema',
  '5732': 'Electronics stores',
  '5945': 'Hobby / Toy / Game shops',
  '5993': 'Cigar / Tobacco stores',
  '6011': 'ATM withdrawal',
};

const CURRENCY_LOOKUP = {
  '458': 'MYR (Malaysia)',
  '702': 'SGD (Singapore)',
  '360': 'IDR (Indonesia)',
  '764': 'THB (Thailand)',
  '704': 'VND (Vietnam)',
  '344': 'HKD (Hong Kong)',
  '156': 'CNY (China)',
  '840': 'USD',
  '978': 'EUR',
  '826': 'GBP',
  '392': 'JPY',
  '410': 'KRW',
  '608': 'PHP',
};

const COUNTRY_LOOKUP = {
  'MY': 'Malaysia',
  'SG': 'Singapore',
  'ID': 'Indonesia',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'HK': 'Hong Kong',
  'CN': 'China',
  'PH': 'Philippines',
  'JP': 'Japan',
  'KR': 'South Korea',
  'US': 'United States',
};

// Parse a TLV string into an ordered list of { tag, length, value } objects
function parseTLV(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (i + 4 > s.length) {
      out.push({ tag: '??', length: 0, value: s.slice(i), error: 'truncated' });
      break;
    }
    const tag = s.substring(i, i + 2);
    const len = parseInt(s.substring(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > s.length) {
      out.push({ tag, length: 0, value: s.slice(i + 4), error: 'invalid length' });
      break;
    }
    const value = s.substring(i + 4, i + 4 + len);
    out.push({ tag, length: len, value });
    i += 4 + len;
  }
  return out;
}

// CRC-16/CCITT-FALSE
// poly 0x1021, init 0xFFFF, no reflection, xorout 0x0000
// Works on bytes (UTF-8 encoded) — EMVCo payloads can contain multi-byte characters.
function crc16(str) {
  const bytes = new TextEncoder().encode(str);
  let crc = 0xFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Annotate a parsed TLV entry with friendly metadata
function annotate(entry, context = 'root') {
  const tag = entry.tag;
  let name = '';
  let nested = false;
  let parsedValue = entry.value;
  let extra = '';

  if (context === 'root') {
    const meta = EMVCO_TAGS[tag];
    if (meta) {
      name = meta.name;
      nested = meta.nested === true;
    } else {
      name = `Unknown tag ${tag}`;
    }
    if (tag === '52') extra = MCC_LOOKUP[entry.value] || '';
    if (tag === '53') extra = CURRENCY_LOOKUP[entry.value] || '';
    if (tag === '58') extra = COUNTRY_LOOKUP[entry.value] || '';
  } else if (context === 'merchant_account') {
    name = MERCHANT_ACCOUNT_TAGS[tag] || `Sub-tag ${tag}`;
    if (tag === '00') {
      extra = SCHEME_GUIDS[entry.value] || '';
    }
  } else if (context === 'additional_data') {
    name = ADDITIONAL_DATA_TAGS[tag] || `Sub-tag ${tag}`;
  } else {
    name = `Sub-tag ${tag}`;
  }

  const annotated = { tag, length: entry.length, value: parsedValue, name, extra };
  if (entry.error) annotated.error = entry.error;

  if (nested) {
    let subContext = 'generic';
    const tagNum = parseInt(tag, 10);
    if (tagNum >= 2 && tagNum <= 51) subContext = 'merchant_account';
    else if (tag === '62') subContext = 'additional_data';
    else if (tagNum >= 80 && tagNum <= 99) subContext = 'merchant_account';
    annotated.children = parseTLV(entry.value).map(e => annotate(e, subContext));
  }
  return annotated;
}

// Top-level decode: parse + annotate + validate CRC
function decodePayload(payload) {
  const raw = payload.trim();
  const entries = parseTLV(raw);
  const annotated = entries.map(e => annotate(e, 'root'));

  // Validate CRC: tag 63 covers everything up to and including "6304"
  let crcValid = null;
  const crcEntry = annotated.find(e => e.tag === '63');
  if (crcEntry) {
    const crcStart = raw.lastIndexOf('6304');
    if (crcStart > -1) {
      const dataForCrc = raw.substring(0, crcStart + 4);
      const computed = crc16(dataForCrc);
      crcValid = computed.toUpperCase() === crcEntry.value.toUpperCase();
      crcEntry.crcComputed = computed;
    }
  }

  return {
    raw,
    entries: annotated,
    crcValid,
    summary: buildSummary(annotated),
  };
}

// Flatten a few key fields for the history view
function buildSummary(entries) {
  const get = t => entries.find(e => e.tag === t);
  const merchant = get('59');
  const city = get('60');
  const mcc = get('52');
  const currency = get('53');
  const amount = get('54');
  const country = get('58');
  const initiation = get('01');

  // find first scheme GUID from any merchant account info template
  let scheme = '';
  for (const e of entries) {
    const n = parseInt(e.tag, 10);
    if ((n >= 2 && n <= 51) || (n >= 80 && n <= 99)) {
      const guid = e.children?.find(c => c.tag === '00');
      if (guid?.extra) { scheme = guid.extra; break; }
      if (guid?.value) { scheme = guid.value; break; }
    }
  }

  return {
    merchant: merchant?.value || '(no name)',
    city: city?.value || '',
    country: country?.extra || country?.value || '',
    mcc: mcc?.value || '',
    mccLabel: mcc?.extra || '',
    currency: currency?.extra || currency?.value || '',
    amount: amount?.value || '',
    initiation: initiation?.value === '11' ? 'static' : initiation?.value === '12' ? 'dynamic' : '',
    scheme,
  };
}

window.EMVCO = { parseTLV, decodePayload, crc16, EMVCO_TAGS };
