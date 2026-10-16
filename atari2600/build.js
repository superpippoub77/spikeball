// Compila spikefever2600.asm con dasm e scrive spikefever2600.bin (cartuccia da 4K).
// Uso:  npm install dasm   poi   python3 gen_data.py > data.inc && node build.js
const fs = require('fs'), path = require('path');
const dasm = require(process.env.DASM || 'dasm').default;
const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'spikefever2600.asm'), 'utf8');
const res = dasm(src, { format: 3, quick: true, machine: 'atari2600', includes: { 'data.inc': fs.readFileSync(path.join(dir, 'data.inc'), 'utf8') } });
if (!res.data || res.data.length !== 4096) {   // errore (o ROM oltre i 4K): mostra i messaggi di dasm
  console.error((res.output || []).join('\n')); process.exit(1);
}
fs.writeFileSync(path.join(dir, 'spikefever2600.bin'), Buffer.from(res.data));
console.log('OK: spikefever2600.bin, 4096 byte');
