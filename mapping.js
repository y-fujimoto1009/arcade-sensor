export const BUTTONS = [['','なし'],['2','↑'],['3','↓'],['4','←'],['5','→'],['0','A'],['1','B']];
export function parsePacket(line) {
  try {
    const packet = JSON.parse(line);
    if (!packet || Array.isArray(packet) || typeof packet !== 'object') return null;
    const entries = Object.entries(packet).filter(([name, value]) =>
      /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(name) &&
      (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))));
    return entries.length ? Object.fromEntries(entries) : null;
  } catch { return null; }
}
export function validRule(r) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(r.field)) return false;
  if (r.type === 'digital') return BUTTONS.some(([k]) => k === r.on);
  return r.type === 'analog' && Number.isFinite(r.low) && Number.isFinite(r.high) &&
    r.low < r.high && Number.isFinite(r.margin) && r.margin >= 0 &&
    r.margin <= (r.high-r.low)/2 &&
    [r.below,r.middle,r.above].every(v => BUTTONS.some(([k]) => k === v));
}
// Every channel expires independently, so updates from another sensor cannot
// keep a disconnected switch pressed. Shared output buttons are unioned.
export function mapInputs(rules, samples, previous = {}, now = Date.now()) {
  const keys = new Set(), states = {}, errors = [], values = {};
  for (const r of rules) {
    if (!validRule(r)) { errors.push(r.id); continue; }
    const sample = samples[r.field];
    if (!sample || now - sample.time > 1000) { values[r.id] = 'データ待ち'; continue; }
    const v = sample.value;
    let key = '';
    if (r.type === 'digital') {
      if (![true,false,0,1].includes(v)) { values[r.id] = '0 / 1を送ってください'; continue; }
      const on = v === true || v === 1;
      values[r.id] = on ? 'ON' : 'OFF';
      key = on ? r.on : '';
    } else {
      if (typeof v !== 'number' || !Number.isFinite(v) || (r.field === 'distance' && (v <= 0 || v > 2000))) {
        values[r.id] = '無効な値'; continue;
      }
      values[r.id] = String(v);
      let z = v < r.low ? 'below' : v >= r.high ? 'above' : 'middle';
      if (previous[r.id] === 'below' && v < r.low + r.margin) z = 'below';
      if (previous[r.id] === 'above' && v >= r.high - r.margin) z = 'above';
      states[r.id] = z;
      key = r[z];
    }
    if (key !== '') keys.add(Number(key));
  }
  return {keys:[...keys],states,errors,values};
}
