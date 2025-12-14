const fs=require('fs');
const p='c:/Users/sjjue/OneDrive/Documents/ecowaste-1/app/projects/[id]/page.tsx';
const s=fs.readFileSync(p,'utf8');
const lines=s.split(/\r?\n/);
const targetLine=890;
let pos=0;
for(let i=0;i<targetLine-1;i++) pos+=lines[i].length+1;
// find first '(' after start of that line
const line = lines[targetLine-1];
const idx = line.indexOf('(');
if(idx<0){ console.log('no ( found on target line'); process.exit(0);} 
const startPos = pos + idx;
console.log('start at pos', startPos, 'line', targetLine, 'col', idx+1);
let depth=0;
for(let i=startPos;i<s.length;i++){
  const ch=s[i];
  if(ch==='"' || ch==="'" || ch==='`'){
    const q=ch; i++; while(i<s.length){ if(s[i]==='\\') { i+=2; continue; } if(s[i]===q) break; i++; }
    continue;
  }
  if(ch==='/' && s[i+1]==='*'){
    // skip block comment
    i+=2; while(i<s.length && !(s[i]==='*' && s[i+1]==='/')) i++; i+=1; continue;
  }
  if(ch==='(') depth++;
  if(ch===')') depth--;
  if(depth===0){
    console.log('matching ) at pos',i,'around line', (s.slice(0,i).split(/\r?\n/).length));
    const after = s.slice(i-40,i+40);
    console.log(after);
    process.exit(0);
  }
}
console.log('no matching ) found');
