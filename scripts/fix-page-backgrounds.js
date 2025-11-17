#!/usr/bin/env node

/**
 * Script to fix page backgrounds across all HTML files
 * Ensures all pages have light grey background (bg-slate-100) instead of white
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join } from 'path';

const publicDir = join(process.cwd(), 'public');
const htmlFiles = glob.sync('**/*.html', { cwd: publicDir });

const backgroundFixes = [
  // Replace white backgrounds with light grey
  { from: /class="bg-white"/g, to: 'class="bg-slate-100"' },
  { from: /class='bg-white'/g, to: "class='bg-slate-100'" },
  { from: /bg-white\s/g, to: 'bg-slate-100 ' },
  
  // Fix bg-gray-50 to bg-slate-100 for consistency
  { from: /class="bg-gray-50"/g, to: 'class="bg-slate-100"' },
  { from: /class='bg-gray-50'/g, to: "class='bg-slate-100'" },
  
  // Ensure body has light grey background
  { from: /<body class="([^"]*)bg-white([^"]*)">/g, to: '<body class="$1bg-slate-100$2">' },
  { from: /<body class="([^"]*)bg-gray-50([^"]*)">/g, to: '<body class="$1bg-slate-100$2">' },
];

console.log(`Found ${htmlFiles.length} HTML files to process...`);

let fixedCount = 0;

for (const file of htmlFiles) {
  const filePath = join(publicDir, file);
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Skip index.html (landing page has special styling)
  if (file === 'index.html') {
    continue;
  }
  
  // Apply fixes
  for (const fix of backgroundFixes) {
    if (fix.from.test(content)) {
      content = content.replace(fix.from, fix.to);
      modified = true;
    }
  }
  
  // Ensure body has bg-slate-100 if it doesn't have a background class
  if (!content.includes('bg-slate-100') && !content.includes('bg-gradient') && content.includes('<body')) {
    content = content.replace(
      /<body([^>]*)>/,
      (match, attrs) => {
        if (!attrs.includes('class=')) {
          return `<body class="bg-slate-100"${attrs}>`;
        } else if (!attrs.includes('bg-')) {
          return `<body${attrs.replace(/class="([^"]*)"/, 'class="$1 bg-slate-100"')}>`;
        }
        return match;
      }
    );
    modified = true;
  }
  
  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed: ${file}`);
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} files.`);

