import React, { useEffect, useRef, useState } from 'react'

const KEYS = [
  { label: 'C', action: 'clear', variant: 'muted' },
  { label: '⌫', action: 'backspace', variant: 'muted' },
  { label: '%', action: '%', variant: 'muted' },
  { label: '÷', action: '/', variant: 'operator' },
  { label: '7', action: '7' },
  { label: '8', action: '8' },
  { label: '9', action: '9' },
  { label: '×', action: '*', variant: 'operator' },
  { label: '4', action: '4' },
  { label: '5', action: '5' },
  { label: '6', action: '6' },
  { label: '-', action: '-', variant: 'operator' },
  { label: '1', action: '1' },
  { label: '2', action: '2' },
  { label: '3', action: '3' },
  { label: '+', action: '+', variant: 'operator' },
  { label: '( ', action: '(', variant: 'muted' },
  { label: ' )', action: ')', variant: 'muted' },
  { label: '+/−', action: 'toggleSign', variant: 'muted' },
  { label: '=', action: '=', variant: 'equals' },
  { label: '0', action: '0', className: 'col-span-2' },
  { label: '.', action: '.' },
]

function isDigit(ch){return /[0-9]/.test(ch)}

function tokenize(expr){
  const tokens=[]; let i=0;
  while(i<expr.length){
    const ch=expr[i];
    if(ch===' '){i++;continue}
    if(isDigit(ch)||ch==='.'){
      let num=ch; i++;
      while(i<expr.length && (isDigit(expr[i])||expr[i]==='.')) num+=expr[i++];
      tokens.push({type:'num',value:parseFloat(num)}); continue;
    }
    if('+-*/()%'.includes(ch)||ch==='('||ch===')'){
      tokens.push({type:'op',value:ch}); i++; continue;
    }
    i++;
  }
  return tokens;
}

function normalizeUnary(tokens){
  const out=[]; let prev=null;
  for(let i=0;i<tokens.length;i++){
    const t=tokens[i];
    if(t.type==='op' && t.value==='-' && (!prev || (prev.type==='op' && prev.value!==')'))){
      out.push({type:'num',value:0}); out.push({type:'op',value:'-'});
    } else out.push(t);
    if(t.type==='num' || (t.type==='op' && (t.value===')'||t.value==='%' ))) prev=t; else if(t.type==='op') prev=t; else prev=t;
  }
  return out;
}

function toRPN(tokens){
  const output=[]; const stack=[]; const prec={'+':1,'-':1,'*':2,'/':2,'%':3};
  const isLeft=(op)=>op!=='%';
  for(const t of tokens){
    if(t.type==='num'){output.push(t); continue}
    const op=t.value;
    if(op==='('){stack.push(op); continue}
    if(op===')'){
      while(stack.length && stack[stack.length-1] !== '(') output.push({type:'op',value:stack.pop()});
      if(stack.length&&stack[stack.length-1]==='(') stack.pop(); else throw new Error('Mismatched parentheses');
      continue;
    }
    if(op==='%'){ output.push({type:'op',value:'%'}); continue }
    while(stack.length && stack[stack.length-1] !== '(' && ((isLeft(op)&&prec[op]<=prec[stack[stack.length-1]])||(!isLeft(op)&&prec[op]<prec[stack[stack.length-1]]))){
      output.push({type:'op',value:stack.pop()});
    }
    stack.push(op);
  }
  while(stack.length){
    const op=stack.pop(); if(op==='('||op===')') throw new Error('Mismatched parentheses');
    output.push({type:'op',value:op});
  }
  return output;
}

function evalRPN(rpn){
  const s=[];
  for(const t of rpn){
    if(t.type==='num'){s.push(t.value); continue}
    const op=t.value;
    if(op==='%'){ if(s.length<1) throw new Error('Invalid %'); const a=s.pop(); s.push(a/100); continue }
    if(s.length<2) throw new Error('Invalid expression');
    const b=s.pop(); const a=s.pop();
    switch(op){
      case '+': s.push(a+b); break;
      case '-': s.push(a-b); break;
      case '*': s.push(a*b); break;
      case '/': s.push(b===0?NaN:a/b); break;
      default: throw new Error('Unknown op');
    }
  }
  if(s.length!==1) throw new Error('Invalid expression');
  return s[0];
}

