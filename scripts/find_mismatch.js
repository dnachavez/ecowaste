const fs = require('fs');
const p = 'c:/Users/sjjue/OneDrive/Documents/ecowaste-1/app/projects/[id]/page.tsx';
const s = fs.readFileSync(p,'utf8');
const stack = [];
const lines = s.split(/\r?\n/);
for(let i=0, pos=0;i<lines.length;i++){
  const line = lines[i];
  for(let j=0;j<line.length;j++,pos++){
    const ch = line[j];
    if(ch==='"' || ch==="'" || ch==='`'){
      // skip string
      const quote = ch; j++;
      while(j<line.length){ if(line[j] === '\\') { j+=2; continue; } if(line[j] === quote) { break; } j++; }
      continue;
    }
    // skip single line comment
    if(ch === '/' && line[j+1] === '/') break;
    // handle start of block comment
    if(ch === '/' && line[j+1] === '*'){
      // find end
      let found=false;
      let ii=i, jj=j+2;
      while(ii<lines.length){
        const l = lines[ii];
        for(;jj<l.length;jj++){
          if(l[jj] === '*' && l[jj+1] === '/') { found=true; break; }
        }
        if(found){ j = jj+1; i = ii; break; }
        ii++; jj=0;
      }
      continue;
    }
    if(ch === '(' || ch === '{' || ch === '[') stack.push({ch,line:i+1,col:j+1});
    if(ch === ')' || ch === '}' || ch === ']'){
      const last = stack[stack.length-1];
      if(!last){ console.log('Unmatched closing', ch, 'at', i+1, j+1); process.exit(0); }
      const match = (last.ch==='(' && ch===')') || (last.ch==='{' && ch==='}') || (last.ch==='[' && ch===']');
      if(match) stack.pop(); else { console.log('Mismatched', last.ch, 'vs', ch, 'opened at', last.line, last.col, 'closed at', i+1, j+1); process.exit(0); }
    }
  }
}
if(stack.length) {
  console.log('Unclosed openings (full):');
  console.log(stack);
} else console.log('All matched');
