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
   const catalog=[],texts=[],relations=[];
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
   cloudEpoch++;cloudUser={id:uid};const epoch=cloudEpoch;
   cloudClient={from(table){return {select(){return this},eq(){return this},not(){return this},
    order(){return table==='lyric_master_works'?Promise.resolve({data:catalog,error:null}):this},
    limit(){return Promise.resolve({data:table==='lyric_cross_readings'?relations:texts,error:null})}
   }}};
   await loadMasterReadingCorpus(cloudUser,epoch);
  });
  assert.equal(await page.locator('.semantic-star').count(),168,'all 168 songs must appear as stars');
  assert.match(await page.locator('.semantic-status').innerText(),/2組/,'links come from semantic data');
  assert.equal(await page.locator('.semantic-link.focused').count(),2,'selected star highlights two evidence-backed lines');
  assert.match(await page.locator('.semantic-focus-panel').innerText(),/日々の異なる見え方/);
  await page.locator('.semantic-related details summary').first().click();
  assert.match(await page.locator('.semantic-related details').first().innerText(),/架空の精読仮説/);
  assert.equal(await page.locator('.semantic-stars-svg img').count(),0,'private title must not become an HTML image element');
  assert.match(await page.locator('.semantic-stars-svg').innerHTML(),/&lt;img/,'unsafe characters must be escaped');
  await page.locator('[data-star-focus="master-fictional-050"]').first().click();
  assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲051/);
  await page.locator('[data-semantic-scope="near"]').click();
  assert.ok(await page.locator('.semantic-star').count()<168,'near view limits the visible neighborhood');
  await page.locator('[data-semantic-scope="all"]').click();
  assert.equal(await page.locator('.semantic-star').count(),168);
  await page.locator('#semanticStarSearch').fill('検証曲121');
  await page.locator('[data-semantic-action="search"]').click();
  assert.match(await page.locator('.semantic-focus-panel h2').innerText(),/検証曲121/);
  await page.locator('[data-semantic-mode="words"]').click();
  assert.match(await page.locator('.semantic-toolbar').innerText(),/共通語の線/);
  await page.locator('[data-semantic-mode="meaning"]').click();
  await page.locator('[data-semantic-action="reset"]').click();
  assert.equal(await page.locator('.semantic-star').count(),168);
  const after=await page.evaluate(()=>{
   const local=JSON.stringify(localStorage);
   masterReadingWorks=[];cloudUser=null;render();
   return {leak:document.getElementById('screen').textContent.includes('検証曲001'),
    stored:local.includes('検証曲001'),remaining:document.querySelectorAll('.semantic-star').length};
  });
  assert.equal(after.leak,false,'private star names vanish after logout');
  assert.equal(after.stored,false,'private star data is not stored in local storage');
  assert.equal(after.remaining,0,'private stars vanish after logout');
  assert.equal(errors.length,0,'uncaught browser JS errors: '+errors.join(' | '));
  console.log('semantic starfield PASS '+(mobile?'mobile':'desktop')+
   ': 168 stars, 2 verified-source comparisons, search, near/all, modes, logout privacy');
 }finally{
  await context.close();await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
(async()=>{await run(false);await run(true);})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
