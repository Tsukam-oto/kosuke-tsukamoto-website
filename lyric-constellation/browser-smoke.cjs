/* No TinyFish or paid browser service: headless Chromium smoke testing the public app locally.
   Synthetic review text is confined to ephemeral browser storage; never to the user's account. */
'use strict';
const { chromium } = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const port = 0;
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.css':'text/css'};
function serve(){
 const server=http.createServer(async(req,res)=>{
  try{
   let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname.endsWith('/'))pathname+='index.html';
   const file=path.resolve(root,'.'+pathname);
   if(!file.startsWith(root+path.sep))throw Object.assign(new Error('Forbidden'),{status:403});
   const data=await fs.readFile(file);
   res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
   res.end(data);
  }catch(e){res.writeHead(e.status||404);res.end('Not found')}
 });
 return new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(port,'127.0.0.1',()=>resolve(server));
 });
}
async function runScenario(browser,base,{mobile}){
 const context=await browser.newContext({
  viewport: mobile?{width:390,height:844}:{width:1365,height:900},
  isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,
 });
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 // Public, offline-friendly interface tests: authentication and fonts aren't needed.
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 try{
  await page.goto(base+'/lyric-constellation/',{waitUntil:'domcontentloaded',timeout:15000});
  // Public visitors must never be shown the private pseudonym catalogue or research UI.
  const publicOnly=await page.evaluate(()=>{
   go('research');switchSky('rap');
   return {sky,view,html:document.querySelector('#screen')?.innerText||'',
    researchHidden:document.querySelector('[data-view="research"]')?.hidden,
    privateOptionDisabled:document.querySelector('#skyF option[value="rap"]')?.disabled,
    privateSwitchVisible:!!document.querySelector('#screen [data-sky="rap"]')};
  });
  assert.equal(publicOnly.sky,'choir','guest cannot switch to private identity');
  assert.equal(publicOnly.view,'constellation','guest cannot open private research');
  assert.equal(publicOnly.researchHidden,true,'guest research nav is hidden');
  assert.equal(publicOnly.privateOptionDisabled,true,'guest cannot select private identity when editing');
  assert.equal(publicOnly.privateSwitchVisible,false,'guest switch button is absent');
  assert.doesNotMatch(publicOnly.html,/木乃伊/,'guest sees official-name works only');
  await page.locator('nav [data-view="works"]').click();
  await page.locator('button.work-card').filter({hasText:'朝になったら'}).first().click();
  await page.locator('#drawer .deep-entry [data-deep-work]').click();
  await page.locator('#drawer .deep-read').waitFor({timeout:10000});
  const html=await page.locator('#drawer').innerHTML();
  assert.match(html,/この解釈をもう一度考える箇所/,'reread evidence visible');
  assert.match(html,/L\d+/,'source citations visible');
  assert.match(html,/本人の確認/,'review controls visible');
  assert.match(html,/本人の視点/,"author\'s viewpoint separate from reader interpretation");
  const card=page.locator('#drawer .deep-reading-card').filter({hasText:'「僕」と「僕ら」の間に何があるか'}).first();
  const review=card.locator('.author-review');
  await review.locator('summary').click();
  await review.locator('[data-reading-stance]').selectOption('different');
  const syntheticComment='テスト：この歌詞の解釈について確認する。実際の制作意図ではありません。';
  await review.locator('[data-reading-comment]').fill(syntheticComment);
  await review.locator('[data-save-reading]').click();
  const status=await review.locator('.author-review-current').innerText();
  assert.match(status,/制作意図とは異なる/);
  const store=await page.evaluate(()=>JSON.parse(localStorage.getItem('lyric_constellation_v1_20261104')||'{}'));
  const entries=Object.values(store.readingReviews||{});
  assert.equal(entries.length,1,'one feedback entry stored in temporary browser storage');
  assert.equal(entries[0].comment,syntheticComment);
  assert.match(entries[0].sourceTag||'',/^text-fnv1a-/,'source freshness marker saved');
  await page.locator('#drawer #closeDrawer').click();
  const journal=page.locator('#readingJournal');
  await journal.locator('summary').click();
  assert.match(await journal.locator('summary').innerText(),/1 \/ 22テーマ/,'journal updates after saving');
  await journal.locator('[data-reading-filter="different"]').click();
  assert.equal(await journal.locator('.reading-journal-item').count(),1,'a different reading is found with one tap');
  await journal.locator('[data-reading-filter="all"]').click();
  assert.equal(await journal.locator('.reading-journal-item').count(),22,'all 22 unique themes are listed');
  await journal.locator('[data-reading-filter="needs"]').click();
  assert.equal(await journal.locator('.reading-journal-item').count(),21,'verified reviews are excluded from the needs list');
  await journal.locator('[data-reading-filter="all"]').click();
  const topic=journal.locator('.reading-journal-item').filter({hasText:'「僕」と「僕ら」の間に何があるか'}).first();
  await topic.locator('[data-open-reading]').click();
  const focused=page.locator('#drawer .reading-journal-focused');
  assert.match(await focused.locator('h4').innerText(),/「僕」と「僕ら」の間に何があるか/);
  assert.equal(await focused.locator('.author-review').getAttribute('open'),'','topic opens its own author review');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('nav [data-view="works"]').click();
  await page.locator('button.work-card').filter({hasText:'朝になったら'}).first().click();
  await page.locator('#drawer .deep-entry [data-deep-work]').click();
  const storedCard=page.locator('#drawer .deep-reading-card').filter({hasText:'「僕」と「僕ら」の間に何があるか'}).first();
  const restored=storedCard.locator('.author-review');
  assert.match(await restored.locator('.author-review-current').innerText(),/制作意図とは異なる/);
  await restored.locator('summary').click();
  assert.equal(await restored.locator('[data-reading-comment]').inputValue(),syntheticComment);
  await restored.locator('[data-reading-stance]').selectOption('pending');
  await restored.locator('[data-save-reading]').click();
  const progress=await page.locator('#drawer .author-review-progress').innerText();
  assert.match(progress,/0 \/ \d+/,'pending must NOT count as verified');
  // Local storage and display are verified. Account-to-account sync is deliberately not touched.
  assert.equal(errors.length,0,'uncaught JS errors: '+errors.join(' / '));
  console.log('PASS '+(mobile?'mobile (390px)':'desktop (1365px)')+
   ': navigate → evidence → journal filters → direct topic → save → reload → restore → pending excluded');
 } finally {await context.close()}
}

