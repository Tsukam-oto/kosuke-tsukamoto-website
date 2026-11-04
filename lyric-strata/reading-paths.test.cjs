/* Synthetic regression. Never embed the author's private lyrics in tests. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const sandbox={document:{addEventListener(){}},window:{},console:{warn(){}}};
vm.createContext(sandbox);
vm.runInContext(js,sandbox,{timeout:5000});
sandbox.__fixture={
 thread_key:'morning-promise',title:'朝<script>alert("x")</script>',guiding_question:'同じ言葉は？',
 core_hypothesis:'短い<strong>仮説</strong>',formal_mechanism:'引用と反復',
 central_tension:'対立がある',counterreading:'別の読みもある',
 inference_limit:'作者の意図は未確定',next_inquiry:'何を読み取れるか',
 anchors:[
  {kind:'note',source_id:'draft1',quote:'架空の長い原文の引用です',technique:'反復',observation:'語の繰り返し'},
  {kind:'work',source_id:'song1',quote:'架空の合唱曲の別の引用',technique:'対句',observation:'語りの対称性'}
 ]
};
vm.runInContext('user={id:"test"};readingPaths=[__fixture];masterWorks=new Map([["song1",{id:"song1",title:"架空の歌",sky:"choir"}]]);data=[{id:"draft1",source_id:"draft1",title:"架空のメモ",original_text:"これは架空の長い原文の引用です"}];selectedReadingPath="morning-promise";globalThis.__logged=readingPathsPanel();user=null;globalThis.__loggedOut=readingPathsPanel();',sandbox,{timeout:5000});
const logged=sandbox.__logged;
assert.match(logged,/読みの中心/);
assert.match(logged,/この読みへの反例/);
assert.match(logged,/決めつけてはいけないこと/);
assert.match(logged,/data-cross-note/);
assert.match(logged,/data-cross-work/);
assert.equal((logged.match(/class="reading-path-evidence"/g)||[]).length,2);
assert.ok(!logged.includes('<script>'),'UI must escape source titles');
assert.ok(!logged.includes('<strong>仮説</strong>'),'UI must escape content hypotheses');
assert.match(logged,/&lt;script&gt;/);
assert.match(sandbox.__loggedOut,/本人専用/);
assert.ok(!sandbox.__loggedOut.includes('架空の長い原文の引用です'));
console.log('reading-paths regression passed: quote links, counterreading and sign-out gate');
