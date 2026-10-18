const fs = require('fs');
const path = require('path');
const { extOf, targetsFor, convertFile } = require('./lib/convert');

const [, , input, target, outArg] = process.argv;

function usage() {
  console.log('Quick Convert Pro CLI');
  console.log('  node cli.js <file|folder> <targetExt> [outputDir]');
  console.log('  node cli.js video.mp4 mp3');
  console.log('  node cli.js ./folder png ./out');
  process.exit(input ? 1 : 0);
}

if (!input || !target) usage();

const outDir = outArg || path.join(process.cwd(), 'output');
fs.mkdirSync(outDir, { recursive: true });

async function handle(file) {
  const ext = extOf(file);
  if (!targetsFor(ext).includes(target.toLowerCase())) {
    console.log(`skip  ${path.basename(file)} (.${ext} -> .${target} not supported)`);
    return;
  }
  try {
    const out = await convertFile(file, target, outDir, (p) => {
      if (p % 10 === 0) process.stdout.write(`\r      ${path.basename(file)} ${p}%   `);
    });
    process.stdout.write('\r');
    console.log(`ok    ${path.basename(file)} -> ${path.basename(out)}`);
  } catch (err) {
    console.log(`fail  ${path.basename(file)}: ${err.message}`);
  }
}

(async () => {
  if (fs.statSync(input).isDirectory()) {
    const files = fs.readdirSync(input).map((f) => path.join(input, f)).filter((f) => fs.statSync(f).isFile());
    console.log(`Converting ${files.length} file(s) to .${target} -> ${outDir}`);
    for (const f of files) await handle(f);
  } else {
    await handle(input);
  }
})();
