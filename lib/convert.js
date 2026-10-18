const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Prefer a bundled binary (packaged desktop app), otherwise fall back to PATH.
function bin(name) {
  const dirs = [
    process.resourcesPath && path.join(process.resourcesPath, 'bin'),
    path.join(__dirname, '..', 'resources', 'bin'),
  ].filter(Boolean);
  for (const dir of dirs) {
    const p = path.join(dir, `${name}.exe`);
    if (fs.existsSync(p)) return p;
  }
  return name;
}

const FORMATS = {
  video: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'gif'],
  audio: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'],
  data: ['json', 'csv', 'txt'],
};

const AUDIO_EXTS = new Set(FORMATS.audio);
const FAST_CONTAINERS = new Set(['mp4', 'mkv', 'mov', 'avi']);

function extOf(file) {
  return path.extname(file).slice(1).toLowerCase();
}

function classify(ext) {
  const e = ext.toLowerCase();
  for (const [category, list] of Object.entries(FORMATS)) {
    if (list.includes(e)) return category;
  }
  return null;
}

function targetsFor(inputExt) {
  const category = classify(inputExt);
  if (!category) return [];
  if (category === 'video') return [...FORMATS.video, ...FORMATS.audio];
  return FORMATS[category].slice();
}

// Speed-tuned ffmpeg args. Progress is emitted on stdout as key=value lines.
function buildArgs(input, output, outExt) {
  const ext = outExt.toLowerCase();
  const head = ['-y', '-hide_banner', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1', '-i', input];
  const threads = ['-threads', '0'];
  if (AUDIO_EXTS.has(ext)) return [...head, '-vn', ...threads, output];
  if (ext === 'gif') return [...head, '-vf', 'fps=12,scale=480:-1', ...threads, output];
  if (ext === 'webm') return [...head, '-deadline', 'realtime', '-cpu-used', '8', ...threads, output];
  if (FAST_CONTAINERS.has(ext)) return [...head, '-preset', 'veryfast', ...threads, output];
  return [...head, ...threads, output];
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function csvToJson(text) {
  const rows = parseCsv(text.replace(/\n+$/, ''));
  if (!rows.length) return '[]';
  const header = rows[0];
  const out = rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = r[i] !== undefined ? r[i] : ''; });
    return obj;
  });
  return JSON.stringify(out, null, 2);
}

function jsonToCsv(text) {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : [data];
  if (!arr.length) return '';
  const header = Object.keys(arr[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const row of arr) lines.push(header.map((h) => esc(row[h])).join(','));
  return lines.join('\n');
}

function convertText(inputText, inputExt, outExt) {
  const i = inputExt.toLowerCase(), o = outExt.toLowerCase();
  if (i === o || o === 'txt') return inputText;
  if (i === 'csv' && o === 'json') return csvToJson(inputText);
  if (i === 'json' && o === 'csv') return jsonToCsv(inputText);
  throw new Error(`Unsupported text conversion: ${i} -> ${o}`);
}

function probeDuration(input) {
  try {
    const r = spawnSync(bin('ffprobe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', input], { encoding: 'utf8' });
    const d = parseFloat(String(r.stdout || '').trim());
    return Number.isFinite(d) && d > 0 ? d : null;
  } catch {
    return null;
  }
}

// onProgress(percent) where percent is 0..100, or null when the total is unknown.
function convertFile(input, outExt, outDir, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const inExt = extOf(input);
    const category = classify(inExt);
    if (!category) return reject(new Error(`Unsupported input type: .${inExt}`));
    if (!targetsFor(inExt).includes(outExt.toLowerCase())) return reject(new Error(`Cannot convert .${inExt} -> .${outExt}`));
    const base = path.basename(input, path.extname(input));
    const output = path.join(outDir, `${base}.${outExt.toLowerCase()}`);

    if (category === 'data' && classify(outExt) === 'data') {
      try {
        const text = convertText(fs.readFileSync(input, 'utf8'), inExt, outExt);
        fs.writeFileSync(output, text);
        onProgress(100);
        return resolve(output);
      } catch (err) {
        return reject(err);
      }
    }

    const args = buildArgs(input, output, outExt);
    const duration = probeDuration(input);
    const child = spawn(bin('ffmpeg'), args, { windowsHide: true });
    let stderr = '';
    let pending = '';
    let reported = -1;

    const handleLine = (line) => {
      const m = /^out_time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line);
      if (!m) return;
      if (!duration) { onProgress(null); return; }
      const secs = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
      const pct = Math.min(99, Math.round((secs / duration) * 100));
      if (pct > reported) { reported = pct; onProgress(pct); }
    };

    child.stdout.on('data', (buf) => {
      pending += buf.toString();
      let i;
      while ((i = pending.indexOf('\n')) >= 0) {
        handleLine(pending.slice(0, i).trim());
        pending = pending.slice(i + 1);
      }
    });
    child.stderr.on('data', (buf) => { stderr += buf.toString(); });
    child.on('error', (err) => reject(new Error(`ffmpeg not available: ${err.message}`)));
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg failed: ${stderr.split('\n').filter(Boolean).slice(-3).join(' ')}`));
      if (!fs.existsSync(output)) return reject(new Error('ffmpeg produced no output'));
      onProgress(100);
      resolve(output);
    });
  });
}

module.exports = { FORMATS, extOf, classify, targetsFor, buildArgs, csvToJson, jsonToCsv, convertText, convertFile, probeDuration, bin };
