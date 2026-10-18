const assert = require('assert');
const c = require('./lib/convert');

assert.strictEqual(c.classify('mp4'), 'video');
assert.strictEqual(c.classify('mp3'), 'audio');
assert.strictEqual(c.classify('png'), 'image');
assert.strictEqual(c.classify('json'), 'data');
assert.strictEqual(c.classify('exe'), null);

assert.ok(c.targetsFor('mp4').includes('mp3'), 'video can extract audio');
assert.ok(c.targetsFor('mp4').includes('gif'), 'video can make gif');
assert.deepStrictEqual(c.targetsFor('wav'), c.FORMATS.audio);
assert.deepStrictEqual(c.targetsFor('exe'), []);

const has = (args, ...flags) => flags.every((f) => args.includes(f));
const gifArgs = c.buildArgs('in.mp4', 'out.gif', 'gif');
assert.ok(gifArgs.includes('fps=12,scale=480:-1'), 'gif gets fps/scale filter');
assert.ok(has(gifArgs, '-progress', 'pipe:1', '-threads', '0'), 'progress + threads always present');
assert.ok(c.buildArgs('in.mov', 'out.mp4', 'mp4').includes('veryfast'), 'h264 containers use a fast preset');
assert.ok(has(c.buildArgs('in.mov', 'out.mp4', 'mp4'), '-preset', 'veryfast'));
assert.ok(c.buildArgs('in.mp4', 'out.webm', 'webm').includes('realtime'), 'webm uses realtime deadline');
assert.ok(c.buildArgs('in.mp4', 'out.mp3', 'mp3').includes('-vn'), 'audio extract drops video');

const csv = 'name,age\n"Smith, John",42\nJane,30';
const json = c.csvToJson(csv);
const back = c.jsonToCsv(json);
assert.deepStrictEqual(JSON.parse(json)[0], { name: 'Smith, John', age: '42' });
assert.ok(back.startsWith('name,age'));
assert.ok(back.includes('"Smith, John"'));

assert.strictEqual(c.convertText('hello', 'txt', 'txt'), 'hello');
assert.throws(() => c.convertText('x', 'csv', 'png'), /Unsupported text conversion/);

(async () => {
  const os = require('os');
  const fs = require('fs');
  const pathMod = require('path');
  const { spawnSync } = require('child_process');
  const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    console.log('convert self-test: assertions passed (ffmpeg not found, skipped live convert)');
    return;
  }
  const dir = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'qcp-test-'));
  const src = pathMod.join(dir, 'src.png');
  spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=gold:s=64x64:d=1', '-frames:v', '1', src], { encoding: 'utf8' });
  const seen = [];
  const out = await c.convertFile(src, 'webp', dir, (p) => seen.push(p));
  assert.ok(fs.existsSync(out), 'produced output file');
  assert.ok(seen.includes(100), 'reported 100% on completion');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('convert self-test: all assertions passed (live png->webp convert ok)');
})();
