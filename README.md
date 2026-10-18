# Quick Convert Pro

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img alt="FFmpeg" src="https://img.shields.io/badge/FFmpeg-007808?style=flat-square&logo=ffmpeg&logoColor=white" />
  <img alt="Electron" src="https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white" />
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
</p>

<p align="center"><b>Convert a whole folder in one pass.</b></p>

---

## Overview

Batch file converter for **video, audio, image and data** formats. Ships as a **desktop app (Electron)** and a **web app**, plus a CLI, all backed by `ffmpeg` for media and built-in logic for `json`/`csv`/`txt`.

## ✨ Features

- Desktop app for Windows (installer + portable `.exe`), with `ffmpeg` bundled
- Batch conversion — drag many files at once
- Live **progress bar** per file (upload + conversion) with speed-tuned encodes
- **Light / dark theme** (warm golden light, near-black dark)
- Video, audio and image conversion via `ffmpeg`
- Video → audio extraction and video → GIF
- `json` ⇄ `csv` ⇄ `txt` conversion without any external tool
- CLI for scripting: single files or whole folders

## 🚀 Getting Started

Requires **Node.js 18+**. `ffmpeg` must be on your `PATH` for source runs (it is bundled inside the packaged app).

```bash
npm install
npm start            # launch the desktop app
npm run web          # or: web UI on http://localhost:5173
npm run dist         # build the Windows installer + portable exe (dist/)
# CLI:
node cli.js video.mp4 mp3
node cli.js ./myfolder png ./out
```

Windows one-click web launch: **`START.bat`**.

## 📁 Project Structure

```
Quick-Convert-Pro/
├── lib/
│   └── convert.js        # format rules, ffmpeg args (async + progress), text conversion
├── public/               # web UI (index.html, app.js, styles.css)
├── electron/
│   └── main.js           # desktop entry point
├── scripts/
│   └── prepare-ffmpeg.js # bundles ffmpeg/ffprobe for packaging
├── build/icon.png        # app icon
├── server.js             # HTTP server + streaming /api/convert
├── cli.js                # command-line interface
├── selftest.js           # conversion logic self-test
└── START.bat
```

## 🧪 Tests

```bash
npm test
```

## 📄 License

© 2026 Shlok Chandak ([@IamSRC12](https://github.com/IamSRC12)). All rights reserved.
