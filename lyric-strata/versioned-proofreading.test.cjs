/* Synthetic content only: never embed the owner's private lyrics. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
let markup='';
const output={get innerHTML(){return markup;},set innerHTML(v){markup=v;}};
const events={};
const ctx={document:{getElementById(id){return id==='deepWorkOutput'?output:null;},
 addEventListener(name,fn){events[name]=fn;}},window:{},console:{warn(){}}};
vm.createContext(ctx);vm.runInContext(code,ctx,{timeout:5000});
ctx.fake={
 work:{id:'w1',title:'架空の歌<script>',sky:'rap',source_page_start:7,original_book_index:0,
  source_review_note:'原文校正待ち\nPDF一次照合2026-11-05：差異あり [文字抜け] p.7。原文は未変更。\n【部分校正2026-11-05】修復済み'},
 work2:{id:'w2',title:'未修復の架空作品',sky:'rap',source_page_start:8,original_book_index:1,
  source_review_note:'原文校正待ち\nPDF一次照合2026-11-05：差異あり [記号差] p.8。原文は未変更。'},
 reading:{reading_key:'fiction-r1',work_id:'w1',entry_id:null,title:'架空の歌',
 opening_observation:'始まり',turning_point:'途中',resolution_or_nonresolution:'結末',formal_mechanism:'構造',
 voice_and_address:'語り',alternative_reading:'反例',reading_limit:'未確定',question:'問い',
 anchors:[{quote:'架空の本文',role:'架空の引用'}],source_version_no:1,status:'provisional'},
 relation:{link_key:'fiction-cross',left_work_id:'w1',right_work_id:'w2',left_source_version:1,right_source_version:1}
};
vm.runInContext(
 'user={id:"owner"};masterWorks=new Map([[fake.work.id,fake.work],[fake.work2.id,fake.work2]]);'+
 'latestWorkVersions=new Map([["w1",2],["w2",1]]);deepWorkReadings=[fake.reading];selectedDeepWork="fiction-r1";'+
 'crossReadings=[];data=[];renderDeepWorkReadings();globalThis.audit=sourceAuditPanel();'+
 'globalThis.crossWarn=crossVersionWarning(fake.relation);',ctx,{timeout:5000});
assert.match(markup,/原文 v1 より新しい保存本文 v2/);
assert.match(ctx.audit,/部分校正v2保存は 1 件/);
assert.match(ctx.audit,/未修復・要確認は 1 件/);
assert.match(ctx.audit,/data-audit-history="w1"/);
assert.match(ctx.audit,/data-cross-work="w1"/);
assert.ok(!ctx.audit.includes('<script>'),'Audit title must escape HTML');
assert.match(ctx.audit,/&lt;script&gt;/);
assert.match(ctx.crossWarn,/旧版に基づく引用/);
vm.runInContext('user=null;latestWorkVersions=new Map();globalThis.outAudit=sourceAuditPanel();'+
 'renderDeepWorkReadings();globalThis.outWarning=sourceVersionWarning("w1",1);',ctx,{timeout:5000});
assert.ok(!ctx.outAudit.includes('未修復の架空作品'));
assert.ok(!markup.includes('架空の本文'));
assert.equal(ctx.outWarning,'');
console.log('versioned proofreading passed: audit counts, old-version warnings, history link, escaping, logout');
