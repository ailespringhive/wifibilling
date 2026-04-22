import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const replacements = [
  { from: /CollectorApp/g, to: 'TechnicianApp' },
  { from: /collector_app/g, to: 'technician_app' },
  { from: /WiFi Collector/g, to: 'WiFi Technician' },
  { from: /Collector Profile/g, to: 'Technician Profile' },
  { from: /Collector Login/g, to: 'Technician Login' },
  { from: /'collector'/g, to: "'technician'" },
  { from: /"collector"/g, to: '"technician"' },
  { from: /collectors only/g, to: 'technicians only' },
  { from: /Collector Dashboard/g, to: 'Technician Dashboard' },
  { from: /collector@demo\.com/g, to: 'technician@demo.com' },
  { from: /demo_collector/g, to: 'demo_technician' },
  { from: /'Collector'/g, to: "'Technician'" },
  { from: /CollectorNotification/g, to: 'TechnicianNotification' },
  { from: /Collector \?\?/g, to: 'Technician ??' }
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'build' && file !== 'node_modules') {
        results = results.concat(walk(filePath));
      }
    } else {
      if (filePath.endsWith('.dart') || filePath.endsWith('.yaml') || filePath.endsWith('.kt') || filePath.endsWith('.xml') || filePath.endsWith('.gradle.kts')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk(__dirname);
let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  for (const {from, to} of replacements) {
    content = content.replace(from, to);
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
}

console.log(`Replaced strings in ${changedCount} files.`);
