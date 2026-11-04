/* Synthetic fiction only. Never publish the author's actual lyric content. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
let markup='';
const output={get innerHTML(){return markup;},set innerHTML(s){markup=s;}};
const context={document:{getElementById(id){return id==='deepWorkOutput'?output:null;},addEventListener(){}},
window:{},console:{warn(){}}};
vm.createContext(context);vm.runInContext(code,context,{timeout:5000});
context.fixtures={
work:[{id:'fiction-1',sky:'rap',title:'架空の作品A',original_book_index:0},
      {id:'fiction-2',sky:'rap',title:'架空の作品B<script>',original_book_index:1}],
reading:{reading_key:'reading-1',work_id:'fiction-1',title:'架空の作品A',
 opening_observation:'始まり',turning_point:'途中',resolution_or_nonresolution:'終わり',
 formal_mechanism:'反復',voice_and_address:'架空の声',alternative_reading:'別解',
 reading_limit:'決めつけない',question:'なぜでしょう',anchors:[{quote:'架空の引用A',role:'根拠'}],source_version_no:1},
relation:{link_key:'fiction-pair',left_work_id:'fiction-1',right_work_id:'fiction-2',
 topic:'異なる答え',evidence_left:'架空の引用A',evidence_right:'架空の引用B',
 interpretation:'二つを比べる<script>bad</script>',alternative:'別の読み'}};
vm.runInContext('user={id:"owner"};masterWorks=new Map(fixtures.work.map(w=>[w.id,w]));'+
 'deepWorkReadings=[fixtures.reading];crossReadings=[fixtures.relation];selectedDeepWork="reading-1";data=[];renderDeepWorkReadings();',context,{timeout:5000});
assert.match(markup,/この作品から、ほかの作品へ（1組）/);
assert.match(markup,/data-cross-work="fiction-2"/);
assert.match(markup,/架空の引用A/);assert.match(markup,/架空の引用B/);
assert.ok(!markup.includes('<script>'),'Private/unsafe source must be escaped');
assert.match(markup,/&lt;script&gt;/);
vm.runInContext('user=null;deepWorkReadings=[];crossReadings=[];renderDeepWorkReadings();',context,{timeout:5000});
assert.ok(!markup.includes('架空の引用A'),'No comparison evidence when signed out');
assert.ok(!markup.includes('架空の作品B'),'No linked title when signed out');
console.log('related constellation passed: same-work links, evidence, escaping, logout privacy');
