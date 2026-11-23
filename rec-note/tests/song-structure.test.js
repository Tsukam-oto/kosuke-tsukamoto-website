/* Run: node rec-note/tests/song-structure.test.js
   Music sections and shorts derive their boundaries from existing lyric timings. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'song-structure-core.js'),'utf8');
const widget=fs.readFileSync(path.join(root,'song-structure-studio.js'),'utf8');
const html=fs.readFileSync(path.join(root,'lyric-sync.html'),'utf8');
const css=fs.readFileSync(path.join(root,'song-structure-studio.css'),'utf8');
const sandbox={window:{}};vm.runInNewContext(source,sandbox);
const c=sandbox.window.RECNOTE_STRUCTURE_CORE;
assert.ok(c);
const tracks=['あなたと','これから','これからも'];
assert.equal(tracks.map(song=>c.seedFor(song,'music-structure').length).join(','),'5,6,8');
assert.ok(tracks.every(song=>c.seedFor(song,'short-cut').length===2));
for(const song of tracks)for(const type of ['music-structure','short-cut']){
 const list=c.seedFor(song,type);
 assert.ok(list.every((item,i)=>item.status==='draft'&&item.sourceSeedKey==='ep-v01:'+type+':'+i));
}
assert.equal(c.parseTime('2:21.54'),141.54);
assert.equal(c.formatTime(141.54),'2:21.54');
assert.ok(Number.isNaN(c.parseTime('1:88.99')));
assert.ok(c.validInterval(13,9,120,true));
assert.ok(c.validInterval(null,null,120,true));
const song='あなたと',work='w',version='v04',lyrics='一行目\n二行目\n三行目\n四行目\n五行目';
const cueTimes=[[10,18],[18,25],[25,33],[33,40],[40,49]];
const sourceTimings=cueTimes.map(([start,end],i)=>({
 id:'lyric-line:'+work+':'+version+':'+i,song,workId:work,textVersionId:version,
 lineIndex:i,start,end,status:'confirmed'
}));
const intro={id:'song-section:protected',kind:'song-section',song,sectionType:'intro',start:0,end:10};
const instrumental={id:'song-section:outro',kind:'song-section',song,sectionType:'outro',start:49,end:60};
const read={work:{id:work},versions:[{id:version,version_no:4,literal_text:lyrics}]};
const ctx=c.buildLyricContext(song,read,[...sourceTimings,intro,instrumental],60);
assert.equal(ctx.cues.length,5);
assert.ok(c.rangeFromLyrics(ctx,null,null).issue);
assert.ok(c.rangeFromLyrics(ctx,0,null).issue);
assert.equal(c.rangeFromLyrics(ctx,0,1).start,10);
assert.equal(c.rangeFromLyrics(ctx,0,1).end,25);
assert.equal(c.rangeFromLyrics(ctx,3,4).end,49);
assert.equal(c.rangeFromLyrics(ctx,4,1).issue.length>0,true);
assert.equal(c.anchorFromApproximation(ctx,10,25).startLyricIndex,0);
assert.equal(c.anchorFromApproximation(ctx,10,25).endLyricIndex,1);
assert.equal(c.anchorFromApproximation(ctx,180,200),null);
const clipped=c.clipFromSection({id:'regionA',label:'サビ',start:10,end:45});
assert.equal(clipped.sourceRegionId,'regionA');
const original=JSON.stringify(sourceTimings);
const region={id:c.recordId(song,'music-structure','1'),song,kind:'music-structure',
 startLyricIndex:0,endLyricIndex:1,lyricVersionId:version,
 type:'chorus',label:'サビ',start:10,end:25,status:'confirmed',source:'manual'};
const short={id:c.recordId(song,'short-cut','1'),song,kind:'short-cut',
 startLyricIndex:0,endLyricIndex:0,lyricVersionId:version,
 label:'ショート候補',start:10,end:18,status:'draft',sourceRegionId:region.id};
const data=[...sourceTimings,intro,instrumental,region,short],frozen=JSON.stringify(data);
const result=c.exportPlan(song,data,new Date('2026-11-23T00:00:00Z'),ctx);
assert.equal(result.sections.length,1);
assert.equal(result.shortCandidates.length,1);
assert.equal(result.existingInstrumentalSections.length,2);
assert.equal(result.sections[0].duration,15);
assert.equal(result.sections[0].linkage,'lyrics-linked');
assert.equal(result.shortCandidates[0].sourceRegionId,region.id);
assert.equal(result.shortCandidates[0].startLyricIndex,0);
assert.equal(JSON.stringify(data),frozen);
assert.equal(JSON.stringify(sourceTimings),original);
const changedTimings=sourceTimings.map(x=>({...x,
 end:x.lineIndex===1?26:x.end,start:x.lineIndex===2?26:x.start}));
const updated=c.buildLyricContext(song,read,[...changedTimings,instrumental],60);
const shifted=c.exportPlan(song,[region],new Date('2026-11-23T00:00:00Z'),updated);
assert.equal(shifted.sections[0].end,26);
assert.equal(shifted.sections[0].status,'needs-reconfirmation');
assert.equal(shifted.sections[0].linkage,'lyrics-updated-recheck');
const stale=c.exportPlan(song,[{...region,lyricVersionId:'old'}],new Date('2026-11-23T00:00:00Z'),ctx);
assert.equal(stale.sections[0].end,null);
assert.ok(stale.sections[0].linkage.includes('歌詞の版'));
const missing=sourceTimings.map(x=>x.lineIndex===1?{...x,start:null,end:null}:x);
const missingCtx=c.buildLyricContext(song,read,missing,60);
assert.ok(c.rangeFromLyrics(missingCtx,0,1).issue);
assert.ok(c.overlapWarnings([region],{song,id:'other',start:18,end:20}).length===1);
assert.ok(widget.includes('await bridge.read(requestedSong)'));
assert.ok(widget.includes('startLyricIndex:selectedFirst'));
assert.ok(widget.includes('core.rangeFromLyrics(lyricCtx'));
assert.ok(widget.includes('kind:mode'));
assert.ok(widget.includes('sourceSeedKey&&y.sourceSeedKey===x.sourceSeedKey'));
assert.ok(!widget.includes('ssCaptureStart')&&!widget.includes('id="ssStart"'));
assert.ok(!widget.includes('writeRevision')&&!widget.includes('lyric_master_text_versions'));
assert.match(html,/song-structure-core\.js\?v=19\.1[\s\S]*?song-structure-studio\.js\?v=19\.1/);
assert.match(html,/song-structure-studio\.css\?v=19\.1/);
assert.ok(css.includes('.ssLyricSelect'));
console.log('REC NOTE v19.1 lyric-linked arrangement and shorts: PASS');
