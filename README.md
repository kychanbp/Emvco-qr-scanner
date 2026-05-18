# EMVCo QR Scanner

Offline-first web app for decoding EMVCo MPM (Merchant-Presented Mode) payment QR codes — DuitNow, PayNow, QRIS, PromptPay, VietQR, and any other rail that follows the EMVCo standard.

All scanning, parsing, and storage happens on-device. Nothing is sent to a server.

## Features

- Live camera scanning with `jsQR`
- Full TLV (Tag-Length-Value) tree of any EMVCo MPM payload
- Annotated fields: MCC lookup, currency, country code, scheme GUID identification (PayNow, DuitNow, QRIS, etc.)
- CRC-16/CCITT-FALSE validation
- LocalStorage scan history
- Export to JSON or CSV
- Paste-decode mode (no camera needed)
- PWA: installable on phone home screen, runs fully offline after first load

## Run locally

Camera APIs require HTTPS or `localhost`. Easiest way:

```bash
cd emvco-qr-scanner
python3 -m http.server 8000
# open http://localhost:8000 in a browser
```

For testing on your phone over your local Wi-Fi, you'll need HTTPS — use a tunnel like `ngrok` or just deploy to GitHub Pages (below).

## Deploy to GitHub Pages

1. Create an empty public repo on GitHub
2. Push this folder:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```

3. In GitHub repo **Settings → Pages**, set Source to `Deploy from a branch`, Branch `main`, folder `/ (root)`. Save.
4. Wait ~30 seconds, then visit `https://<username>.github.io/<repo>/`.
5. On your phone browser, open that URL and choose **Add to Home Screen** for offline use.

## How parsing works

Every EMVCo MPM payload is concatenated TLV records: `[2-digit tag][2-digit length][value]`. The parser recursively decodes nested templates (merchant account info templates 02-51, additional data template 62, and unreserved templates 80-99), annotates known fields, and validates the CRC-16 checksum at tag 63.

See `parser.js` for the tag dictionary and `EMVCO MPM v1.0` from EMVCo for the full specification.

## Privacy

- No analytics, no telemetry, no external requests at runtime
- Service worker only caches the app's own files
- All scan history lives in `localStorage` on your device
- Export buttons produce files saved by your browser; nothing is uploaded

## License

MIT
