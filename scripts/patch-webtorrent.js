#!/usr/bin/env node
/**
 * Patch webtorrent's dependency chain for Node/Electron main-process use.
 *
 * webtorrent 2.x + parse-torrent 11 is broken in Node/Electron: parse-torrent
 * returns `infoHash` as a HEX STRING, but webtorrent passes it through
 * uint8-util's `arr2hex()` which (in the node build) requires a Uint8Array and
 * crashes with ERR_INVALID_ARG_TYPE on every magnet/torrent add.
 *
 * Fix: make uint8-util's `arr2hex` hex-string-tolerant (returns the input
 * lower-cased when given a string). Applied at npm install time, idempotent.
 * (The browser CDN bundle used in the renderer bundles its own older deps and
 * is unaffected.)
 */
const fs = require('fs');
const path = require('path');

function patchFile(relPath, marker, replacement) {
  const file = path.join(__dirname, '..', 'node_modules', relPath);
  if (!fs.existsSync(file)) {
    console.log(`patch-webtorrent: ${relPath} not found (skipped)`);
    return;
  }
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes(marker)) {
    // already patched? check for our signature
    if (src.includes('LUNASTREAM-PATCH')) {
      console.log(`patch-webtorrent: ${relPath} already patched`);
      return;
    }
    src = src.replace(marker, replacement);
    fs.writeFileSync(file, src);
    console.log(`patch-webtorrent: patched ${relPath}`);
  } else if (src.includes('LUNASTREAM-PATCH')) {
    console.log(`patch-webtorrent: ${relPath} already patched`);
  } else {
    console.log(`patch-webtorrent: marker not found in ${relPath} (upstream changed? skipped)`);
  }
}

// node build: crash `Buffer.from(data.buffer, ...)` on strings
patchFile(
  'uint8-util/dist/src/node.js',
  'export const arr2hex = (data) => Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString(\'hex\');',
  'export const arr2hex = (data) => typeof data === \'string\' ? data.toLowerCase() : Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString(\'hex\'); // LUNASTREAM-PATCH: tolerate hex-string infoHash (webtorrent+parse-torrent@11)'
);

console.log('patch-webtorrent: done');
