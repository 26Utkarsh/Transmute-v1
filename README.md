# ⚡ Transmute — File Converter

A browser-based file conversion tool with 10 utilities for images and PDFs. Everything runs entirely in your browser — no files are ever uploaded to a server.

🔗 **Live Demo:** [transmute-v1.onrender.com](https://transmute-v1.onrender.com)

---

## Features

| # | Tool | Formats |
|---|------|---------|
| 01 | Convert Image Format | PNG ↔ JPG ↔ WebP |
| 02 | Merge PDFs | PDF + PDF → PDF |
| 03 | Image → PDF | JPG / PNG → PDF |
| 04 | PDF → Images | PDF → PNG / JPG |
| 05 | Compress Image | JPG, PNG, WebP |
| 06 | Compress PDF | PDF (up to 85% smaller) |
| 07 | Resize Image | Custom px or % scale |
| 08 | PDF → Word | PDF → DOCX |
| 09 | Split PDF | Extract pages / page ranges |
| 10 | WebP → JPG / PNG | WebP → JPG / PNG |

---

## Privacy

- **Nothing leaves your device.** All processing happens locally in the browser via JavaScript APIs.
- No sign-up required.
- No data retention.
- No backend file handling.

---

## Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Libraries:**
  - [JSZip](https://stuk.github.io/jszip/) — ZIP packaging for batch downloads
  - [Mammoth.js](https://github.com/mwilliams/mammoth.js) — DOCX preview/conversion
- **Deployment:** [Render](https://render.com)
- **Backend:** Node.js (serves static files only)

---

## Run Locally

```bash
git clone https://github.com/26Utkarsh/Transmute-v1.git
cd Transmute-v1
npm install
npm start
```

Then open `http://localhost:3000` in your browser.

---

## Project Structure

```
Transmute-v1/
├── index.html        # Main UI
├── style.css         # Styles + dark mode
├── script.js         # All conversion logic
├── backend/          # Static file server
├── package.json
└── .gitignore
```

---

## Built With

Developed with AI assistance.

---

## License

MIT
