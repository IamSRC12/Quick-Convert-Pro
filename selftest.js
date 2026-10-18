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

assert.deepStrictEqual(c.buildArgs('in.mp4', 'out.mp3', 'mp3'), ['-y', '-i', 'in.mp4', '-vn', 'out.mp3']);
assert.strictEqual(c.buildArgs('in.mp4', 'out.gif', 'gif').includes('fps=12,scale=480:-1'), true);
assert.deepStrictEqual(c.buildArgs('in.png', 'out.webp', 'webp'), ['-y', '-i', 'in.png', 'out.webp']);
assert.deepStrictEqual(c.buildArgs('in.mov', 'out.mp4', 'mp4'), ['-y', '-i', 'in.mov', 'out.mp4']);

const csv = 'name,age\n"Smith, John",42\nJane,30';
const json = c.csvToJson(csv);
const back = c.jsonToCsv(json);
assert.deepStrictEqual(JSON.parse(json)[0], { name: 'Smith, John', age: '42' });
assert.ok(back.startsWith('name,age'));
assert.ok(back.includes('"Smith, John"'));

assert.strictEqual(c.convertText('hello', 'txt', 'txt'), 'hello');
assert.throws(() => c.convertText('x', 'csv', 'png'), /Unsupported text conversion/);

console.log('convert self-test: all assertions passed');
