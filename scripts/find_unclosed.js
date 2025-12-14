const fs = require('fs');
const p = 'c:/Users/sjjue/OneDrive/Documents/ecowaste-1/app/projects/[id]/page.tsx';
const s = fs.readFileSync(p,'utf8');
let state = null; // " or ' or `
let startPos = -1;
for (let i = 0; i < s.length; i++){
  const ch = s[i];
  if(state){
    if(ch === '\\') { i++; continue; } // skip escaped
    if(ch === state){ state = null; }
  } else {
    if(ch === '"' || ch === "'" || ch === '`') {
      state = ch; startPos = i;
    }
  }
}
if(state){
  const before = s.slice(Math.max(0,startPos-40), startPos+40).replace(/\n/g,'\\n');
  console.log('Unclosed quote', state, 'started near pos', startPos, 'context:', before);
} else {
  console.log('No unclosed quotes found');
}
// Also check for unclosed /* comments
const m1 = s.indexOf('/*');
if(m1>=0){
  const m2 = s.indexOf('*/', m1+2);
  if(m2<0) console.log('Unclosed /* comment starting near',m1);
  else console.log('All /* comments closed');
} else console.log('No /* comments');
// Also check for unclosed parentheses/braces/brackets counts
const counts = { '(':0, ')':0, '{':0, '}':0, '[':0, ']':0 };
for(const ch of s){ if(counts.hasOwnProperty(ch)) counts[ch]++; }
console.log('counts:',counts);
