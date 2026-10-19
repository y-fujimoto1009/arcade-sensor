import {BUTTONS} from './mapping.js?v=7';

export function modelBase(value) {
  const url = new URL(value.trim());
  if (url.origin !== 'https://teachablemachine.withgoogle.com' || !/^\/models\/[\w-]+\/(model\.json)?$/.test(url.pathname.endsWith('/') || url.pathname.endsWith('model.json') ? url.pathname : url.pathname + '/')) throw new Error('Teachable MachineのモデルURLを入力してください。');
  return url.origin + url.pathname.replace(/model\.json$/, '').replace(/\/?$/, '/');
}
export function predictionKeys(predictions, assignments, threshold, age) {
  if (age >= 1000 || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) return [];
  const best = predictions.reduce((a,b)=>Number.isFinite(b.probability) && b.probability > (a?.probability ?? -1) ? b : a, null);
  const key = best && assignments.get(best.className);
  return best && best.probability >= threshold && BUTTONS.some(([v])=>v !== '' && v === key) ? [Number(key)] : [];
}
const scripts = new Map();
function script(url) {
  if (!scripts.has(url)) scripts.set(url, new Promise((resolve,reject)=>{
    const el=document.createElement('script'); el.src=url; el.onload=resolve;
    el.onerror=()=>{el.remove();scripts.delete(url);reject(new Error('ライブラリを読み込めません。ネット接続を確認してください。'));};
    document.head.append(el);
  }));
  return scripts.get(url);
}
export function initTM(onReset,onReady=()=>{}) {
  const $=id=>document.getElementById(id), canvas=$('tm-preview'), ctx=canvas.getContext('2d');
  const video=document.createElement('video'); video.muted=true; video.playsInline=true;
  let model, type, stream, generation=0, predictions=[], updated=0, running=false;
  const assignments=new Map(), rows=new Map();
  function stopCamera() {
    generation++; running=false; predictions=[]; updated=0;
    stream?.getTracks().forEach(track=>track.stop()); stream=null;
    video.pause(); video.srcObject=null; ctx.clearRect(0,0,canvas.width,canvas.height);
    $('tm-start').disabled=!model; $('tm-stop').disabled=true;
    rows.forEach(({meter,value})=>{meter.value=0;value.textContent='—';});
    $('tm-status').textContent=model?'カメラは停止中です。':'モデルを読み込んでください。';
    onReset();
  }
  function invalidate(){stopCamera();model?.dispose?.();model=null;assignments.clear();rows.clear();$('tm-classes').replaceChildren();$('tm-start').disabled=true;}
  $('tm-type').onchange=invalidate; $('tm-url').oninput=invalidate;
  $('tm-threshold').oninput=()=>{predictions=[];onReset();};
  $('tm-load').onclick=async()=>{
    invalidate(); const token=generation; $('tm-load').disabled=true;
    try {
      const base=modelBase($('tm-url').value), selected=$('tm-type').value;
      $('tm-status').textContent='モデルを読み込んでいます…';
      await script('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js');
      await script(`https://cdn.jsdelivr.net/npm/@teachablemachine/${selected}@0.8.3/dist/teachablemachine-${selected}.min.js`);
      const next=await (selected==='pose'?window.tmPose:window.tmImage).load(base+'model.json',base+'metadata.json');
      if(token!==generation){next.dispose?.();return;}
      model=next; type=selected;
      for(const name of model.getClassLabels()) {
        assignments.set(name,'');
        const row=document.createElement('label'), title=document.createElement('span'), select=document.createElement('select'), meter=document.createElement('progress'), value=document.createElement('span');
        row.className='tm-class';title.textContent=name;value.textContent='—';meter.max=1;meter.value=0;
        for(const [key,label] of BUTTONS){const option=document.createElement('option');option.value=key;option.textContent=label;select.append(option);}
        select.onchange=()=>{assignments.set(name,select.value);onReset();};
        row.append(title,select,meter,value);$('tm-classes').append(row);rows.set(name,{meter,value});
      }
      $('tm-start').disabled=false;$('tm-status').textContent='各クラスにボタンを割り当て、カメラを開始してください。';
    }catch(e){if(token===generation)$('tm-status').textContent='読み込み失敗：モデルの種類とURLを確認してください。 '+e.message;}
    finally{$('tm-load').disabled=false;}
  };
  $('tm-start').onclick=async()=>{
    stopCamera(); if(!model)return; const token=generation; $('tm-start').disabled=true;
    try {
      const next=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480},audio:false});
      if(token!==generation){next.getTracks().forEach(t=>t.stop());return;}
      stream=next;video.srcObject=stream;await video.play();if(token!==generation)return;
      running=true;$('tm-stop').disabled=false;onReady();
      stream.getVideoTracks()[0].onended=stopCamera;
      $('tm-status').textContent='認識中。ゲーム読み込み済みなら自動で入力を開始します。';
      async function loop(){
        if(token!==generation)return;
        try {
          const size=Math.min(video.videoWidth,video.videoHeight);
          ctx.save();ctx.translate(canvas.width,0);ctx.scale(-1,1);
          ctx.drawImage(video,(video.videoWidth-size)/2,(video.videoHeight-size)/2,size,size,0,0,canvas.width,canvas.height);ctx.restore();
          const input=type==='pose'?(await model.estimatePose(canvas)).posenetOutput:canvas;
          if(token!==generation)return;
          const result=await model.predict(input);if(token!==generation)return;
          predictions=result;updated=Date.now();
          for(const p of result){const row=rows.get(p.className);if(row){row.meter.value=p.probability;row.value.textContent=Math.round(p.probability*100)+'%';}}
          requestAnimationFrame(loop);
        }catch(e){if(token===generation){stopCamera();$('tm-status').textContent='認識を停止しました：'+e.message;}}
      }
      loop();
    }catch(e){if(token===generation){stopCamera();$('tm-status').textContent='カメラを開始できません：'+e.message;}}
  };
  $('tm-stop').onclick=stopCamera;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera();});
  window.addEventListener('pagehide',stopCamera);
  function status(){
    if(!updated || Date.now()-updated>=1000)return '認識結果を待っています。';
    const best=predictions.reduce((a,b)=>b.probability>(a?.probability??-1)?b:a,null);
    if(!best)return '認識結果を待っています。';
    const label=best.className+'（'+Math.round(best.probability*100)+'%）';
    if(best.probability<Number($('tm-threshold').value)/100)return label+'：確信度が下限未満です。';
    const assigned=assignments.get(best.className);
    return label+' → '+(BUTTONS.find(([key])=>key===assigned)?.[1]??'なし');
  }
  return {stopCamera,status,get running(){return running;},getKeys:()=>predictionKeys(predictions,assignments,Number($('tm-threshold').value)/100,Date.now()-updated)};
}
