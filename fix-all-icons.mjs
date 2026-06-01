#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const iconMapping = {
  'file-text': 'file-lines',
  'message-square': 'message',
  'settings': 'gear',
  'layout-grid': 'grid',
  'inbox': 'inbox',
  'lightbulb': 'lightbulb',
  'share-alt': 'share-nodes',
  'flame': 'fire-flame-curved',
  'book-open': 'book-open',
  'chevron-down': 'chevron-down',
  'chevron-right': 'chevron-right',
  'search': 'magnifying-glass',
  'moon': 'moon',
  'phone': 'phone',
  'sun': 'sun',
  'refresh': 'rotate-right',
  'star': 'star',
  'folder-open': 'folder-open',
  'file-lines': 'file-lines',
  'message': 'message',
  'gear': 'gear',
  'palette': 'palette',
  'x': 'xmark',
  'play': 'play',
  'target': 'bullseye',
  'bar-chart': 'chart-bar',
  'link': 'link',
  'sliders': 'sliders',
  'eye': 'eye',
  'trash-can': 'trash-can',
  'clock': 'clock',
  'globe': 'globe',
  'square': 'square',
  'plug': 'plug',
  'save': 'floppy-disk',
  'download': 'download',
  'plus': 'plus',
  'pencil': 'pencil',
  'brain': 'brain',
  'hashtag': 'hashtag',
  'user': 'user',
  'copy': 'copy',
  'robot': 'robot',
  'database': 'database',
  'help-circle': 'circle-question',
  'info': 'circle-info',
  'layers': 'layer-group',
  'zap': 'zap',
  'video': 'video',
};

const srcDir = path.resolve('./src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  Object.entries(iconMapping).forEach(([oldIcon, newIcon]) => {
    const regex = new RegExp(`fa-${oldIcon}([^a-zA-Z0-9-])`, 'g');
    const newContent = content.replace(regex, `fa-${newIcon}$1`);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
  return modified;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      callback(filePath);
    }
  });
}

console.log('Fixing all icons...');
let totalUpdated = 0;
walkDir(srcDir, (filePath) => {
  if (processFile(filePath)) {
    totalUpdated++;
  }
});

console.log(`Done! Updated ${totalUpdated} files.`);
