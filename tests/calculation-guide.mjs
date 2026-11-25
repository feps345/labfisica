import assert from 'node:assert/strict';
import { calculationSteps } from '../calculation-guide.mjs';
import { seriesModel } from '../series.mjs';
function guide(values, excitation='step') {
 const parts=Object.entries({V:5,...values}).map(([k,val])=>({id:k+'1',k,val}));
 const wires=parts.map((p,i)=>[p.id+':1',parts[(i+1)%parts.length].id+':0']);
 return calculationSteps(seriesModel(parts,wires),parts,'V1',60,excitation).join(' ');
}
assert.match(guide({R:100,C:100}), /3,161 V/);
assert.match(guide({R:100,L:100}), /31,61 mA/);
assert.match(guide({R:200,L:100,C:10}), /régimen es crítico/);
assert.match(guide({R:100,C:100},'pulse'), /0 V a los 30 ms/);
assert.match(calculationSteps(null,[{id:'V1',k:'V',val:5}],'V1',60,'step').join(' '), /No se ha identificado/);
