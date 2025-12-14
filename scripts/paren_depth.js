const fs=require('fs');
const p='c:/Users/sjjue/OneDrive/Documents/ecowaste-1/app/projects/[id]/page.tsx';
const s=fs.readFileSync(p,'utf8');
const lines=s.split(/\r?\n/);
let depthParen=0, depthBrace=0;
let maxParen=0, maxBrace=0; let maxParenLine=0, maxBraceLine=0;
for(let i=0;i<lines.length;i++){
  const line=lines[i];
  for(let j=0;j<line.length;j++){
    const ch=line[j];
    if(ch==='"' || ch==="'" || ch==='`'){
      const q=ch; j++; while(j<line.length){ if(line[j]==='\\') { j+=2; continue; } if(line[j]===q) break; j++; }
      continue;
    }
    if(ch==='/' && line[j+1]==='*'){
      // skip rest of comment in naive way
      j+=2; while(i<lines.length){ if(line.indexOf('*/',j)!==-1){ j=line.indexOf('*/',j)+1; break;} else { i++; if(i<lines.length) { line=lines[i]; j=-1;} else break;} }
      continue;
    }
    if(ch==='('){ depthParen++; if(depthParen>maxParen){maxParen=depthParen; maxParenLine=i+1;} }
    if(ch===')'){ depthParen--; }
    if(ch==='{'){ depthBrace++; if(depthBrace>maxBrace){maxBrace=depthBrace; maxBraceLine=i+1;} }
    if(ch==='}'){ depthBrace--; }
  }
}
console.log('final depths paren,brace',depthParen,depthBrace);
console.log('max depths paren,brace',maxParen,'at',maxParenLine, maxBrace,'at',maxBraceLine);
// print region around max lines
const show = (n)=>{
  const start = Math.max(1,n-5); const end=Math.min(lines.length,n+5);
  console.log('--- context around',n,'---');
  for(let i=start;i<=end;i++) console.log(i+':',lines[i-1]);
};
show(maxParenLine); show(maxBraceLine);
