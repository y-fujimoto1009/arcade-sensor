import assert from 'node:assert/strict';
import {initTM} from './tm-input.js';
class Element {
 constructor(){this.value='';this.children=[];this.textContent='';this.disabled=false;this.width=300;this.height=300;this.videoWidth=640;this.videoHeight=480;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(){this.children=[];}
 getContext(){return {clearRect(){},save(){},translate(){},scale(){},drawImage(){},restore(){}};}
 pause(){} async play(){} remove(){}
}
const els=new Map();
globalThis.document={getElementById(id){if(!els.has(id))els.set(id,new Element());return els.get(id);},createElement(){return new Element();},addEventListener(){},head:{append(el){queueMicrotask(()=>el.onload());}}};
globalThis.window={addEventListener(){},tmImage:{async load(){return {getClassLabels:()=>['left','idle'],predict:async()=>[{className:'left',probability:.95},{className:'idle',probability:.05}]};}}};
let trackStopped=false;
Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{async getUserMedia(){return {getTracks:()=>[{stop(){trackStopped=true;}}],getVideoTracks:()=>[{}]};}}},configurable:true});
globalThis.requestAnimationFrame=()=>{};
let active=false,releases=0;
const tm=initTM(()=>releases++,()=>{active=true;});
const el=id=>document.getElementById(id);
el('tm-type').value='image';el('tm-url').value='https://teachablemachine.withgoogle.com/models/test/';el('tm-threshold').value='80';
await el('tm-load').onclick();
await el('tm-start').onclick();await new Promise(r=>setImmediate(r));
assert.equal(active,true);assert.equal(tm.running,true);
const select=el('tm-classes').children[0].children[1];select.value='4';select.onchange();
assert.equal(active,true,'changing assignment must not stop input');
assert.deepEqual(tm.getKeys(),[4]);assert.match(tm.status(),/left.*95%.*←/);
el('tm-threshold').value='99';el('tm-threshold').oninput();assert.equal(active,true);assert.deepEqual(tm.getKeys(),[]);
tm.stopCamera();assert.equal(trackStopped,true);assert.equal(tm.running,false);assert.deepEqual(tm.getKeys(),[]);
console.log('Camera lifecycle: auto-start, live remapping, threshold release and camera stop passed');
