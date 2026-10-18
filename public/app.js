const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const list = document.getElementById('list');
const historyEl = document.getElementById('history');

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
    } catch {}

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
      <span class="status"></span>`;
    const select = li.querySelector('select');
    const button = li.querySelector('button');
    const status = li.querySelector('.status');

    button.addEventListener('click', async () => {
      button.disabled = true;
      status.className = 'status';
      status.textContent = 'Converting…';
      try {
        const buf = await file.arrayBuffer();
        const res = await fetch('/api/convert', {
          method: 'POST',
          headers: { 'X-Filename': encodeURIComponent(file.name), 'X-Target': select.value },
          body: buf,
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        status.className = 'status ok';
        status.innerHTML = `<a class="dl" href="${data.url}">Download</a>`;
        loadHistory();
      } catch (err) {
        status.className = 'status fail';
        status.textContent = err.message;
      } finally {
        button.disabled = false;
      }
    });

    list.appendChild(li);
  }
}

async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    const { items } = await res.json();
    historyEl.innerHTML = items.map((i) =>
      `<li><a href="/download/${encodeURIComponent(i.to)}">${i.to}</a><span>${(i.size / 1024).toFixed(0)} KB</span></li>`
    ).join('');
  } catch {}
}

loadHistory();
