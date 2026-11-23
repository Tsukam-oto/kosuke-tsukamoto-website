/* Run: node rec-note/tests/short-clip-picker.test.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../short-clip-picker.js'),'utf8');
const context={window:{},document:{getElementById:()=>null}};
vm.runInNewContext(code,context,{filename:'short-clip-picker.js'});
const cues=[
 {i:0,start:20,end:28},{i:1,start:28,end:35},{i:2,start:35,end:47},
 {i:3,start:47,end:55},{i:4,start:55,end:80.8},
 {i:5,start:80.8,end:90},{i:6,start:90,end:118.5},
 {i:7,start:136.6,end:145},{i:8,start:145,end:164.1},
 {i:9,start:164.1,end:180},{i:10,start:180,end:205}
];
const first=context.shortPartFromCues(cues,['1番 サビ',80.79,118.53]);
const second=context.shortPartFromCues(cues,['2番 サビ',164.1,204.98]);
assert.equal(first.from,5);
assert.equal(first.end,118.5);
assert.equal(second.from,9);
assert.equal(second.end,205);
assert.notEqual(first.from,second.from);
assert.equal(context.shortPartFromCues([],['2番 Aメロ',140,166]),null);
assert.equal(context.shortPartFromCues([{i:0,start:3,end:4}],[ '1番',90,140]),null);
assert.match(code,/recnote:lyric-snapshot/);
assert.doesNotMatch(code,/\bpersist\s*\(/);
assert.doesNotMatch(code,/\blocalStorage\b/);
console.log('PASS short clip picker: first/second verse, missing data, read-only design');
