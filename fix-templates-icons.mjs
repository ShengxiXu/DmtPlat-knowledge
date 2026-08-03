#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const templateFile = path.resolve('./src/data/templates.js');
let content = fs.readFileSync(templateFile, 'utf8');

const iconReplacements = {
  'message-square': 'message',
  'bar-chart-2': 'chart-bar',
  'graduation-cap': 'graduation-cap',
  megaphone: 'bullhorn',
  landmark: 'building-columns',
  hospital: 'hospitals',
  'shopping-cart': 'cart',
};

Object.entries(iconReplacements).forEach(([oldIcon, newIcon]) => {
  const regex = new RegExp(`icon: '${oldIcon}'`, 'g');
  content = content.replace(regex, `icon: '${newIcon}'`);
  console.log(`Replaced: ${oldIcon} -> ${newIcon}`);
});

fs.writeFileSync(templateFile, content, 'utf8');
console.log('Done fixing template icons!');
