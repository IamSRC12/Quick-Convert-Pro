# Quick Convert Pro

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img alt="FFmpeg" src="https://img.shields.io/badge/FFmpeg-007808?style=flat-square&logo=ffmpeg&logoColor=white" />
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
</p>

<p align="center"><b>Convert a whole folder in one pass.</b></p>

---

## Overview

Batch file converter for **video, audio, image and data** formats. A web UI plus a CLI, both backed by `ffmpeg` for media and built-in logic for `json`/`csv`/`txt`.

## ✨ Features

- Batch conversion from the browser (drag many files at once)
- Video, audio and image conversion via `ffmpeg`
- Video → audio extraction and video → GIF
- `json` ⇄ `csv` ⇄ `txt` conversion without any external tool
- CLI for scripting: single files or whole folders

## 🚀 Getting Started

Requires **Node.js 18+** and **ffmpeg** on your `PATH`.

```bash
npm install          # no dependencies, just initialises
npm start            # web UI on http://localhost:5173
# or use the CLI:
node cli.js video.mp4 mp3
node cli.js ./myfolder png ./out
```

Windows one-click: **`START.bat`**.

## 📁 Project Structure

```
Quick-Convert-Pro/
├── lib/
│   └── convert.js       # format rules, ffmpeg args, text conversion
├── public/               # web UI (index.html, app.js, styles.css)
├── server.js            # HTTP server + /api/convert
├── cli.js               # command-line interface
├── selftest.js          # conversion logic self-test
└── START.bat
```

## 🧪 Tests

```bash
npm test
```

## 📄 License

© 2026 Shlok Chandak ([@IamSRC12](https://github.com/IamSRC12)). All rights reserved.
