/* Owner-only starfield browser smoke. ALL lyrics and comparison evidence are synthetic. */
'use strict';
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml'};
async function run(mobile){
 const server=http.createServer(async(req,res)=>{
  try{
   let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname.endsWith('/'))pathname+='index.html';
   const p=path.resolve(root,'.'+pathname);
   if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   const buf=await fs.readFile(p);res.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream','cache-control':'no-store'});res.end(buf);
  }catch{res.writeHead(404);res.end('404')}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:900},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 try{
  const url='http://127.0.0.1:'+server.address().port+'/lyric-constellation/';
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('[data-sky="rap"]').first().click();
  assert.match(await page.locator('.starfield-empty').innerText(),/非公開/);
  assert.equal(await page.locator('.semantic-star').count(),0,'never reveal private stars when signed out');
  await page.evaluate(async()=>{
   const catalog=[],texts=[],relations=[],themes=[],judgments=[];
   const uid='fictional-user';let n=168;
   for(let i=0;i<n;i++){
    const id='fictional-'+String(i).padStart(3,'0');
    const title=i===25?'<img src=x onerror=alert(1)>':'検証曲'+String(i+1).padStart(3,'0');
    catalog.push({id,sky:'rap',title,form:'song',collection_title:'検証作品集'+Math.floor(i/12),
      track_no:i%12+1,original_book_index:i,verification_status:'source_text_present',authorship_status:'self',
      source_review_note:'synthetic',source_name:'fixture'});
    texts.push({work_id:id,version_no:1,literal_text:'この歌は架空の歌詞です\n二人の時間と明日\n音楽のある生活が続く',
      text_status:'verified_author_original',source_ref:'fictional'});
   }
   relations.push({link_key:'a',topic:'日々の異なる見え方',relation_type:'resonance',
     left_work_id:'fictional-000',right_work_id:'fictional-050',
     evidence_left:'この歌は架空の歌詞です',evidence_right:'二人の時間と明日',
     observation:'二つの架空作品に暮らしの表現がある',interpretation:'架空の精読仮説',alternative:'別の読み'});
   relations.push({link_key:'b',topic:'対照として読む',relation_type:'counterpoint',
     left_work_id:'fictional-000',right_work_id:'fictional-095',
     evidence_left:'音楽のある生活が続く',evidence_right:'この歌は架空の歌詞です',
     observation:'同じ日常への別の態度',interpretation:'仮説は一つではない',alternative:'異なる解釈'});
   relations.push({link_key:'bad',topic:'存在しない線',left_work_id:'fictional-000',right_work_id:'missing',
     evidence_left:'秘密',evidence_right:'秘密'});
   themes.push({thread_key:'synthetic-care',title:'暮らしの星座',guiding_question:'ともに生きる時間はどう変わるのか？',
      core_hypothesis:'根拠から読む架空の星座仮説',counterreading:'別の読解もできる',inference_limit:'本人確認前の仮説',
      anchors:[{kind:'work',source_id:'fictional-000',quote:'この歌は架空の歌詞です',observation:'第一の星の読み',technique:'語りの開始'},
       {kind:'work',source_id:'fictional-050',quote:'二人の時間と明日',observation:'第二の星の読み',technique:'未来への転換'},
       {kind:'note',source_id:'private-draft'},
       {kind:'work',source_id:'fictional-095',quote:'音楽のある生活が続く',observation:'第三の星の読み',technique:'反復'}]});
    themes.push({thread_key:'synthetic-memory',title:'記憶の星座',guiding_question:'消えそうな記憶に何を残すか？',
      core_hypothesis:'歌の記憶には別の読みがある',
      anchors:[{kind:'work',source_id:'fictional-000',quote:'この歌は架空の歌詞です',observation:'第一の記憶'},
       {kind:'work',source_id:'fictional-095',quote:'音楽のある生活が続く',observation:'違う時間'},
       {kind:'work',source_id:'fictional-121',quote:'二人の時間と明日',observation:'二人の記憶'}]});
    themes.push({thread_key:'rap-ep1-fictional',title:'架空EPの読解',guiding_question:'作品集はどう変わる？',
      anchors:[{kind:'work',source_id:'fictional-050',quote:'この歌は架空の歌詞です'},
       {kind:'work',source_id:'fictional-075',quote:'二人の時間と明日'}]});
    cloudEpoch++;cloudUser={id:uid};const epoch=cloudEpoch;
   cloudClient={from(table){return {
    pendingWrite:null,
    upsert(row){this.pendingWrite=row;return this},
    select(){
     if(this.pendingWrite){
      if(table!=='lyric_author_link_judgments')return Promise.resolve({data:null,error:{message:'Wrong write table'}});
      const row={...this.pendingWrite};
      const i=judgments.findIndex(x=>x.link_key===row.link_key);
      if(i>=0)judgments[i]=row;else judgments.push(row);
      return Promise.resolve({data:[row],error:null});
     }
     return this;
    },
    eq(){return this},not(){return this},
    order(){return table==='lyric_master_works'?Promise.resolve({data:catalog,error:null}):this},
    limit(){return Promise.resolve({data:table==='lyric_cross_readings'?relations:
       table==='lyric_close_reading_paths'?themes:
       table==='lyric_author_link_judgments'?judgments:texts,error:null})}
   }}};
   await loadMasterReadingCorpus(cloudUser,epoch);
  });
  const phraseAudit=await page.evaluate(()=>{
    const old=masterReadingWorks;
    masterReadingWorks=[
      {id:'fixture-1',sky:'rap',title:'仮曲1',lyrics:'うまくいかないことを数えて\n日々の中で見つけたもの'},
      {id:'fixture-2',sky:'rap',title:'仮曲2',lyrics:'うまくいかないこの夜に\n日々の中で見つけたもの'}
    ];
    const found=rapRepeatedPhrases().map(x=>x.text);
    masterReadingWorks=old;
    return found;
  });
  assert.deepEqual(phraseAudit,['日々の中で見つけたもの'],'partial 4–8-character n-grams must never become indexed words');
  await page.locator('.nav button[data-view="words"]').click();
  assert.equal(await page.locator('.word-workbench').count(),1,'word view uses a source-reading workbench');
  assert.equal(await page.locator('.word-index-group').count(),4,'explicit complete expression groups, not auto-sliced chips');
  assert.equal(await page.locator('.word-search-form').count(),1);
  assert.equal(await page.locator('.word-cloud .word').count(),0,'old wall of arbitrary fragments is removed');
  const currentColor=await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.equal(currentColor,'rgb(243, 247, 251)','rap page uses paper background, not purple');
  const sidebarColor=await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.equal(sidebarColor,'rgb(12, 27, 48)','navigation uses deep navy contrast, not lavender');
  await page.locator('#wordSearch').fill('音楽のある生活が続く');
  await page.locator('#wordSearch').press('Enter');
  assert.match(await page.locator('.word-current-term').innerText(),/168作品/,'only exact source hits are counted');
  assert.equal(await page.locator('.word-source-card').count(),12,'results disclose gradually, not 168 cards');
  await page.locator('#moreWordResults').click();
  assert.equal(await page.locator('.word-source-card').count(),24,'further original passages remain accessible');
  await page.locator('#wordSearch').fill('存在しない一節');
  await page.locator('#findWord').click();
  assert.equal(await page.locator('.word-source-card').count(),0,'a missing phrase cannot be fabricated');
  assert.match(await page.locator('.word-no-hits').innerText(),/勝手に似た言葉/);
  await page.locator('.nav button[data-view="constellation"]').click();
  assert.equal(await page.locator('.semantic-star').count(),168,'starfield remains intact after word lookup');
  assert.equal(await page.locator('.semantic-star').count(),168,'all 168 songs must appear as stars');
  assert.match(await page.locator('.semantic-status').innerText(),/2組/,'links come from semantic data');
  assert.equal(await page.locator('.semantic-atlas-card').count(),0,'full thematic atlas is collapsed before the user requests it');
  assert.equal(await page.locator('.semantic-discovery-card').count(),0,'two-song reading room is collapsed by default');
  assert.equal(await page.locator('.dark-card .semantic-toolbar').count(),0,'reading controls must not push the actual sky offscreen inside the canvas');
  assert.equal(await page.locator('.semantic-stars-svg').count(),1,'starfield remains immediately visible');
  const skyWidth=await page.locator('.semantic-stars-svg').evaluate(el=>el.getBoundingClientRect().width);
  const parentWidth=await page.locator('.semantic-star-viewport').evaluate(el=>el.getBoundingClientRect().width);
  assert.ok(skyWidth<=parentWidth+2,'the 168-star constellation first fits its desktop or mobile viewport');
  await page.locator('[data-semantic-action="map-zoom"]').click();
  assert.match(await page.locator('.semantic-stars-svg').getAttribute('class'),/detailed/,'users can zoom for precise star selection');
  await page.locator('[data-semantic-action="map-zoom"]').click();
  assert.doesNotMatch(await page.locator('.semantic-stars-svg').getAttribute('class'),/detailed/);
  await page.locator('[data-semantic-action="settings-toggle"]').click();
  assert.equal(await page.locator('.semantic-advanced-settings').count(),1,'advanced controls require explicit opening');
  await page.locator('[data-atlas-toggle="show"]').click();
  await page.locator('[data-atlas-network-toggle="show"]').click();
  await page.locator('[data-semantic-action="discovery-toggle"]').click();
  assert.equal(await page.locator('.semantic-atlas-card').count(),2,'two thematic lenses initially visible');
  assert.match(await page.locator('.semantic-atlas-stats').innerText(),/3/,'atlas counts three multi-work constellations');
  assert.equal(await page.locator('.semantic-network-star').count(),3,'a second star map displays three distinct reading themes');
  assert.equal(await page.locator('.semantic-network-edge').count(),2,'only real shared-song connections are drawn');
  await page.locator('.semantic-network-star[data-atlas-network-select="synthetic-memory"]').click();
  assert.match(await page.locator('.semantic-network-detail h4').innerText(),/記憶の星座/);
  assert.equal(await page.locator('.semantic-network-edge.focused').count(),1,'selected theme exposes its actual one shared-theme edge');
  assert.match(await page.locator('.semantic-network-relations').innerText(),/暮らしの星座/);
  await page.locator('.semantic-network-star[data-atlas-network-select="rap-ep1-fictional"]').press('Enter');
  assert.match(await page.locator('.semantic-network-detail h4').innerText(),/架空EPの読解/,'keyboard can select a thematic star');
  await page.locator('[data-atlas-network-toggle="hide"]').click();
  assert.equal(await page.locator('.semantic-network-svg').count(),0,'secondary map can be folded away');
  await page.locator('[data-atlas-network-toggle="show"]').click();
  assert.equal(await page.locator('.semantic-network-star').count(),3,'secondary map can be restored');
  assert.equal(await page.locator('.semantic-star.constellation-crossing').count(),3,'shared stars have a separate ring');
  assert.equal(await page.locator('.semantic-overlap-ring').count(),3);
  await page.locator('[data-atlas-filter="all"]').click();
  assert.equal(await page.locator('.semantic-atlas-card').count(),3,'including a collection-level reading');
  await page.locator('[data-atlas-filter="collections"]').click();
  assert.equal(await page.locator('.semantic-atlas-card').count(),1);
  await page.locator('[data-atlas-filter="themes"]').click();
  await page.locator('[data-atlas-overlap="hide"]').click();
  assert.equal(await page.locator('.semantic-overlap-ring').count(),0,'overlap rings can be hidden');
  await page.locator('[data-atlas-overlap="show"]').click();
  assert.equal(await page.locator('.semantic-overlap-ring').count(),3,'overlap rings return');
  assert.equal(await page.locator('.semantic-discovery-card').count(),1,'show one comparison, not 210 stacked forms');
  assert.match(await page.locator('.semantic-discovery-progress').innerText(),/0\s*\/\s*2/);
  const titlesBefore=await page.locator('.semantic-discovery-card h3').innerText();
  await page.locator('[data-semantic-action="discovery-next"]').click();
  assert.notEqual(await page.locator('.semantic-discovery-card h3').innerText(),titlesBefore,'skip moves to the next unreviewed thought without saving');
  await page.locator('[data-discovery-filter="resonance"]').click();
  assert.match(await page.locator('.semantic-discovery-card h3').innerText(),/日々の異なる見え方/);
  const quoteBoxes=await page.locator('.semantic-discovery-pair>div').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y};}));
  assert.equal(quoteBoxes.length,2);
  if(mobile){assert.ok(quoteBoxes[1].y>quoteBoxes[0].y,'quotes stack vertically on iPhone');}
  else{assert.ok(quoteBoxes[1].x>quoteBoxes[0].x,'quotes appear side by side on desktop');}
  await page.locator('[data-discovery-filter="all"]').click();
  await page.locator('[data-semantic-action="discovery-toggle"]').click();
  assert.equal(await page.locator('.semantic-discovery-card').count(),0,'reading room can collapse without data loss');
  await page.locator('[data-semantic-action="discovery-toggle"]').click();
  assert.equal(await page.locator('.semantic-discovery-card').count(),1);
  // A rejected write must never appear as an author-confirmed connection.
  await page.evaluate(()=>{
    const from=cloudClient.from;
    window.__restoreFeelingWrite=()=>{cloudClient.from=from;};
    cloudClient.from=function(table){
      const query=from.call(cloudClient,table);
      if(table==='lyric_author_link_judgments'){
        query.upsert=()=>({select:()=>Promise.resolve({data:null,error:{message:'架空の保存拒否'}})});
      }
      return query;
    };
  });
  await page.locator('.semantic-discovery-card [data-author-note]').fill('保存されない仮の言葉');
  await page.locator('.semantic-discovery-card [data-author-decision="confirmed"]').click();
  await page.waitForFunction(()=>document.querySelector('.semantic-discovery-card .semantic-review-feedback')?.textContent?.includes('架空の保存拒否'));
  assert.equal(await page.locator('.semantic-link.author-confirmed').count(),0,'failed save never creates a gold connection');
  assert.match(await page.locator('.semantic-discovery-progress').innerText(),/0\s*\/\s*2/,'failed write does not advance progress');
  await page.evaluate(()=>window.__restoreFeelingWrite());
  assert.equal(await page.locator('.semantic-link.focused').count(),2,'selected star highlights two evidence-backed lines');
  assert.match(await page.locator('.semantic-focus-panel').innerText(),/日々の異なる見え方/);
  const targetRelation=page.locator('.semantic-related').filter({hasText:'日々の異なる見え方'});
  await targetRelation.locator('details summary').click();
  assert.match(await targetRelation.locator('details').innerText(),/架空の精読仮説/);
  assert.match(await page.locator('.semantic-status').innerText(),/本人確認済み 0組/);
  const review=targetRelation.locator('.semantic-author-review');
  assert.match(await review.innerText(),/未確認・保存されていません/);
  await review.locator('[data-author-note]').fill('原文を見て、私はこの思いがつながると感じる <script>alert(1)</script>');
  await review.locator('[data-author-decision="confirmed"]').click();
  assert.match(await page.locator('.semantic-status').innerText(),/本人確認済み 1組/);
  assert.equal(await page.locator('.semantic-link.author-confirmed').count(),1,'only explicitly affirmed link receives gold');
  assert.match(await page.locator('.semantic-discovery-progress').innerText(),/1\s*\/\s*2/);
  assert.ok(!(await page.locator('.semantic-discovery-card').innerText()).includes('日々の異なる見え方'),'confirmed card automatically leaves the reading queue');
  assert.equal(await page.locator('.semantic-star.author-affirmed').count(),2,'both endpoints of the affirmed feeling shine');
  assert.equal(await page.locator('.semantic-author-review script').count(),0,'owner note must remain inert text');
  await page.locator('[data-semantic-line-view="confirmed"]').click();
  assert.equal(await page.locator('.semantic-link').count(),1,'confirmed-only mode must hide unreviewed links');
  await page.locator('[data-semantic-line-view="all"]').click();
  const secondRelation=page.locator('.semantic-related').filter({hasText:'対照として読む'});
  await secondRelation.locator('.semantic-author-review [data-author-note]').fill('この線は、まだ違う意味に思えます。');
  await secondRelation.locator('[data-author-decision="different"]').click();
  assert.equal(await page.locator('.semantic-link.author-different').count(),1);
  assert.match(await page.locator('.semantic-related').filter({hasText:'対照として読む'}).locator('.semantic-author-review-heading').innerText(),/別の思いに見える/);
  assert.match(await page.locator('.semantic-discovery-progress').innerText(),/2\s*\/\s*2/);
  assert.match(await page.locator('.semantic-discovery-empty').innerText(),/すべて判断を記録済み/);
  const savedNote=page.locator('.semantic-related').filter({hasText:'日々の異なる見え方'}).locator('[data-author-note]');
  assert.match(await savedNote.inputValue(),/この思いがつながる/,'saved author note returns on redraw');
  assert.equal(await page.locator('.semantic-stars-svg img').count(),0,'private title must not become an HTML image element');
  assert.match(await page.locator('.semantic-stars-svg').innerHTML(),/&lt;img/,'unsafe characters must be escaped');
  await page.locator('.semantic-star[data-star-focus="master-fictional-050"] .semantic-star-hit').click();
  assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲051/);
  await page.locator('.semantic-star-name[data-star-focus="master-fictional-000"]').click();
  assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲001/,'tap on title should select the star');
  await page.locator('.semantic-star-name[data-star-focus="master-fictional-050"]').press('Enter');
  assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲051/,'keyboard selection of the star label works');
  await page.locator('[data-semantic-scope="near"]').click();
  assert.ok(await page.locator('.semantic-star').count()<168,'near view limits the visible neighborhood');
  await page.locator('[data-semantic-scope="all"]').click();
  assert.equal(await page.locator('.semantic-star').count(),168);
  await page.locator('#semanticStarSearch').fill('検証曲121');
  await page.locator('[data-semantic-action="search"]').click();
  assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲121/);
  await page.locator('[data-semantic-layout="gravity"]').click();
  assert.equal(await page.locator('.semantic-star').count(),168,'meaning layout retains the whole catalog');
  assert.equal(await page.locator('.semantic-star.no-relation').count(),163,'five source-backed stars connected through two direct comparisons and three thematic routes');
  assert.match(await page.locator('[data-semantic-layout="gravity"]').getAttribute('class'),/active/);
  const beforeCoord=await page.locator('.semantic-star[data-star-focus="master-fictional-000"] .semantic-star-core').getAttribute('cx');
  await page.locator('[data-atlas-open="synthetic-memory"]').click();
  assert.match(await page.locator('.semantic-path-story').innerText(),/記憶の星座/);
  assert.match(await page.locator('.semantic-atlas-overlapping').innerText(),/暮らしの星座/);
  assert.match(await page.locator('.semantic-atlas-overlapping').innerText(),/2作品が重なる/);
  await page.locator('.semantic-atlas-overlapping [data-atlas-open="synthetic-care"]').click();
  assert.match(await page.locator('.semantic-path-story').innerText(),/暮らしの星座/);
  await page.locator('#semanticPath').selectOption('synthetic-care');
   assert.equal(await page.locator('.semantic-theme-route').count(),2,'guided path draws 2 dashed segments');
   assert.equal(await page.locator('.semantic-star.in-theme').count(),3,'3 source-backed songs light up');
   assert.match(await page.locator('.semantic-path-story').innerText(),/暮らしの星座/);
   assert.match(await page.locator('.semantic-step-anchor').innerText(),/この歌は架空の歌詞です/);
   assert.match(await page.locator('.semantic-step-anchor').innerText(),/第一の星の読み/);
   await page.locator('.semantic-theme-explanation summary').click();
   assert.match(await page.locator('.semantic-theme-explanation').innerText(),/根拠から読む架空の星座仮説/);
   assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲001/);
   await page.locator('.semantic-path-story [data-semantic-action="next"]').click();
   assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲051/,'guided next song follows stored path order');
   assert.match(await page.locator('.semantic-step-anchor').innerText(),/第二の星の読み/);
   await page.locator('.semantic-path-story [data-semantic-action="prev"]').click();
   assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲001/,'go back to previous source-backed song');
   await page.locator('.semantic-path-story [data-semantic-action="next"]').click();
   assert.equal(await page.locator('.semantic-star[data-star-focus="master-fictional-000"] .semantic-star-core').getAttribute('cx'),beforeCoord,'meaning positions are stable when choosing another star');
   assert.match(await page.locator('.semantic-memberships').innerText(),/暮らしの星座/);
   assert.match(await page.locator('.semantic-memberships').innerText(),/架空EPの読解/);
   await page.locator('.semantic-memberships [data-atlas-open="rap-ep1-fictional"]').click();
   assert.match(await page.locator('.semantic-path-story').innerText(),/架空EPの読解/,'one song opens a different constellation');
   assert.equal(await page.locator('.semantic-theme-route').count(),1);
   await page.locator('.semantic-memberships [data-atlas-open="synthetic-care"]').click();
   assert.match(await page.locator('.semantic-path-story').innerText(),/暮らしの星座/);
   await page.locator('[data-semantic-mode="words"]').click();
  assert.match(await page.locator('.semantic-toolbar').innerText(),/同じ一行/);
   assert.ok(await page.locator('.semantic-link').count()>0,'only whole-line equal text creates literal links');
   assert.equal(await page.locator('.semantic-related .semantic-author-review').count(),0,'literal textual matches must not open author-meaning judgment forms');
  await page.locator('[data-semantic-mode="meaning"]').click();
  await page.locator('[data-semantic-action="reset"]').click();
  assert.equal(await page.locator('.semantic-star').count(),168);
  assert.equal(await page.locator('.semantic-theme-route').count(),0,'reset clears themed sky lines');
  await page.locator('[data-semantic-action="unlinked"]').click();
  assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲002/,'discover a truly unlinked song');
  await page.locator('[data-semantic-action="reset"]').click();
  await page.locator('#semanticStarSearch').fill('検証曲051');
  await page.locator('[data-semantic-action="search"]').click();
  await page.locator('[data-semantic-action="journey-start"]').click();
  assert.match(await page.locator('.semantic-journey-hint').first().innerText(),/検証曲051/);
  await page.locator('#semanticStarSearch').fill('検証曲096');
  await page.locator('[data-semantic-action="search"]').click();
  await page.locator('[data-semantic-action="journey-connect"]').click();
  assert.equal(await page.locator('.semantic-journey-route').count(),2,'route highlights only the two evidence-backed hops');
  assert.equal(await page.locator('.semantic-journey-result li').count(),3,'route lists all three songs');
  assert.match(await page.locator('.semantic-journey-result').innerText(),/日々の異なる見え方/);
  assert.match(await page.locator('.semantic-journey-result').innerText(),/対照として読む/);
  await page.locator('.semantic-journey-result li').first().locator('button[data-star-focus]').click();
  assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲051/,'a stop on the new journey is clickable');
   const after=await page.evaluate(()=>{
   const local=JSON.stringify(localStorage);
   masterReadingWorks=[];cloudUser=null;render();
   return {leak:document.getElementById('screen').textContent.includes('検証曲001'),
    stored:local.includes('検証曲001'),themeLeak:document.getElementById('screen').textContent.includes('記憶の星座')||document.getElementById('screen').textContent.includes('暮らしの星座')||document.getElementById('screen').textContent.includes('第一の星の読み'),reviewLeak:document.getElementById('screen').textContent.includes('原文を見て、私はこの思い'),metaStars:document.querySelectorAll('.semantic-network-star').length,remaining:document.querySelectorAll('.semantic-star').length};
  });
  assert.equal(after.leak,false,'private star names vanish after logout');
  assert.equal(after.stored,false,'private star data is not stored in local storage');
   assert.equal(after.themeLeak,false,'private thematic path never remains on logout');
   assert.equal(after.reviewLeak,false,'private author notes never remain on logout');
  assert.equal(after.remaining,0,'private stars vanish after logout');
  assert.equal(after.metaStars,0,'private thematic map clears on logout');
  assert.equal(errors.length,0,'uncaught browser JS errors: '+errors.join(' | '));
  console.log('semantic starfield PASS '+(mobile?'mobile':'desktop')+
   ': 168 stars, 2 verified-source comparisons, search, near/all, modes, logout privacy');
 }finally{
  await context.close();await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
(async()=>{await run(false);await run(true);})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
