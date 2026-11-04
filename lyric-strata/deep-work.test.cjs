/* Synthetic-only regression: never embed the author's private lyrics. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
let html='';
const el={get innerHTML(){return html},set innerHTML(x){html=x;}};
const sandbox={document:{addEventListener(){},getElementById(id){return id==='deepWorkOutput'?el:null;}},window:{},console:{warn(){}}};
vm.createContext(sandbox);
vm.runInContext(src,sandbox,{timeout:5000});
sandbox.fixture={
 reading_key:'fictional',work_id:'fictional-work',entry_id:null,title:'架空の歌<script>',
 opening_observation:'冒頭には悩みがある',turning_point:'ここで声が変わる',
 resolution_or_nonresolution:'問題はまだ残る',formal_mechanism:'同じ言葉の意味が変化',
 voice_and_address:'一人称と二人称',alternative_reading:'異なる読みもできる',
 reading_limit:'作者の意図は未確認',question:'なぜ結末は問いのままか',
 source_version_no:1,status:'provisional',
 anchors:[{quote:'これは架空の引用です',role:'冒頭'},{quote:'ここは架空の結末です',role:'終結'}]
};
vm.runInContext('user={id:"test-user"};deepWorkReadings=[fixture];masterWorks=new Map([["fictional-work",{id:"fictional-work",title:"架空の歌",sky:"rap"}]]);data=[];selectedDeepWork="fictional";renderDeepWorkReadings();',sandbox,{timeout:5000});
assert.match(html,/結末に残ること/);
assert.match(html,/異なる読み/);
assert.match(html,/決めつけてはいけないこと/);
assert.match(html,/data-cross-work/);
assert.equal((html.match(/class="deep-work-quote"/g)||[]).length,2);
assert.ok(!html.includes('<script>'),'escape title');
assert.match(html,/&lt;script&gt;/);
vm.runInContext('user=null;renderDeepWorkReadings();',sandbox,{timeout:5000});
assert.ok(!html.includes('これは架空の引用です'),'no private text while signed out');
console.log('deep-work regression passed: narrative arc, citations, escaping and signed-out gate');
