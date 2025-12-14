const fs = require('fs');
const p = 'c:/Users/sjjue/OneDrive/Documents/ecowaste-1/app/projects/[id]/page.tsx';
const s = fs.readFileSync(p, 'utf8');
const bt = (s.match(/`/g) || []).length;
const lines = s.split(/\r?\n/);
let suspect = [];
for (let i = 0; i < lines.length; i++) {
  if (/^[ \t]*\/[\w\*]/.test(lines[i])) suspect.push({ line: i + 1, text: lines[i].slice(0, 200) });
}
console.log('backticks:', bt);
console.log('total lines:', lines.length);
if (suspect.length) {
  console.log('suspicious lines starting with / :');
  console.log(suspect.slice(0, 20));
} else {
  console.log('no suspicious leading slash lines found');
}
// Print a snippet around the reported error line 1561
const errLine = 1561;
const start = Math.max(1, errLine - 10);
const end = Math.min(lines.length, errLine + 10);
console.log('--- Context around line', errLine, '---');
for (let i = start; i <= end; i++) {
  console.log(i + ':', lines[i - 1]);
}
