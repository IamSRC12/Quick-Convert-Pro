const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { extOf, targetsFor, convertFile } = require('./lib/convert');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const UPLOADS = path.join(ROOT, '.uploads');
const OUTPUT = path.join(ROOT, 'output');
const PORT = process.env.PORT || 5173;

for (const dir of [UPLOADS, OUTPUT]) fs.mkdirSync(dir, { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const history = [];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/formats') {
    const ext = (url.searchParams.get('ext') || '').toLowerCase();
    return json(res, 200, { input: ext, targets: ext ? targetsFor(ext) : [] });
  }

  if (req.method === 'GET' && url.pathname === '/api/history') {
    return json(res, 200, { items: history.slice(-20).reverse() });
  }

  if (req.method === 'POST' && url.pathname === '/api/convert') {
    try {
      const filename = decodeURIComponent(req.headers['x-filename'] || 'file');
      const target = String(req.headers['x-target'] || '').toLowerCase();
      if (!target) return json(res, 400, { ok: false, error: 'Missing X-Target header' });
      const body = await readBody(req);
      if (!body.length) return json(res, 400, { ok: false, error: 'Empty upload' });

      const inExt = extOf(filename) || 'bin';
      const id = crypto.randomBytes(6).toString('hex');
      const input = path.join(UPLOADS, `${id}.${inExt}`);
      fs.writeFileSync(input, body);

      const outPath = convertFile(input, target, OUTPUT);
      const outName = path.basename(outPath);
      fs.unlinkSync(input);

      const entry = { from: filename, to: outName, size: fs.statSync(outPath).size, at: new Date().toISOString() };
      history.push(entry);
      json(res, 200, { ok: true, url: `/download/${encodeURIComponent(outName)}`, ...entry });
    } catch (err) {
      json(res, 500, { ok: false, error: err.message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/download/')) {
    const name = path.basename(decodeURIComponent(url.pathname.slice('/download/'.length)));
    const file = path.join(OUTPUT, name);
    if (!file.startsWith(OUTPUT) || !fs.existsSync(file)) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}"`,
    });
    return fs.createReadStream(file).pipe(res);
  }

  let urlPath = decodeURIComponent(url.pathname);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.join(PUBLIC, urlPath);
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Quick Convert Pro running -> http://localhost:${PORT}`);
});
