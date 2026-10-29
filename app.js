'use strict';

// Shared hosting / Passenger entry point. Resolve files from the application root,
// even when the hosting process starts with a different working directory.
const path = require('node:path');
const fs = require('node:fs');
process.chdir(__dirname);
// Shared-hosting entry is production unless the host explicitly chooses another mode.
process.env.NODE_ENV ||= 'production';
const entry = path.join(__dirname, 'dist', 'main.js');
if (!fs.existsSync(entry)) {
  throw new Error('Compiled API missing. Run npm ci and npm run build before starting app.js.');
}
require(entry);
