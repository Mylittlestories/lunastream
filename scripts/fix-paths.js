#!/usr/bin/env node
// Fix absolute paths in Next.js static export for file:// protocol
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix CSS paths: /_next/static/css/ -> ./_next/static/css/
  if (content.includes('"/_next/static/css/')) {
    content = content.replace(/"\/_next\/static\/css\//g, '"./_next/static/css/');
    modified = true;
  }
  
  // Fix JS paths: /_next/static/chunks/ -> ./_next/static/chunks/
  if (content.includes('"/_next/static/chunks/')) {
    content = content.replace(/"\/_next\/static\/chunks\//g, '"./_next/static/chunks/');
    modified = true;
  }
  
  // Fix JS paths in src attributes
  if (content.includes('src="/_next/static/')) {
    content = content.replace(/src="\/_next\/static\//g, 'src="./_next/static/');
    modified = true;
  }
  
  // Fix manifest path
  if (content.includes('href="/manifest.json"')) {
    content = content.replace('href="/manifest.json"', 'href="./manifest.json"');
    modified = true;
  }
  
  // Fix navigation links for SPA routing
  if (content.includes('href="/analytics"')) {
    content = content.replace(/href="\/analytics"/g, 'href="./analytics/"');
    modified = true;
  }
  if (content.includes('href="/history"')) {
    content = content.replace(/href="\/history"/g, 'href="./history/"');
    modified = true;
  }
  if (content.includes('href="/login"')) {
    content = content.replace(/href="\/login"/g, 'href="./login/"');
    modified = true;
  }
  if (content.includes('href="/register"')) {
    content = content.replace(/href="\/register"/g, 'href="./register/"');
    modified = true;
  }
  if (content.includes('href="/settings"')) {
    content = content.replace(/href="\/settings"/g, 'href="./settings/"');
    modified = true;
  }
  if (content.includes('href="/watchlist"')) {
    content = content.replace(/href="\/watchlist"/g, 'href="./watchlist/"');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.html')) {
      processFile(fullPath);
    }
  }
}

console.log('🔧 Fixing paths for file:// protocol...');
processDirectory(outDir);
console.log('✅ Done!');
