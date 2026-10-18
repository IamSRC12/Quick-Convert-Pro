const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const list = document.getElementById('list');
const historyEl = document.getElementById('history');

// ─── Theme ────────────────────────────────────────────────────────────────────
const themeBtn = document.getElementById('theme-toggle');
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('qcp-theme', next); } catch (e) {}
});

// ─── Drop zone ────────────────────────────────────────────────────────────────
drop.addEventListener('click', () => fileInput.click());
['dragover', 'dragenter'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('drag'); }));
['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('drag'); }));
drop.addEventListener('drop', (ev) => addFiles([...ev.dataTransfer.files]));
fileInput.addEventListener('change', () => addFiles([...fileInput.files]));

const extOf = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

async function addFiles(files) {
  for (const file of files) {
    const ext = extOf(file.name);
    let targets = [];
    try {
      const res = await fetch(`/api/formats?ext=${encodeURIComponent(ext)}`);
      targets = (await res.json()).targets || [];
    } catch (e) {}

    const li = document.createElement('li');
    if (!targets.length) {
      li.innerHTML = `<span class="name">${file.name}<small>Unsupported type (.${ext})</small></span>`;
      list.appendChild(li);
      continue;
    }

    const options = targets.map((t) => `<option value="${t}">${t.toUpperCase()}</option>`).join('');
    li.innerHTML = `
      <span class="name">${file.name}<small>${(file.size / 1048576).toFixed(1)} MB</small></span>
      <select>${options}</select>
      <button class="primary">Convert</button>
      <span class="status"></span>
      <div class="progress"><div class="progress-fill"></div></div>`;

    const select = li.querySelector('select');
    const button = li.querySelector('button');
    const status = li.querySelector('.status');
    const progress = li.querySelector('.progress');
    const fill = li.querySelector('.progress-fill');

    button.addEventListener('click', () => convertOne(file, select, button, status, progress, fill));
    list.appendChild(li);
  }
}

function convertOne(file, select, button, status, progress, fill) {
  button.disabled = true;
  status.className = 'status';
  status.textContent = 'Uploading…';
  progress.classList.add('active');
  progress.classList.remove('indeterminate');
  fill.style.width = '0%';

  const setFill = (pct) => { fill.style.width = `${pct}%`; };

  const finish = (msg) => {
    if (msg.ok) {
      progress.classList.add('done');
      setFill(100);
      status.className = 'status ok';
      status.innerHTML = `<a class="dl" href="${msg.url}">Download</a>`;
      loadHistory();
    } else {
      progress.classList.add('failed');
      status.className = 'status fail';
      status.textContent = msg.error || 'Failed';
    }
    button.disabled = false;
  };

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/convert');
  xhr.setRequestHeader('X-Filename', encodeURIComponent(file.name));
  xhr.setRequestHeader('X-Target', select.value);
  xhr.setRequestHeader('Content-Type', 'application/octet-stream');

  xhr.upload.onprogress = (e) => {
    if (!e.lengthComputable) return;
    const pct = Math.round((e.loaded / e.total) * 100);
    setFill(pct * 0.25);
    status.textContent = `Uploading ${pct}%`;
  };
  xhr.upload.onload = () => {
    status.textContent = 'Converting…';
    progress.classList.add('indeterminate');
    setFill(25);
  };

  let cursor = 0;
  let tail = '';
  let done = false;

  const consume = () => {
    if (xhr.readyState < 3 || done) return;
    const text = xhr.responseText;
    if (text.length <= cursor) return;
    tail += text.slice(cursor);
    cursor = text.length;
    let idx;
    while ((idx = tail.indexOf('\n')) >= 0) {
      const line = tail.slice(0, idx).trim();
      tail = tail.slice(idx + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch (e) { continue; }
      if (msg.type === 'progress') {
        if (msg.percent == null) {
          progress.classList.add('indeterminate');
          status.textContent = 'Converting…';
        } else {
          progress.classList.remove('indeterminate');
          setFill(25 + msg.percent * 0.75);
          status.textContent = `Converting ${msg.percent}%`;
        }
      } else if (msg.type === 'done') {
        done = true;
        finish(msg);
      }
    }
  };

  xhr.onprogress = consume;
  xhr.onload = consume;
  xhr.onerror = () => { if (!done) { done = true; finish({ ok: false, error: 'Network error' }); } };
  xhr.send(file);
}

async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    const { items } = await res.json();
    historyEl.innerHTML = items.map((i) =>
      `<li><a href="/download/${encodeURIComponent(i.to)}">${i.to}</a><span>${(i.size / 1024).toFixed(0)} KB</span></li>`
    ).join('');
  } catch (e) {}
}

loadHistory();
