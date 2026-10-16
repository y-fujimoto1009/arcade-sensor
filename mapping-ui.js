import {BUTTONS,validRule} from './mapping.js';
const host = document.getElementById('rules');
const defaults = [
  {id:'distance',field:'distance',type:'analog',low:100,high:250,margin:10,below:'4',middle:'',above:'5',test:170},
  {id:'buttonA',field:'buttonA',type:'digital',on:'0',test:false}
];
let rules = structuredClone(defaults), onChange = () => {};
try { const saved = JSON.parse(localStorage.getItem('arcade-sensor-rules-v1')); if(Array.isArray(saved)&&saved.length&&saved.length<=12&&saved.every(validRule)&&new Set(saved.map(r=>r.id)).size===saved.length) rules=saved; } catch {}
const picker = (value, field, label) => `<label>${label}<select data-prop="${field}">${BUTTONS.map(([k,n])=>`<option value="${k}" ${k===value?'selected':''}>${n}</option>`).join('')}</select></label>`;
const number = (value, field, label) => `<label>${label}<input data-prop="${field}" type="number" step="any" value="${value}"></label>`;
function save() { try {localStorage.setItem('arcade-sensor-rules-v1',JSON.stringify(rules.map(({element,...r})=>({...r,test:r.type==='digital'?false:r.test}))));} catch {} }
function render() {
  host.replaceChildren();
  rules.forEach((r,i)=>{
    const el=document.createElement('fieldset');
    el.className='rule';
    el.innerHTML=`<legend>入力 ${i+1} · ${r.type==='analog'?'アナログ':'デジタル'}</legend>
      <div class="row"><label>入力名<input data-prop="field" maxlength="32"></label><button class="secondary remove" type="button">削除</button></div>
      ${r.type==='analog'?`<div class="row">${number(r.low,'low','境界1')}${number(r.high,'high','境界2')}</div><div class="row assignments">${picker(r.below,'below','境界1より小さい')}${picker(r.middle,'middle','境界1以上・境界2未満')}${picker(r.above,'above','境界2以上')}</div>${number(r.margin,'margin','境界の揺れを抑える幅（0で無効）')}`:picker(r.on,'on','ONのときに押すボタン')}
      <p class="ruleValue">現在値：<output>データ待ち</output></p>
      <p class="receiveStats note"></p>
      <label class="testControl">${r.type==='analog'?`テスト値<input data-test type="number" step="any">`:`<input data-test type="checkbox"> テストでONにする`}</label>
      <p class="ruleError" role="status"></p>`;
    el.querySelector('[data-prop=field]').value=r.field;
    const test=el.querySelector('[data-test]');
    if(r.type==='analog')test.value=Number.isFinite(r.test)?r.test:0; else test.checked=false;
    r.test=r.type==='analog'?Number(test.value):false;
    test.oninput=()=>{r.test=r.type==='analog'?Number(test.value):test.checked;};
    el.querySelectorAll('[data-prop]').forEach(input=>input.onchange=()=>{
      r[input.dataset.prop]=input.type==='number'?(input.value===''?NaN:Number(input.value)):input.value;
      save();onChange();
    });
    el.querySelector('.remove').onclick=()=>{rules=rules.filter(x=>x!==r);save();render();onChange();};
    r.element=el;host.append(el);
  });
}
export function initMappings(callback) {
  onChange=callback;render();
  for(const type of ['analog','digital'])document.getElementById('add-'+type).onclick=()=>{
    if(rules.length>=12)return;
    const id=crypto.randomUUID();
    rules.push(type==='analog'?{id,field:'analog'+(rules.length+1),type,low:100,high:250,margin:0,below:'',middle:'',above:'',test:170}:{id,field:'digital'+(rules.length+1),type,on:'',test:false});
    save();render();onChange();
  };
}
export function getRules(){return rules;}
export function testSamples(){return Object.fromEntries(rules.map(r=>[r.field,{value:r.test,time:Date.now()}]));}
function setText(el,text){if(el.textContent!==text)el.textContent=text;}
export function showResult(result,isTest,samples={}){
  for(const r of rules){
    setText(r.element.querySelector('output'),result.values[r.id]??'設定を確認');
    setText(r.element.querySelector('.ruleError'),result.errors.includes(r.id)?'入力名は英字で始まる半角英数字・_。境界1 < 境界2、揺れ幅は境界の差の半分以下にしてください。':'');
    r.element.querySelector('[data-test]').disabled=!isTest;
    const sample=samples[r.field];
    const age=sample?Math.floor((Date.now()-sample.time)/100)*100:null;
    setText(r.element.querySelector('.receiveStats'),isTest?'':sample?`受信 ${sample.count}回 · 前回との受信間隔 ${sample.interval===null?'—':sample.interval} ms · 最終受信から ${age} ms`:'まだ受信していません');
  }
}
