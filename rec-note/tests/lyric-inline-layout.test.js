/* REC NOTE v18.3 inline-editor regression test.
   Run: node rec-note/tests/lyric-inline-layout.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'lyric-sync-mobile.js'),'utf8');
const css=fs.readFileSync(path.join(root,'lyric-sync-mobile.css'),'utf8');
new Function(js); // parser: no DOM required
const start=js.indexOf('function mountInline(){');
const end=js.indexOf('function saveInline(',start);
assert.ok(start>=0&&end>start,'Selected lyric mount function exists');
const mountFactory=new Function('work','version','selected','contextHost','rows','$','refreshInline',js.slice(start,end)+';return mountInline;');
for(const selected of [0,20,41,-1]){
 const host={hidden:false};
 const controls={syncContextPosition:{textContent:''},syncContextPrev:{disabled:false},syncContextNext:{disabled:false}};
 let mounted=-1,refreshes=0;
 const nodes=Array.from({length:42},(_,i)=>({nextElementSibling:null,after(node){mounted=i;this.nextElementSibling=node;}}));
 controls.syncLines={querySelector(q){const m=q.match(/data-line="(\d+)"/);return m?nodes[Number(m[1])]:null;}};
 const mount=mountFactory({id:1},{id:2},selected,host,()=>nodes.map((_,i)=>({i})),id=>controls[id],()=>refreshes++);
 mount();
 if(selected<0){assert.equal(host.hidden,true);assert.equal(refreshes,0);continue;}
 assert.equal(host.hidden,false);
 assert.equal(mounted,selected,'Selected line must own its editor');
 assert.equal(controls.syncContextPosition.textContent,`編集する歌詞 ${selected+1} / 42`);
 assert.equal(controls.syncContextPrev.disabled,selected===0);
 assert.equal(controls.syncContextNext.disabled,selected===41);
 assert.equal(refreshes,1);
}
assert.match(css,/body\.syncPage #syncStudio\{\s*display:block!important/,'One-column layout, not detached sidebar');
assert.match(css,/body\.syncPage #syncStudio #syncLines\{[\s\S]*?max-height:none!important;[\s\S]*?overflow:visible!important/,'No lyric list clip');
assert.match(css,/body\.syncPage #syncStudio #syncLines>#syncContextEditor\{[\s\S]*?position:static!important/,'Editor is in normal flow');
assert.match(css,/body\.syncPage #syncStudio #syncLines>#syncContextEditor>\.syncDock\{[\s\S]*?position:static!important/,'Recording controls cannot cover last lyric');
assert.match(css,/body\.syncPage #syncStudio #syncInstrumentRail:not\(\[hidden\]\)\{[\s\S]*?position:static!important/,'Instrument buttons cannot cover last lyric');
assert.match(js,/requestAnimationFrame\(\(\)=>contextHost\.scrollIntoView/,'Selecting lyric reveals editor');
console.log('REC NOTE v18.3 inline lyric editor: PASS (first/middle/final/unselected + layout contracts)');
