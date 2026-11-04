/* Author-review regression: synthetic comments only, no private lyrics. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
require('./deep-reading.js');
const engine=globalThis.LyricCloseReading;
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const corpus=JSON.parse(html.match(/const OFFICIAL_SEED=(\[[^\n]+?\]);/)[1]).map(w=>({...w,sky:'choir',origin:'official'}));
assert.equal(corpus.length,11);
const helpers=html.slice(html.indexOf('const readingStances={'),html.indexOf('function load(){'));
const db={notes:{retained:'existing notes'},readingReviews:{},userWorks:[]};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saveOK=true,savedCalls=0;const messages=[];
const progress={textContent:''};
const doc={querySelector:()=>progress,createElement:()=>({dataset:{}})};
const runtime=new Function('db','corpus','engine','doc','messages','getSaveOK','recordSave','esc',[
 'const window={LyricCloseReading:engine};',
 'const sky="choir",selected=corpus[0].id;',
 'const works=()=>corpus,getWork=id=>corpus.find(w=>w.id===id);',
 'const document=doc,cloudUser=null;',
 'const save=()=>{recordSave();return getSaveOK()};',
 'const toast=x=>messages.push(x),confirm=()=>true;',
 helpers,
 'return {readingReviewKey,readingTextMarker,reviewIsChecked,cleanReadingReviews,readingReviewForm,readingReviewDashboard,saveReadingReview,clearReadingReview,getReadingReview};'
].join('\n'))(db,corpus,engine,doc,messages,()=>saveOK,()=>savedCalls++,esc);
assert.ok(runtime.readingReviewDashboard().includes('0 / 22テーマ'));
const spring=corpus.find(w=>w.title==='春にあふれて'),morning=corpus.find(w=>w.title==='朝になったら');
const d1=engine.analyze(spring,corpus).dialogues.find(d=>d.otherTitle==='朝になったら');
const d2=engine.analyze(morning,corpus).dialogues.find(d=>d.otherTitle==='春にあふれて');
const key=runtime.readingReviewKey(spring,'dialogue',d1.title,d1.otherId);
assert.equal(key,runtime.readingReviewKey(morning,'dialogue',d2.title,d2.otherId));
let clearButton=null;
const fake={
 '[data-reading-comment]':{value:'当時は別の意図で書きました。'},
 '[data-reading-stance]':{value:'different'},
 '.author-review-current':{textContent:''},
 '.author-review-save-state':{textContent:''},
 '.author-review-actions':{append(b){clearButton=b;}}
};
const holder={dataset:{sourceTag:runtime.readingTextMarker(spring,'dialogue',d1.otherId)},querySelector:q=>q==='[data-clear-reading]'?clearButton?{remove(){clearButton=null}}:null:fake[q]};
runtime.saveReadingReview(key,holder);
assert.equal(db.readingReviews[key].stance,'different');
assert.equal(db.readingReviews[key].comment,'当時は別の意図で書きました。');
assert.equal(db.notes.retained,'existing notes');
assert.ok(runtime.readingReviewDashboard().includes('1 / 22テーマ'));
assert.ok(runtime.reviewIsChecked(spring,'dialogue',d1.title,d1.otherId));
assert.ok(runtime.reviewIsChecked(morning,'dialogue',d2.title,d2.otherId));
const originalLyric=spring.lyrics;
spring.lyrics+='\n追加した一行';
assert.ok(!runtime.reviewIsChecked(morning,'dialogue',d2.title,d2.otherId),'edited lyrics must invalidate old review');
assert.ok(runtime.readingReviewForm(spring,'dialogue',d1.title,d1.otherId).includes('歌詞原文が更新されました'));
assert.ok(runtime.readingReviewDashboard().includes('0 / 22テーマ'));
spring.lyrics=originalLyric;
assert.ok(runtime.readingReviewDashboard().includes('1 / 22テーマ'));
const oldStance=db.readingReviews[key].stance;
db.readingReviews[key].stance='pending';
assert.ok(runtime.readingReviewDashboard().includes('0 / 22テーマ'),'pending is not verified');
db.readingReviews[key].stance=oldStance;
assert.ok(runtime.readingReviewForm(morning,'dialogue',d2.title,d2.otherId).includes('当時は別の意図で書きました。'));
const stored=JSON.stringify(db.readingReviews[key]);saveOK=false;
fake['[data-reading-comment]'].value='Failed write';
runtime.saveReadingReview(key,holder);
assert.equal(JSON.stringify(db.readingReviews[key]),stored,'failed save must restore previous review');
saveOK=true;runtime.clearReadingReview(key,holder);
assert.equal(db.readingReviews[key],undefined);
assert.ok(runtime.readingReviewDashboard().includes('0 / 22テーマ'));
const bad=runtime.cleanReadingReviews({
 'reading-v1|hypothesis|test|x':{stance:'untrusted',comment:'a'.repeat(6000)},
 'wrong|x':{stance:'different',comment:'not imported'}
});
assert.equal(Object.keys(bad).length,1);
assert.equal(bad['reading-v1|hypothesis|test|x'].stance,'pending');
assert.equal(bad['reading-v1|hypothesis|test|x'].comment.length,5000);
assert.equal(bad['reading-v1|hypothesis|test|x'].sourceTag,null);
const preserved=runtime.cleanReadingReviews({[key]:{stance:'near',comment:'old note with no marker'}});
assert.equal(preserved[key].comment,'old note with no marker');
const stateSource=html.slice(html.indexOf('function statePayload(d){'),html.indexOf('function setCloudStatus(',html.indexOf('function statePayload(d){')));
const stateFn=new Function('cleanWork','cleanReadingReviews',stateSource+'return statePayload;')(x=>x,runtime.cleanReadingReviews);
const cloud=stateFn(db);
assert.equal(cloud.version,3);
assert.equal(Object.keys(cloud.readingReviews).length,0);
assert.equal(cloud.notes.retained,'existing notes');
const legacy=stateFn({notes:{old:'note'},customWords:[],userWorks:[]});
assert.equal(Object.keys(legacy.readingReviews).length,0);
const importSource=html.slice(html.indexOf('function mergeImported(d){'),html.indexOf('function migrateOld(){'));
const importFn=new Function('db','save','cleanWork','PUBLIC','safeId','cleanReadingReviews',importSource+'return mergeImported;')(
 db,()=>true,x=>x,corpus,()=> 'test-id',runtime.cleanReadingReviews);
importFn({readingReviews:{[key]:{stance:'near',comment:'Recovered review'}}});
assert.equal(db.readingReviews[key].comment,'Recovered review');
importFn({readingReviews:{[key]:{stance:'different',comment:'Must not overwrite review'}}});
assert.equal(db.readingReviews[key].comment,'Recovered review');
const ui=html.slice(html.indexOf('function deepQuote(item){'),html.indexOf('function openWork(id){'));
const drawer={innerHTML:'',scrollTop:0,classList:{add(){}},setAttribute(){}};
const scrim={classList:{add(){}},setAttribute(){}};
const view=new Function('db','corpus','engine','drawer','scrim','reviews','esc',[
 'const window={LyricCloseReading:engine},works=()=>corpus;',
 'const getWork=id=>corpus.find(w=>w.id===id),$=x=>x==="#drawer"?drawer:scrim;',
 'const toast=()=>{};let selected=null;',
 'const readingReviewKey=reviews.readingReviewKey,readingReviewForm=reviews.readingReviewForm;',
 'const workReviewStats=(w,a)=>{const keys=[...a.readings.map(r=>readingReviewKey(w,"hypothesis",r.heading)),...a.dialogues.map(d=>readingReviewKey(w,"dialogue",d.title,d.otherId))];return {saved:keys.filter(k=>!!db.readingReviews[k]).length,total:keys.length}};',
 ui,
 'return {openDeepReading};'
].join('\n'))(db,corpus,engine,drawer,scrim,runtime,esc);
for(const w of corpus){
 view.openDeepReading(w.id);
 assert.ok(drawer.innerHTML.includes('本人の視点'),w.title+' needs author review controls');
 assert.ok(drawer.innerHTML.includes('異なる作品が対話するところ'));
 assert.ok(drawer.innerHTML.includes('原文の根拠'));
 assert.ok(drawer.innerHTML.includes('この解釈をもう一度考える箇所'));
 assert.ok(drawer.innerHTML.includes('data-source-tag='));
}
assert.ok(!html.includes('当時は別の意図で書きました。'));
console.log('author review v4: verified/pending/obsolete status, 22 topics, cross-work source signatures, 11 reading views, cloud migration and backup imports passed');