/* Private-corpus browser test: all fictional records, mocked owner-scoped Supabase responses. */
async function runPrivateCatalogScenario(browser,base,{mobile}){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:900},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 try{
  await page.goto(base+'/lyric-constellation/',{waitUntil:'domcontentloaded'});
  const probe=await page.evaluate(async()=>{
   const catalog=[],texts=[];
   for(let i=0;i<168;i++){
    const id='fictional-rap-'+String(i).padStart(3,'0');
    catalog.push({id,sky:'rap',title:'検証曲'+String(i+1).padStart(3,'0'),form:'song',
      collection_title:'検証用の曲集',track_no:i+1,original_book_index:i,
      verification_status:'source_text_present',authorship_status:'unknown',
      source_review_note:'PDF原文校正待ち',source_page_start:i+2,source_page_end:i+2,source_name:'検証用PDF'});
    const lyric='俺はまだ言葉を探している\n君はいつか帰ってくるのかな\n'+
      '\n今日も窓から空を見た\nそれでも僕らは歌を続ける\n'+
      '\n俺の歩く道は変わらない\n君が好きな朝が来るかもしれない\n'+
      'どうして言葉が続くのだろう\nでも明日になれば違うかもしれない';
    texts.push({work_id:id,version_no:1,literal_text:lyric,text_status:'unverified_pdf_extract',source_ref:'synthetic fixture'});
   }
   catalog.push({id:'fictional-personal',sky:'personal',title:'個人曲テスト',form:'song',collection_title:'本人原稿'});
   texts.push({work_id:'fictional-personal',version_no:1,literal_text:'今日と明日の間に\n君と二人で歩く道\nいつかこの言葉を伝える\nここにいると伝える',text_status:'author_original'});
   catalog.push({id:'fictional-awaiting',sky:'choir',title:'これからも',form:'song',collection_title:'原文待ち'});
   const user={id:'synthetic-owner'};
   const previous=cloudEpoch;cloudEpoch=previous+1;cloudUser=user;
   cloudClient={from(table){return {
    select(){return this},eq(){return this},
    order(){return table==='lyric_master_works'?Promise.resolve({data:catalog,error:null}):this},
    limit(){return Promise.resolve({data:texts,error:null})}
   }}};
   await loadMasterReadingCorpus(user,cloudEpoch);
   return {loaded:masterReadingWorks.length,rap:masterReadingWorks.filter(w=>w.sky==='rap').length,
    personal:masterReadingWorks.filter(w=>w.sky==='choir').length,pending:masterPendingWorks.length};
  });
  assert.equal(probe.loaded,169);assert.equal(probe.rap,168);assert.equal(probe.personal,1);assert.equal(probe.pending,1);
  await page.locator('[data-sky="rap"]').first().click();
  await page.locator('nav [data-view="works"]').click();
  assert.equal(await page.locator('.work-card').count(),168);
  assert.match(await page.locator('#screen').innerText(),/PDF抽出・未校正/);
  const summary=page.locator('#readingJournal summary').first();
  await summary.click();
  const shown=await page.locator('#readingJournalItems .reading-journal-item').count();
  assert.ok(shown>0&&shown<=36,'long rap journals are paged');
  assert.ok(await page.locator('#readingJournal [data-reading-more]').count()===1);
  const sourceCard=page.locator('.work-card').filter({hasText:'検証曲001'}).first();
  await sourceCard.click();
  assert.match(await page.locator('#drawer').innerText(),/未校正/);
  assert.equal(await page.locator('#drawer [data-edit]').count(),0,'source cannot be edited in place');
  assert.equal(await page.locator('#drawer [data-delete]').count(),0,'source cannot be deleted in place');
  await page.locator('#drawer .deep-entry [data-deep-work]').click();
  assert.match(await page.locator('#drawer').innerText(),/原文から考える問い/);
  assert.match(await page.locator('#drawer').innerText(),/語り手と呼びかける相手/);
  assert.equal(errors.length,0,errors.join(' / '));
  const leak=await page.evaluate(()=>{
   const text=JSON.stringify(localStorage);
   masterReadingWorks=[];masterPendingWorks=[];masterReadStatus='signed_out';cloudUser=null;render();
   return {hasPrivate:document.querySelector('#screen')?.textContent.includes('検証曲001'),
    stored:text.includes('検証曲001'),visible:works().length};
  });
  assert.equal(leak.hasPrivate,false);
  assert.equal(leak.stored,false,'private master lyrics must not be cached in localStorage');
  assert.equal(leak.visible,0,'private rap disappears after sign-out');
  console.log('PASS private master '+(mobile?'mobile':'desktop')+': 168 rap songs, 1 personal, missing-text catalog, reading, owner-only clearing');
 }finally{await context.close()}
}


