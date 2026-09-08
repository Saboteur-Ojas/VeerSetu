const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..', 'src');
const results = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) results.push(full);
  }
}

walk(root);
results.push(path.resolve(__dirname, '..', 'server.js'));

let failed = 0;
for (const file of results) {
  try {
    require(file);
    console.log('OK   ', path.relative(__dirname, file));
  } catch (err) {
    failed += 1;
    console.log('FAIL ', path.relative(__dirname, file), '->', err.message);
  }
}

// Boot the express app to ensure routers mount cleanly.
try {
  const app = require(path.resolve(__dirname, '..', 'src', 'app.js'));
  const hasHealth = app._router && app._router.stack.some((layer) => layer.route && layer.route.path === '/api/health');
  const routeCount = app._router ? app._router.stack.filter((l) => l.route).length : 0;
  console.log('APP  booted, /api/health route present:', hasHealth, '| routes mounted:', routeCount);
} catch (err) {
  failed += 1;
  console.log('APP  FAIL ->', err.message);
}

console.log(failed === 0 ? '\nALL MODULES LOADED CLEANLY' : `\n${failed} FAILURES`);
process.exit(failed === 0 ? 0 : 1);