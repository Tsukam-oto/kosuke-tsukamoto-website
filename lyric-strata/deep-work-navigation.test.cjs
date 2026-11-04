/* Synthetic metadata only. No private user lyrics may enter this test. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
let currentMarkup='';
const output={get innerHTML(){return currentMarkup;},set innerHTML(v){currentMarkup=v;}};
const events={};
const context={
 document:{getElementById(id){return id==='deepWorkOutput'?output:null;},addEventListener(type,callback){events[type]=callback;}},
 window:{},console:{warn(){}}
};
vm.createContext(context);
vm.runInContext(code,context,{timeout:5000});
function fixture(key,id,quote){
 return {reading_key:key,work_id:id,entry_id:null,title:'架空の精読：'+key,
 opening_observation:'冒頭は'+quote,turning_point:'途中で変わる',
 resolution_or_nonresolution:'結末は未解決',formal_mechanism:'反復と対照',
 voice_and_address:'語り手は架空',alternative_reading:'反例がある',
 reading_limit:'創作事実は不明',question:'なぜでしょうか',
 anchors:[{quote,role:'原文の引用'}],source_version_no:1,status:'provisional'};
}
context.fixtures=[
 fixture('rap0','work0','架空の一行0'),
 fixture('rap2','work2','架空の一行2'),
 fixture('choir','workC','架空の歌詞C')
];
context.workList=[
 {id:'work0',sky:'rap',title:'一番目の仮作品',original_book_index:0},
 {id:'work1',sky:'rap',title:'まだ精読していない作品',original_book_index:1},
 {id:'work2',sky:'rap',title:'三番目の仮作品',original_book_index:2},
 {id:'workC',sky:'choir',title:'架空の合唱曲',original_book_index:null}
];
vm.runInContext('user={id:"owner"};masterWorks=new Map(workList.map(w=>[w.id,w]));deepWorkReadings=fixtures;data=[];selectedDeepWork="rap0";renderDeepWorkReadings();',context,{timeout:5000});
assert.match(currentMarkup,/木乃伊の収録項目/);
assert.match(currentMarkup,/2 \/ 3/);
assert.match(currentMarkup,/1 \/ 1/);
assert.match(currentMarkup,/<optgroup label="木乃伊">/);
assert.match(currentMarkup,/<optgroup label="合唱曲">/);
assert.match(currentMarkup,/収録順 1/);
assert.match(currentMarkup,/収録順 3/);
assert.match(currentMarkup,/data-deep-step="-1" disabled/);
assert.match(currentMarkup,/data-deep-step="1"/);
assert.ok(!currentMarkup.includes('まだ精読していない作品'),'unread work must not be represented as read');
function clickStep(step){
 events.click({target:{closest(selector){return selector==='button[data-deep-step]'?{dataset:{deepStep:String(step)}}:null;}}});
}
clickStep(1);
assert.match(currentMarkup,/架空の精読：rap2/);
assert.match(currentMarkup,/2 \/ 3<\/span>/);
clickStep(1);
assert.match(currentMarkup,/架空の精読：choir/);
assert.match(currentMarkup,/data-deep-step="1" disabled/);
clickStep(-1);
assert.match(currentMarkup,/架空の精読：rap2/);
vm.runInContext('user=null;deepWorkReadings=[];deepWorkOrder=[];renderDeepWorkReadings();',context,{timeout:5000});
assert.ok(!currentMarkup.includes('架空の一行2'),'signed out must hide reading source');
console.log('deep-reading navigation passed: coverage, source order, grouping, next/previous and signed-out privacy');