/* Mummy essay research smoke: synthetic owner-only essay and song, never real user contents. */
async function runMummyResearchScenario(browser,base,{mobile}){
 const context=await browser.newContext({
  viewport:mobile?{width:390,height:844}:{width:1365,height:900},
  isMobile:mobile,hasTouch:mobile
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 try{
  await page.goto(base+'/lyric-constellation/#mummy-research',{waitUntil:'domcontentloaded'});
  assert.match(await page.locator('#screen').innerText(),/本人専用の精読室/);
  assert.equal(await page.locator('#screen .mummy-essay').count(),0,'private essay hidden without login');
  const report=await page.evaluate(()=>{
   const sourceText='音楽はここで終わる。\n楽譜はまだ開かれていない本だ。\nそれでも私は演奏する。';
   const lyric='昨日の生活\n音楽をまだ聴きたい\nその先を考える';
   rapResearchSource={id:'essay-fixture',title:'検証用エッセイ',date_label:'2022-08',original_text:sourceText};
   rapResearchPassages=[{source_id:'essay-fixture',section_key:'test',heading:'音楽の問い',
    evidence_a:'音楽はここで終わる。',evidence_b:'それでも私は演奏する。',
    interpretation:'暫定解釈',alternative:'別の読み',inquiry:'どう考えられますか。'}];
   rapResearchConnections=[{source_id:'essay-fixture',work_id:'fictional-rap-fixture',
    heading:'作品の対話',essay_evidence:'音楽はここで終わる。',
    lyric_evidence:'音楽をまだ聴きたい',interpretation:'観察上のつながり',alternative:'異なる場面の言葉'}];
   masterReadingWorks=[{id:'master-fictional-rap-fixture',title:'検証楽曲',sky:'rap',
    sourceSystem:'lyric_master',sourceStatus:'unverified_pdf_extract',collection:'架空歌詞集',
    lyrics:lyric,sourceVersionNo:1,originalBookIndex:0},
    {id:'master-fictional-rap-2',title:'検証楽曲2',sky:'rap',
    sourceSystem:'lyric_master',sourceStatus:'unverified_pdf_extract',collection:'架空歌詞集',
    lyrics:'友達と歌う\n歌って生きていく',sourceVersionNo:1,originalBookIndex:1}];
   rapSongReadings=[{id:'reading-1',work_id:'fictional-rap-fixture',source_version_no:1,
    heading:'検証楽曲の独立精読',evidence_a:'昨日の生活',evidence_b:'音楽をまだ聴きたい',
    observation:'生活と歌を並べる',interpretation:'独立した解釈',alternative:'別の解釈',
    inquiry:'なぜでしょうか。'}];
   rapSongDialogues=[{id:'dialogue-1',work_a_id:'fictional-rap-fixture',work_b_id:'fictional-rap-2',
    version_a:1,version_b:1,heading:'検証用の楽曲間比較',
    evidence_a:'音楽をまだ聴きたい',evidence_b:'友達と歌う',
    interpretation:'楽曲間の語り',alternative:'似ているとは限らない',inquiry:'どう違いますか。'}];
   rapResearchStatus='ready';sky='rap';view='research';render();
   return {works:masterReadingWorks.length,essayChars:rapResearchSource.original_text.length};
  });
  assert.equal(report.works,2);
  assert.match(await page.locator('#screen').innerText(),/検証楽曲/);
  assert.equal(await page.locator('.mummy-stats b').nth(1).innerText(),'1','only 1 of 2 songs deeply read');
  assert.equal(await page.locator('.mummy-connections .mummy-connection').count(),1);
  const order=await page.locator('#screen').evaluate(el=>[el.innerHTML.indexOf('168作品から選ぶ'),el.innerHTML.indexOf('エッセイ《')]);
  assert.ok(order[0]>=0&&order[1]>order[0],'songs before essay');
  await page.locator('[data-mummy-mode="studied"]').click();
  assert.equal(await page.locator('.mummy-work-row').count(),1);
  await page.locator('[data-mummy-mode="awaiting"]').click();
  assert.equal(await page.locator('.mummy-work-row').count(),1);
  await page.locator('[data-mummy-mode="all"]').click();
  await page.locator('.mummy-work-row').filter({hasText:'検証楽曲'}).first().locator('[data-mummy-select]').click();
  assert.match(await page.locator('#mummySelectedReading').innerText(),/検証楽曲の独立精読/);
  assert.match(await page.locator('#mummySelectedReading').innerText(),/別の解釈/);
  const other=page.locator('.mummy-other-doc');await other.locator('summary').first().click();
  const fold=page.locator('.mummy-essay');
  await fold.locator('summary').click();
  assert.match(await fold.locator('pre').innerText(),/音楽はここで終わる/);
  await page.locator('[data-mummy-theme="daily"]').click();
  assert.equal(await page.locator('.mummy-work-row').count(),1);
  await page.locator('#mummySearch').fill('見当たらない語');
  assert.equal(await page.locator('.mummy-work-row').count(),0);
  await page.locator('#mummySearch').fill('');
  assert.equal(await page.locator('.mummy-work-row').count(),1);
  await page.locator('.mummy-work-row [data-open]').click();
  assert.match(await page.locator('#drawer').innerText(),/検証楽曲/);
  await page.locator('#drawer #closeDrawer').click();
  const secure=await page.evaluate(()=>{
   const stored=JSON.stringify(localStorage);
   masterReadingWorks=[];cloudUser=null;clearMummyResearch();render();
   return {stored:stored.includes('検証用エッセイ'),
    visible:document.getElementById('screen').textContent.includes('検証用エッセイ'),
    cached:window.MummyResearchView.getState().works.length};
  });
  assert.equal(secure.stored,false,'no essay in localStorage');
  assert.equal(secure.visible,false,'no essay after signout');
  assert.equal(secure.cached,0,'no private lyric remains in research UI cache');
  assert.equal(errors.length,0,errors.join(' / '));
  console.log('PASS Mummy song-first '+(mobile?'mobile':'desktop')+
    ': locked route, independent song reading, 1 song dialogue, optional essay, filters and logout privacy');
 }finally{await context.close()}
}

(async()=>{
 let server,browser;
 try{
  server=await serve();
  const address=server.address();
  const base='http://127.0.0.1:'+address.port;
  browser=await chromium.launch({headless:true});
  await runScenario(browser,base,{mobile:false});
  await runScenario(browser,base,{mobile:true});
  await runPrivateCatalogScenario(browser,base,{mobile:false});
  await runPrivateCatalogScenario(browser,base,{mobile:true});
  await runMummyResearchScenario(browser,base,{mobile:false});
  await runMummyResearchScenario(browser,base,{mobile:true});
 } finally {
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
 }
})().catch(err=>{console.error(err.stack||String(err));process.exitCode=1});
