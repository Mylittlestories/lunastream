// Writes public/version.json from package.json (runs before `next build`).
// The Settings page fetches it so the UI always shows the real build version.
const fs = require('fs');
const path = require('path');
const pkg = require(path.join(__dirname, '..', 'package.json'));
fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'version.json'),
  JSON.stringify({ name: pkg.name, version: pkg.version })
);
console.log('version.json ->', pkg.version);
