import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync('app.js','utf8');
const code=source.slice(source.indexOf('function send('),source.indexOf('\nfunction keys('));
const received=[[],[]];const frames=received.map(list=>({postMessage:(msg)=>list.push(msg)}));
const context={frame:{contentWindow:{frames}},console};vm.createContext(context);vm.runInContext(code,context);vm.runInContext('send(4,true);send(4,false);',context);
assert.equal(received[1].length,2,'simulator after helper iframe must receive both edges');
assert.equal(received[1][0].button,4);assert.equal(received[1][0].pressed,true);assert.equal(received[1][1].pressed,false);
console.log('Button routing reaches simulator even when another iframe precedes it');
// Some non-standard gamepads lack reset button 10. Arcade treats undefined as
// a release on every poll and repeatedly restarts; this bridge owns its inputs.
assert.match(readFileSync('index.html','utf8'), /gamepad 'none'/);
