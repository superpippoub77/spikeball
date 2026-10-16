// Compila spikefever2600.asm con dasm (npm install dasm) e scrive spikefever2600.bin (4K).
// Uso: node build.js   (rigenera prima data.inc: python3 gen_data.py > data.inc)
const fs = require('fs'), path = require('path');
const dasm = require(process.env.DASM || 'dasm').default;
const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'spikefever2600.asm'), 'utf8');
const res = dasm(src, { format: 3, machine: 'atari2600', includes: { 'data.inc': fs.readFileSync(path.join(dir, 'data.inc'), 'utf8') } });
const errs = (res.output || []).concat(res.list ? [] : []).filter(l => /error|not resolved|Unknown/i.test(l));
if (!res.success || !res.data || res.data.length !== 4096) {
  console.error((res.output || []).join('\n')); process.exit(1);
}
fs.writeFileSync(path.join(dir, 'spikefever2600.bin'), Buffer.from(res.data));
const free = res.data.reduce((n, b, i) => n, 0);
console.log('OK: spikefever2600.bin, 4096 byte', errs.length ? errs.join('\n') : '');
