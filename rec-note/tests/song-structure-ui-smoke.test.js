/* node rec-note/tests/song-structure-ui-smoke.test.js
   Minimal headless DOM smoke test; no Supabase or user data is written. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const m=new Map();
class Element{
 constructor(tag='div'){this.tag=tag;this._id='';this.children=[];this.classList={toggle(){},add(){},remove(){}};
  this.dataset={};this.style={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';
  this.nextSibling=null;this.readyState=1;this.duration=307.88;this.currentTime=0;this.listeners={};}
 set id(v){this._id=v;m.set(v,this)}get id(){return this._id}
 append(...v){this.children.push(...v)}replaceChildren(...v){this.children=[...v]}
 appendChild(v){this.children.push(v)}insertBefore(v){this.children.push(v)}
 setAttribute(k,v){this[k]=v}addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
 querySelector(){return new Element()}querySelectorAll(){return []}
 scrollIntoView(){}remove(){}click(){this.onclick?.();for(const fn of this.listeners.click||[])fn()}
}
const $=id=>{if(!m.has(id)){const el=new Element();el.id=id;}return m.get(id)};
for(const id of ['syncStudio','audio','fullSongTabs','fullSongSections'])$(id);
$('fullSongSections').hidden=true;
const document={getElementById:$,createElement:tag=>new Element(tag),body:new Element('body')};
const window={RECNOTE_CLOUD_MEDIA:{isSignedIn:()=>true},addEventListener(){},dispatchEvent(){}};
const payload={lyricTimings:[
 {id:'lyric-line:unchanged',song:'これからも',kind:'lyric-line',workId:'old',textVersionId:'v4',lineIndex:20,start:90,end:95,status:'confirmed'},
 {id:'song-section:existing',song:'これからも',kind:'song-section',sectionType:'intro',lineIndex:-100,workId:'old',textVersionId:'v1',start:0,end:27.4,status:'draft'}
 ],drafts:{}};
let persisted=0,serial=0;
const ctx={window,document,state:payload,location:{pathname:'/rec-note/lyric-sync',search:''},
 song:'これからも',files:{'これからも':{name:'これからも.mp3'}},
 persist(){persisted++},crypto:{randomUUID(){return String(++serial)}},
 localStorage:{getItem(){return null}},confirm(){return true},
 URLSearchParams,Blob,CustomEvent:class {constructor(type,opts){this.type=type;this.detail=opts?.detail}},
 URL, setTimeout(){return 0},clearTimeout(){}};
vm.runInNewContext(fs.readFileSync(path.join(root,'song-structure-core.js'),'utf8'),ctx);
vm.runInNewContext(fs.readFileSync(path.join(root,'song-structure-studio.js'),'utf8'),ctx);
assert.ok(window.RECNOTE_STRUCTURE_STUDIO);
const original=JSON.stringify(payload.lyricTimings.slice(0,2));
window.RECNOTE_STRUCTURE_STUDIO.open();
assert.equal($('ssPanel').hidden,false);
$('ssImport').click(); // imports 8 provisional song-structure records
assert.equal(payload.lyricTimings.filter(x=>x.kind==='music-structure').length,8);
$('ssImport').click(); // no duplication
assert.equal(payload.lyricTimings.filter(x=>x.kind==='music-structure').length,8);
$('ssTabShort').click();$('ssImport').click();
assert.equal(payload.lyricTimings.filter(x=>x.kind==='short-cut').length,2);
$('ssTabSection').click();$('ssList').children[0].click();
assert.equal($('ssName').value,'Aメロ1候補');
$('ssApprove').click();
assert.equal(payload.lyricTimings.filter(x=>x.kind==='music-structure'&&x.status==='confirmed').length,1);
$('ssMakeShort').click();$('ssSave').click();
assert.equal(payload.lyricTimings.filter(x=>x.kind==='short-cut').length,3);
const created=payload.lyricTimings.at(-1);
assert.ok(created.sourceRegionId?.startsWith('recnote-arrangement-v1:'));
assert.equal(created.status,'draft');
window.RECNOTE_STRUCTURE_STUDIO.close();
assert.equal($('ssPanel').hidden,true);
assert.equal(JSON.stringify(payload.lyricTimings.slice(0,2)),original,'original lyric and traditional instrumental records must remain byte-identical');
assert.ok(persisted>=4,'new records must be persisted');
console.log('REC NOTE v19 UI smoke: PASS. Import / select / approve / create short / close; original records untouched.');
