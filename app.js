import {shareId} from './protocol.js';
import {parsePacket,mapInputs,INPUT_TIMEOUT_MS} from './mapping.js?v=7';
import {initMappings,getRules,testSamples,showResult} from './mapping-ui.js?v=7';
const $=id=>document.getElementById(id),frame=$('game');
let port,reader,reading=false,active=false,lastData=0,lastZone={},pressed=new Set(),manual=new Set(),loaded=false;
const source=()=>document.querySelector('[name=source]:checked').value;
// A WindowProxy permits indexed child-frame access across origins. Send directly
// to Arcade's simulator, rather than synthesizing keyboard events in another page.
function send(button,down){try{frame.contentWindow.frames[0]?.postMessage({type:'button-pressed',button,pressed:down},'*');}catch{}}
function keys(next){const n=new Set(next);for(const k of pressed)if(!n.has(k))send(k,false);for(const k of n)if(!pressed.has(k))send(k,true);pressed=n;}
function release(){keys([]);manual.clear();lastZone={};$('action').textContent='停止';}
function stop(){active=false;release();$('inputStatus').textContent='入力は停止中です。';}
let samples = Object.create(null);
function tick() {
  const result = mapInputs(getRules(),source()==='test'?testSamples():samples,lastZone);
  showResult(result,source()==='test',samples);
  if(!active||document.hidden)return;
  lastZone=result.states;
  keys([...manual,...result.keys]);
  $('action').textContent=pressed.size?[...pressed].map(k=>['A','B','↑','↓','←','→'][k]).join(' + '):'停止';
  $('inputStatus').textContent=result.errors.length?'設定に誤りがある入力は停止しています。':source()==='test'?'テスト入力中':Date.now()-lastData>=INPUT_TIMEOUT_MS?'データ待ち：入力を解除しました。':'センサー入力中';
}
initMappings(()=>{stop();samples=Object.create(null);tick();});
let loadTimer;
function load(params){stop();loaded=false;frame.onload=null;clearTimeout(loadTimer);frame.src='https://arcade.makecode.com/--run?'+Object.entries({...params,sendBuilt:'1',hideSimButtons:'1',single:'1'}).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');$('gameStatus').textContent='ゲームを準備しています…（初回は時間がかかります）';loadTimer=setTimeout(()=>{if(!loaded)$('gameStatus').textContent='読み込みに時間がかかっています。共有URLとネット接続を確認して再読み込みしてください。';},60000);}
$('load').onclick=()=>{try{load({id:shareId($('url').value)});}catch(e){$('gameStatus').textContent=e.message;}};
const demo=`scene.setBackgroundColor(9)
let player = sprites.create(img\`\n. . 2 2 2 2 . .\n. 2 2 2 2 2 2 .\n2 2 1 2 2 1 2 2\n2 2 2 2 2 2 2 2\n2 2 2 1 1 2 2 2\n. 2 2 2 2 2 2 .\n. . 2 . . 2 . .\n. 2 2 . . 2 2 .\n\`, SpriteKind.Player)
controller.moveSprite(player, 60, 60)
player.setStayInScreen(true)
controller.A.onEvent(ControllerButtonEvent.Pressed, function () { scene.setBackgroundColor(randint(1, 14)) })`;
$('sample').onclick=()=>{load({server:'1'});frame.onload=()=>{frame.contentWindow.postMessage({type:'simulateproject',project:{'main.ts':demo,'pxt.json':JSON.stringify({name:'Sensor test',dependencies:{device:'*'},files:['main.ts']})}},'https://arcade.makecode.com');frame.onload=null;};};
setInterval(()=>{try{if(!loaded&&frame.contentWindow.frames.length>0){loaded=true;$('gameStatus').textContent='ゲーム画面を確認して、入力を開始してください。';}}catch{}},1000);
window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.origin==='https://arcade.makecode.com'&&typeof e.data?.js==='string'){loaded=true;$('gameStatus').textContent='ゲームを読み込みました。入力を開始できます。';}});
$('testStart').textContent='入力を開始／再開';
$('testStart').onclick=()=>{if(!loaded){$('inputStatus').textContent='ゲームの読み込み完了を待ってください。';return;}if(source()==='usb'&&!reading){$('inputStatus').textContent='先にUSB接続してください。';return;}release();active=true;if(source()==='test')tick();else $('inputStatus').textContent='センサーのデータを待っています。';};
$('stop').onclick=stop;
document.querySelectorAll('[name=source]').forEach(el=>el.onchange=()=>{stop();samples=Object.create(null);if(source()==='usb'&&reading&&loaded){active=true;$('inputStatus').textContent='センサーのデータを待っています。';}});

document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{if(source()!=='test'||!loaded)return;e.preventDefault();b.setPointerCapture(e.pointerId);active=true;manual.add(Number(b.dataset.key));tick();};const up=()=>{manual.delete(Number(b.dataset.key));if(active&&source()==='test')tick();};b.onpointerup=up;b.onpointercancel=up;b.onlostpointercapture=up;});
setInterval(tick,10);
window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
$('connect').onclick=async()=>{if(!navigator.serial){$('serialStatus').textContent='Web Serial対応のChrome / Edgeで開いてください。';return;}$('connect').disabled=true;try{port=await navigator.serial.requestPort();await port.open({baudRate:115200});samples=Object.create(null);reading=true;reader=port.readable.getReader();$('disconnect').disabled=false;$('serialStatus').textContent='USB接続中（115200 bps）';document.querySelector('[value=usb]').checked=true;release();active=loaded;lastData=Date.now();let buffer='',decoder=new TextDecoder();while(reading){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);const packet=parsePacket(line);if(packet!==null&&source()==='usb'){lastData=Date.now();for(const [field,value] of Object.entries(packet)){const previous=samples[field];samples[field]={value,time:lastData,interval:previous?lastData-previous.time:null,count:(previous?.count??0)+1};}tick();}}if(buffer.length>4096)buffer='';}}catch(e){$('serialStatus').textContent=e.name==='NotFoundError'?'接続をキャンセルしました。':'接続できませんでした：'+e.message;}finally{reading=false;stop();reader?.releaseLock();reader=null;if(port){try{await port.close();}catch{}}port=null;$('connect').disabled=false;$('disconnect').disabled=true;if($('serialStatus').textContent.startsWith('USB接続中'))$('serialStatus').textContent='USB接続を終了しました。';}};
$('disconnect').onclick=async()=>{reading=false;await reader?.cancel();};