function safeEvaluate(expr){
  if(!expr) return '';
  try{
    const r=evalRPN(toRPN(normalizeUnary(tokenize(expr))));
    if(!isFinite(r)) return 'Error';
    const rounded=Math.round((r+Number.EPSILON)*1e12)/1e12;
    return rounded.toString();
  }catch(e){ return 'Error' }
}

export default function App(){
  const [expr,setExpr]=useState('');
  const [ans,setAns]=useState('');
  const inputRef=useRef(null);
  const [pressed, setPressed] = useState(null);

  function triggerFlash(action) {
  // reset nhanh để có thể bấm cùng 1 phím liên tiếp vẫn thấy animation
  setPressed(null);
  // Đợi 1 frame rồi set action để chắc chắn animation được re-trigger
  requestAnimationFrame(() => {
    setPressed(action);
    setTimeout(() => setPressed(null), 50); // khớp với thời gian trong CSS
  });
}

 useEffect(() => {
  const onKey = (e) => {
    const k = e.key;

    if (k === 'Enter') { 
      e.preventDefault(); 
      triggerFlash('='); 
      onEquals(); 
      return; 
    }
    if (k === 'Backspace') { 
      e.preventDefault(); 
      triggerFlash('backspace'); 
      onBackspace(); 
      return; 
    }
    if (k === 'Escape') { 
      e.preventDefault(); 
      triggerFlash('clear'); 
      onClear(); 
      return; 
    }
    if (/[0-9.+\-*/()%]/.test(k)) {
      e.preventDefault(); 
      triggerFlash(k);     // ví dụ '7', '+', '(', ')', '%', ...
      append(k); 
      return; 
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [expr]);
  function append(s){
    if(s==='.'){
      const last=expr.split(/[^0-9.]/).pop();
      if(last.includes('.')) return;
    }
    setExpr((x)=>(x+s).replace(/\s+/g,''));
  }
  function onClear(){ setExpr(''); setAns('') }
  function onBackspace(){ setExpr((x)=>x.slice(0,-1)) }
  function onEquals(){ setAns(safeEvaluate(expr)) }
  function onToggleSign(){
    if(!expr) return;
    let i=expr.length-1; while(i>=0 && /[0-9.]/.test(expr[i])) i--; const start=i+1; const num=expr.slice(start); if(!num) return;
    const before=expr.slice(0,start);
    if(num.startsWith('-')) setExpr(before+num.slice(1)); else setExpr(before+'-'+num);
  }
  function handlePress(k){ if(k==='clear') return onClear(); if(k==='backspace') return onBackspace(); if(k==='toggleSign') return onToggleSign(); if(k==='=') return onEquals(); return append(k) }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-zinc-100">
      <div className="w-full max-w-sm rounded-2xl shadow-xl bg-white border border-zinc-200">
        <div className="p-4 sm:p-6">
         
          <div className="rounded-xl bg-zinc-50 p-4 mb-4 flex flex-col gap-1">
            <input
              ref={inputRef}
              value={expr}
              onChange={(e)=>setExpr(e.target.value.replace(/\s+/g,''))}
              placeholder="Type an expression…"
              className="w-full bg-transparent outline-none text-right text-2xl md:text-3xl tracking-tight"
            />
            <div className="text-right text-zinc-500 text-sm">Ans</div>
            <div className="text-right text-3xl md:text-4xl font-semibold tabular-nums break-all">{ans||'0'}</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {KEYS.map((k, i)=> (
             <button
  key={i}
  onClick={() => { triggerFlash(k.action); handlePress(k.action); }}
  className={
    `h-14 rounded-2xl text-lg font-medium shadow-sm transition 
     active:scale-95 ${k.className || ''} ` +
    (k.variant === 'operator'
      ? 'bg-zinc-100 hover:bg-zinc-200'
      : k.variant === 'equals'
      ? 'col-span-1 bg-zinc-900 text-white hover:bg-black'
      : k.variant === 'muted'
      ? 'bg-zinc-50 hover:bg-zinc-100'
      : 'bg-white border border-zinc-200 hover:bg-zinc-50')
    + (pressed === k.action ? ' animate-click' : '')
  }
>
  {k.label}
</button>
            ))}
          </div>
          <div className="mt-4 text-xs text-zinc-500 leading-relaxed">
           
          </div>
        </div>
      </div>
    </div>
  )
}