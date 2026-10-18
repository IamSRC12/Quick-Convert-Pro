const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FORMATS = {
  video: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'gif'],
  audio: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'],
  data: ['json', 'csv', 'txt'],
};

const AUDIO_EXTS = new Set(FORMATS.audio);

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

function buildArgs(input, output, outExt) {
  const ext = outExt.toLowerCase();
  if (AUDIO_EXTS.has(ext)) return ['-y', '-i', input, '-vn', output];
  if (ext === 'gif') return ['-y', '-i', input, '-vf', 'fps=12,scale=480:-1', output];
  return ['-y', '-i', input, output];
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

function convertFile(input, outExt, outDir) {
  const inExt = extOf(input);
  const category = classify(inExt);
  if (!category) throw new Error(`Unsupported input type: .${inExt}`);
  if (!targetsFor(inExt).includes(outExt.toLowerCase())) throw new Error(`Cannot convert .${inExt} -> .${outExt}`);
  const base = path.basename(input, path.extname(input));
  const output = path.join(outDir, `${base}.${outExt.toLowerCase()}`);

  if (category === 'data' && classify(outExt) === 'data') {
    const text = convertText(fs.readFileSync(input, 'utf8'), inExt, outExt);
    fs.writeFileSync(output, text);
    return output;
  }

  const args = buildArgs(input, output, outExt);
  const res = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (res.error) throw new Error(`ffmpeg not available: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${(res.stderr || '').split('\n').slice(-3).join(' ')}`);
  if (!fs.existsSync(output)) throw new Error('ffmpeg produced no output');
  return output;
}

module.exports = { FORMATS, extOf, classify, targetsFor, buildArgs, csvToJson, jsonToCsv, convertText, convertFile };
