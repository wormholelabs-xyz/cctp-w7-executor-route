// Emits dist/cjs/package.json with `"type": "commonjs"` so Node treats the
// CJS-compiled output as CommonJS even though the package root declares
// `"type": "module"` for the ESM build.
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'dist', 'cjs', 'package.json');
fs.writeFileSync(target, JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
