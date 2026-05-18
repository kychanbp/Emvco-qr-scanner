// Minimal IndexedDB wrapper for storing scan images.
// Images are too big for localStorage (5–10MB total quota); IDB has ~50MB+ per origin.

const IDB_NAME = 'emvco_qr_scanner';
const IDB_STORE = 'images';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
  return dbPromise;
}

async function dbPut(id, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGet(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Snapshot a canvas/video frame as a JPEG blob.
function canvasToJpegBlob(canvas, quality = 0.85) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
}

// Make a smaller thumbnail data URL from a source canvas.
function makeThumbnailDataUrl(srcCanvas, maxSide = 200) {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const tc = document.createElement('canvas');
  tc.width = Math.round(w * scale);
  tc.height = Math.round(h * scale);
  tc.getContext('2d').drawImage(srcCanvas, 0, 0, tc.width, tc.height);
  return tc.toDataURL('image/jpeg', 0.7);
}

// Try Web Share API (iOS Safari: lets user "Save Image" -> Photos).
// Falls back to a download link when share is unavailable.
async function shareOrDownload(blob, filename) {
  try {
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    }
  } catch (e) {
    // User cancelled the share sheet — that's fine.
    if (e.name === 'AbortError') return 'cancelled';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

window.QrImageDB = { dbPut, dbGet, dbDelete, canvasToJpegBlob, makeThumbnailDataUrl, shareOrDownload };
