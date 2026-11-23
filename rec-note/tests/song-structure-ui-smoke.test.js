/* Run: node rec-note/tests/song-structure-ui-smoke.test.js
   Headless workflow: read latest lyrics, select a range, auto-generate timestamps,
   import proposals, make short candidate, export. No Supabase writes. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),nodes=new Map();
class Element{
 constructor(tag='div'){this.tag=tag;this._id='';this.children=[];this.classList={toggle(){},add(){},remove(){}};
  this.dataset={};this.style={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';
  this.nextSibling=null;this.readyState=2;this.duration=350;this.currentTime=0;this.listeners={};}
 set id(v){this._id=v;nodes.set(v,this)}get id(){return this._id}
 append(...x){this.children.push(...x)}replaceChildren(...x){this.children=[...x]}
 appendChild(x){this.children.push(x)}insertBefore(x){this.children.push(x)}
 setAttribute(k,v){this[k]=v}addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
 querySelector(){return new Element()}querySelectorAll(){return []}
 scrollIntoView(){}remove(){}click(){this.onclick?.();for(const fn of this.listeners.click||[])fn()}
 play(){return Promise.resolve()}pause(){}
}
const $=id=>{if(!nodes.has(id)){const el=new Element();el.id=id;}return nodes.get(id)};
for(const id of ['syncStudio','audio','fullSongTabs','fullSongSections'])$(id);
$('fullSongSections').hidden=true;
const document={getElementById:$,createElement:t=>new Element(t),body:new Element('body')};
const song='これからも',work='w',ver='v4';
const lyricText=Array.from({length:60},(_,i)=>'原文の行'+(i+1)).join('\n');
const cues=Array.from({length:60},(_,i)=>({
 id:'lyric-line:'+work+':'+ver+':'+i,song,kind:'lyric-line',
 workId:work,textVersionId:ver,lineIndex:i,
 start:+(27.4+i*4.75).toFixed(2),end:+(27.4+(i+1)*4.75).toFixed(2),status:'confirmed'
}));
const initialOther=[
 {id:'song-section:existing',song,kind:'song-section',sectionType:'intro',lineIndex:-100,
  workId:'old',textVersionId:'v1',start:0,end:27.4,status:'draft'}
];
const payload={lyricTimings:[...cues,...initialOther],drafts:{}};
const original=JSON.stringify(payload.lyricTimings),lyricRead={
 work:{id:work},versions:[{id:ver,version_no:4,literal_text:lyricText}]
};
const window={RECNOTE_CLOUD_MEDIA:{isSignedIn:()=>true},
 RECNOTE_LYRIC_BRIDGE:{isSignedIn:()=>true,async read(){return lyricRead;}},
 addEventListener(){},dispatchEvent(){}};
let saved=0,serial=0;
const ctx={window,document,state:payload,location:{pathname:'/rec-note/lyric-sync',search:''},
 song,files:{[song]:{name:song+'.mp3'}},persist(){saved++},
 crypto:{randomUUID(){return 'uid-'+(++serial)}},
 localStorage:{getItem(){return null}},confirm(){return true},
 URLSearchParams,Blob,URL,
 CustomEvent:class {constructor(type,opts){this.type=type;this.detail=opts?.detail}},
 setTimeout(){return 0},clearTimeout(){}};
vm.runInNewContext(fs.readFileSync(path.join(root,'song-structure-core.js'),'utf8'),ctx);
vm.runInNewContext(fs.readFileSync(path.join(root,'song-structure-studio.js'),'utf8'),ctx);
(async()=>{
 assert.ok(window.RECNOTE_STRUCTURE_STUDIO);
 window.RECNOTE_STRUCTURE_STUDIO.open();
 await Promise.resolve();await Promise.resolve();
 assert.equal($('ssPanel').hidden,false);
 assert.equal($('ssFirstLyric').children.length,61);
 assert.ok($('ssDerivedTime').textContent.includes('選択してください'),
  'Without selecting lyrics, there must be NO fabricated interval');
 assert.ok(!nodes.has('ssStart')&&!nodes.has('ssEnd'), 'time-entry widgets must not be mounted');
 // A proposal can be selected without first manually typing a single time.
 assert.ok($('ssList').children.some(x=>x.className?.includes('ssProposal')));
 $('ssImport').click();
 assert.equal(payload.lyricTimings.filter(x=>x.kind==='music-structure').length,8);
 $('ssImport').click();
 assert.equal(payload.lyricTimings.filter(x=>x.kind==='music-structure').length,8);
 $('ssTabShort').click();$('ssImport').click();
 assert.equal(payload.lyricTimings.filter(x=>x.kind==='short-cut').length,2);
 $('ssTabSection').click();$('ssList').children[0].click();
 assert.equal($('ssName').value,'Aメロ1候補');
 assert.ok($('ssDerivedTime').textContent.includes('自動取得：'));
 assert.ok($('ssFirstLyric').value!==''&&$('ssLastLyric').value!=='');
 $('ssApprove').click();
 assert.equal(payload.lyricTimings.filter(x=>x.kind==='music-structure'&&x.status==='confirmed').length,1);
 $('ssMakeShort').click();
 assert.ok($('ssDerivedTime').textContent.includes('秒'));
 $('ssSave').click();
 assert.equal(payload.lyricTimings.filter(x=>x.kind==='short-cut').length,3);
 const created=payload.lyricTimings.at(-1);
 assert.ok(created.sourceRegionId?.startsWith('recnote-arrangement-v1:'));
 assert.ok(Number.isInteger(created.startLyricIndex));
 assert.ok(Number.isInteger(created.endLyricIndex));
 assert.equal(created.lyricVersionId,ver);
 const originalAfter=payload.lyricTimings.slice(0,cues.length+initialOther.length);
 assert.equal(JSON.stringify(originalAfter),original,'original lyrics and times must remain unchanged');
 window.RECNOTE_STRUCTURE_STUDIO.close();
 assert.equal($('ssPanel').hidden,true);
 assert.ok(saved>=4);
 console.log('REC NOTE v19.1 linked lyric range UI smoke: PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
