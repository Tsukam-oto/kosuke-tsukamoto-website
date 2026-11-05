/* Synthetic audit data only. No unpublished lyrics or personal source text. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const sandbox={document:{addEventListener(){}},window:{},console:{warn(){}}};
vm.createContext(sandbox);vm.runInContext(app,sandbox,{timeout:5000});
sandbox.works=[
 {id:'a',sky:'rap',title:'架空の作品A',original_book_index:0,source_page_start:2,
 source_review_note:'原文校正待ち\nPDF一次照合2026-11-05：PDF文字層と保存本文は空白・改行・NFKC正規化後に一致。'},
 {id:'b',sky:'rap',title:'架空の作品B<script>',original_book_index:1,source_page_start:3,
 source_review_note:'原文校正待ち\nPDF一次照合2026-11-05：差異あり [記号欠落候補] p.3：欠落候補<script>alert(1)</script>。原文は未変更。'},
 {id:'c',sky:'choir',title:'架空の合唱曲',original_book_index:null,
 source_review_note:'PDF一次照合2026-11-05：差異あり。'}
];
vm.runInContext('user={id:"owner"};masterWorks=new Map(works.map(w=>[w.id,w]));globalThis.ownerView=sourceAuditPanel();',sandbox,{timeout:5000});
assert.match(sandbox.ownerView,/1 \/ 2/);
assert.match(sandbox.ownerView,/PDF一次監査で差異が見つかった1作品の処理履歴/);
assert.match(sandbox.ownerView,/PDF 3ページ/);
assert.match(sandbox.ownerView,/&lt;script&gt;/);
assert.ok(!sandbox.ownerView.includes('<script>'),'Private notes must be HTML escaped');
assert.ok(!sandbox.ownerView.includes('架空の合唱曲'),'Only rap titles included');
vm.runInContext('user=null;globalThis.outView=sourceAuditPanel();',sandbox,{timeout:5000});
assert.match(sandbox.outView,/本人ログイン後/);
assert.ok(!sandbox.outView.includes('架空の作品B'),'No private audit data signed out');
console.log('PDF audit panel passed: scoped owner-only notes, totals and HTML escaping');
