// Copies ffmpeg/ffprobe next to the packaged app so the EXE is self-contained.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dest = path.join(__dirname, '..', 'resources', 'bin');
fs.mkdirSync(dest, { recursive: true });

for (const name of ['ffmpeg', 'ffprobe']) {
  let found = null;
  try {
    const lines = execSync(`where ${name}`, { encoding: 'utf8' })
      .split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    found = lines.find((l) => !/\\Links\\/i.test(l)) || lines[0] || null;
  } catch (e) {
    found = null;
  }

  if (found && fs.existsSync(found)) {
    const target = path.join(dest, `${name}.exe`);
    fs.copyFileSync(found, target);
    console.log(`bundled ${name} <- ${found}`);
  } else {
    console.log(`warn: ${name} not found on PATH - the packaged app will need it installed`);
  }
}
