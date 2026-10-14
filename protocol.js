export function shareId(value){
 let s=value.trim();
 if(s.startsWith('https://')){const u=new URL(s);if(!['arcade.makecode.com','makecode.com'].includes(u.hostname))throw Error('MakeCode Arcadeの共有URLを入力してください。');s=u.pathname.replace(/^\//,'').replace(/\/$/,'');}
 if(!/^(_[a-zA-Z0-9]+|S?\d{5}-\d{5}-\d{5}-\d{5})$/.test(s))throw Error('共有URLの形式を確認してください。');return s;
}
export function parseLine(line){try{const x=JSON.parse(line);return typeof x?.distance==='number'&&Number.isFinite(x.distance)&&x.distance>0&&x.distance<=2000?x.distance:null;}catch{return null;}}
export function zone(d,near,far,old){if(!Number.isFinite(near)||!Number.isFinite(far)||near<1||far>2000||near>=far)return 'invalid';if(old==='near'&&d<near+10)return 'near';if(old==='far'&&d>far-10)return 'far';return d<near?'near':d>far?'far':'middle';}
