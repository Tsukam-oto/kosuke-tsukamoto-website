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
   ': navigate → close read → source citation → save → reload → restore → pending excluded');
 } finally {await context.close()}
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
 } finally {
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
 }
})().catch(err=>{console.error(err.stack||String(err));process.exitCode=1});
