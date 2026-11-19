// First Single — local browser regression tests (runs only against a local HTTP server).
// node tests/first-single-ui.mjs
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const BASE = process.env.UI_BASE_URL || "http://127.0.0.1:8765";
const output = "test-results/first-single";
await mkdir(output, { recursive: true });
const log = (name, detail="") => console.log("PASS "+name+(detail?" : "+detail:""));

async function checkColumn(page, engine, width) {
  const coords = await page.locator(".release-words .secret-char").evaluateAll(els =>
    els.map(el=>({x:el.getBoundingClientRect().left,y:el.getBoundingClientRect().top,text:el.textContent.trim()})));
  assert.equal(coords.length,8, "exactly eight selectable letters");
  assert.equal(coords.map(o=>o.text).join(""),"けっこんしました");
  const spread = Math.max(...coords.map(o=>o.x)) - Math.min(...coords.map(o=>o.x));
  assert.ok(spread <= 1.25, engine+" at "+width+": column drift "+spread.toFixed(2)+"px");
  const viewport = await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(viewport.scroll<=viewport.client+1.5,engine+" at "+width+": horizontal overflow");
  log(engine+" "+width+"px", "column drift "+spread.toFixed(2)+"px; no overflow");
}

async function exerciseShare(page,engine) {
  await page.locator(".secret-char").nth(2).click();
  assert.equal(await page.locator(".release-words").evaluate(el=>el.classList.contains("secret-active")),true);
  await page.waitForTimeout(1300);
  await page.locator("#for-this-release").screenshot({path:output+"/"+engine+"-revealed-words.png",animations:"disabled"});
  await page.locator("#secret-open").waitFor({state:"visible"});
  await page.locator("#secret-open").click();
  assert.equal(await page.locator("#release-share-modal").isVisible(),true);
  const assertImage = async (layout,dimensions)=>{
    const img = page.locator("#release-generated-image");
    const oldSrc = await img.getAttribute("src");
    await page.locator('[data-image-layout="'+layout+'"]').click();
    await img.waitFor({state:"visible"});
    await page.waitForFunction(prev=>{const i=document.getElementById("release-generated-image");return i.getAttribute("src")!==prev&&i.complete&&i.naturalWidth>0;},oldSrc);
    const actual = await img.evaluate(i=>[i.naturalWidth,i.naturalHeight]);
    assert.deepEqual(actual,dimensions,engine+" "+layout+" image size");
    const href = await page.locator("#release-download").getAttribute("href");
    assert.ok(href.startsWith("blob:"),"download should contain PNG");
    const [download]=await Promise.all([
      page.waitForEvent("download"),
      page.locator("#release-download").click()
    ]);
    await download.saveAs(output+"/"+engine+"-"+layout+"-export.png");
    log(engine+" "+layout+" PNG",actual.join("×")+"; download verified");
  };
  await assertImage("feed",[1080,1350]);
  await assertImage("story",[1080,1920]);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#release-share-modal").isVisible(),false);
  await page.locator("#secret-clear").click();
  assert.equal(await page.locator(".release-words").evaluate(el=>el.classList.contains("secret-active")),false);
  log(engine+" reveal/share/escape/clear");
}

async function checkTeaser(browser,engine){
 const url=BASE+"/releases/2026-11-22/";
 const fixture={
   youtubeChannelUrl:"https://www.youtube.com/channel/UC3mLzMQottVyAoX3goOAouA",
   teasers:[{id:"intro",title:"《これからも》 INTRO",youtubeUrl:"https://www.youtube.com/watch?v=AbC_123xYz0",audioUrl:null},
     {id:"chorus",title:"《これからも》 CHORUS",youtubeUrl:null,audioUrl:null}]
 };
 {
  const page=await browser.newPage({viewport:{width:375,height:840}});
  await page.goto(url,{waitUntil:"networkidle"});
  assert.equal(await page.locator("#teaser").isVisible(),false,"unpublished teaser must not render");
  assert.equal(await page.locator("#hero-teaser-link").isVisible(),false,"do not claim an unpublished teaser exists");
  assert.equal(await page.locator(".release-youtube-channel").isVisible(),true,"YouTube channel link always visible");
  assert.equal(await page.locator(".hero + #for-this-release").count(),1,"release essay keeps priority");
  await page.close();
  log(engine+" teaser pending","no false promise; channel remains linked");
 }
 {
  const page=await browser.newPage({viewport:{width:375,height:840}});
  await page.route("**/assets/releases/first-single-media.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixture)}));
  await page.route("**/www.youtube-nocookie.com/**",route=>route.abort());
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.locator("#teaser").waitFor({state:"visible"});
  assert.equal(await page.locator("#hero-teaser-link").isVisible(),true);
  assert.equal(await page.locator(".release-teaser-item").count(),1,"only released teaser should appear");
  assert.equal(await page.locator(".release-teaser-item a").first().getAttribute("href"),fixture.teasers[0].youtubeUrl);
  await page.locator(".release-teaser-player button").first().click();
  assert.ok((await page.locator(".release-teaser-player iframe").getAttribute("src")).includes("AbC_123xYz0"));
  await page.close();
  log(engine+" teaser published","direct watch URL + lazy playback + no pending chorus");
 }
 {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route("**/assets/releases/first-single-media.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({teasers:[{id:"intro",title:"《これからも》 INTRO",youtubeUrl:null,audioUrl:"/assets/releases/teaser.mp3"}]})}));
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.locator("#teaser").waitFor({state:"visible"});
  assert.equal(await page.locator(".release-teaser-player audio").count(),1);
  assert.equal(await page.locator(".release-teaser-player iframe").count(),0);
  await page.close();
  log(engine+" audio teaser","HTML audio control is offered for a valid configured audio file");
 }
 {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route("**/assets/releases/first-single-media.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixture)}));
  await page.goto(BASE+"/releases/",{waitUntil:"domcontentloaded"});
  await page.locator("#releases-teaser-link").waitFor({state:"visible"});
  assert.equal(await page.locator(".release-secondary-link").count(),2);
  await page.close();
  log(engine+" releases listing","teaser and channel paths visible");
 }
 {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
  const page=await context.newPage();
  await page.route("**/assets/releases/first-single-media.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixture)}));
  await page.addInitScript(()=>{
   const NativeDate=Date;
   class FixedDate extends NativeDate{
     constructor(...args){super(...(args.length?args:["2026-11-22T12:00:00+09:00"]));}
     static now(){return new NativeDate("2026-11-22T12:00:00+09:00").valueOf();}
   }
   globalThis.Date=FixedDate;
  });
  await page.goto(BASE+"/",{waitUntil:"domcontentloaded"});
  await page.locator("#first-single-popup-teaser").waitFor({state:"visible"});
  assert.equal(await page.locator("#first-single-popup-teaser").getAttribute("href"),fixture.teasers[0].youtubeUrl);
  await context.close();
  log(engine+" popup teaser","release-day direct teaser CTA");
 }
}

async function checkArtworkContest(browser,engine){
 const widths=[240,320,375,768,1440];
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
  await page.goto(BASE+"/releases/artwork-project/",{waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("h1").innerText(),"ジャケットを\n募集します。");
  assert.equal(await page.locator(".track-card").count(),2);
  assert.equal(await page.locator(".track-card .track-links a").count(),4);
  assert.equal(await page.locator("form#artwork-entry-form").getAttribute("method"),"POST");
  assert.equal(await page.locator("form#artwork-entry-form").getAttribute("action"),"https://formspree.io/f/xbgjraga");
  assert.equal(await page.locator('input[name="artwork_url"]').count(),0,"no image URL request at initial contact");
  assert.equal(await page.locator('input[type="file"]').count(),0,"no artwork file request");
  assert.equal(await page.locator("#graduation-consent").count(),1);
  assert.ok((await page.locator("main").innerText()).includes("中学校を卒業された方"));
  const bounds=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  assert.ok(bounds[0]<=bounds[1]+1.5,engine+" contest horizontal overflow "+width);
  assert.equal(await page.locator("#artwork-entry-form").evaluate(form=>form.checkValidity()),false,"empty message must fail");
  assert.equal(await page.locator("#data-consent").count(),1,"data-handling disclosure must be accepted");
  assert.ok((await page.locator("#data-policy").innerText()).includes("Formspree"));
  assert.ok((await page.locator("#data-policy").innerText()).includes("削除"));
  if(width===375)await page.screenshot({path:output+"/"+engine+"-artwork-contest-375.png",fullPage:true,animations:"disabled"});
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
 await page.goto(BASE+"/releases/artwork-project/",{waitUntil:"domcontentloaded"});
 await page.locator("#artist-name").fill("Test Artist");
 await page.locator("#artist-email").fill("sample@example.com");
 await page.locator("#artwork-song").selectOption("両方");
 await page.locator("#artwork-message").fill("二曲のジャケットを描いてみたいです。ご連絡ください。");
 await page.locator("#graduation-consent").check();
 assert.equal(await page.locator("#artwork-entry-form").evaluate(form=>form.checkValidity()),false,"privacy consent required");
 await page.locator("#data-consent").check();
 assert.equal(await page.locator("#artwork-entry-form").evaluate(form=>form.checkValidity()),true,"valid interest message");
 let post=null;
 await page.route("https://formspree.io/f/xbgjraga",async route=>{
  post={method:route.request().method(),body:route.request().postData()};
  await route.fulfill({status:200,contentType:"text/html",body:"<p>Test success</p>"});
 });
 await page.locator("#artwork-entry-form button[type=submit]").click();
 await page.waitForURL("https://formspree.io/f/xbgjraga");
 assert.equal(post?.method,"POST");
 assert.ok(post?.body?.includes("first-single-artwork-interest-2026"));
 assert.ok(post?.body?.includes("junior_high_graduated"));
 assert.ok(post?.body?.includes("Test Artist"));
 assert.ok(post?.body?.includes("message"));
 assert.ok(!post?.body?.includes("artwork_url"),"no artwork link is collected");
 await page.close();
 const listing=await browser.newPage({viewport:{width:390,height:844}});
 await listing.goto(BASE+"/releases/",{waitUntil:"domcontentloaded"});
 assert.equal(await listing.locator('a[href="/releases/artwork-project/"]').count(),1,"catalog interest link");
 await listing.close();
 log(engine+" artwork interests","5 widths; graduate-only interest message; intercepted POST; catalog link");
}

async function checkUcnucThanks(browser,engine){
 for(const width of [320,375,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
  await page.goto(BASE+"/special-thanks/ucnuc/",{waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("h1").innerText(),"UCNUC");
  assert.ok((await page.locator("main").innerText()).includes("marty"));
  assert.ok((await page.locator("main").innerText()).includes("録音からミックス"));
  assert.equal(await page.locator('a[href="https://ucnuc.jp/"]').count(),1);
  assert.equal(await page.locator('a[href="/releases/2026-11-22/"]').count()>=1,true);
  assert.ok(!(await page.locator("main").innerText()).includes("マスタリング"),"unconfirmed mastering is not attributed");
  const doc=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  assert.ok(doc[0]<=doc[1]+1.5,engine+" UCNUC horizontal overflow "+width);
  if(width===375)await page.screenshot({path:output+"/"+engine+"-ucnuc-375.png",fullPage:true,animations:"disabled"});
  await page.close();
 }
 const index=await browser.newPage();
 await index.goto(BASE+"/special-thanks/",{waitUntil:"domcontentloaded"});
 assert.equal(await index.locator('a[href="/special-thanks/ucnuc/"]').count(),1,"SPECIAL THANKS contains UCNUC");
 await index.close();
 const release=await browser.newPage();
 await release.goto(BASE+"/releases/2026-11-22/",{waitUntil:"domcontentloaded"});
 assert.equal(await release.locator('.ucnuc-credit a[href="/special-thanks/ucnuc/"]').count(),1,"release links to recording acknowledgement");
 await release.close();
 log(engine+" UCNUC special thanks","4 widths; studio credits; release and index backlinks");
}

async function checkLyrics(page,engine){
  await page.goto(BASE+"/lyrics/#korekaramo",{waitUntil:"domcontentloaded"});
  await page.locator("#korekaramo").waitFor();
  assert.equal(await page.locator(".lyrics-item").count(),12);
  assert.equal(await page.locator("#korekaramo").evaluate(el=>el.open),true,"direct link should expand lyrics");
  await page.locator("#korekaramo .poem-share-begin").click();
  await page.locator("#korekaramo .poem-line").first().click();
  await page.locator("#phrase-share").click();
  assert.equal(await page.locator("#share-modal").isVisible(),true,"existing lyric share modal opens");
  log(engine+" lyric share","12 poems; deep-link; selection");
}

async function checkHomepage(browser,engine){
  async function freshWithDate(iso) {
    const context = await browser.newContext({viewport:{width:390,height:840}, reducedMotion:"reduce"});
    const page=await context.newPage();
    await page.addInitScript(({fixed})=>{
      const NativeDate=Date;
      class FixedDate extends NativeDate {
        constructor(...args){super(...(args.length?args:[fixed]));}
        static now(){return new NativeDate(fixed).valueOf();}
      }
      globalThis.Date=FixedDate;
    },{fixed:iso});
    await page.goto(BASE+"/",{waitUntil:"domcontentloaded"});
    return {context,page};
  }
  {
    const {context,page}=await freshWithDate("2026-11-21T12:00:00+09:00");
    assert.equal(await page.locator("#first-single-announcement").isVisible(),false);
    assert.equal(await page.locator("#artwork-contest-topic").isVisible(),false,"no public contest announcement before November 22");
    await context.close();
    log(engine+" homepage pre-release", "no spoiler popup");
  }
  {
    const {context,page}=await freshWithDate("2026-11-22T12:00:00+09:00");
    const modal=page.locator("#first-single-announcement");
    await modal.waitFor({state:"visible"});
    assert.equal(await page.locator("#first-single-topic").isVisible(),true);
    assert.equal(await page.locator("#artwork-contest-topic").isVisible(),true,"artwork contest public on November 22");
    await page.locator("#first-single-announcement-close").click();
    assert.equal(await modal.isVisible(),false);
    assert.equal(await page.locator(".countdown-announced-link").isVisible(),true);
    assert.equal(await page.locator(".countdown-youtube-link").isVisible(),true,"home channel link remains after dismissing popup");
    const docWidth=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
    assert.ok(docWidth[0]<=docWidth[1]+1.5,"no homepage horizontal overflow after release");
    await page.reload({waitUntil:"domcontentloaded"});
    assert.equal(await modal.isVisible(),false,"popup shown once per visitor");
    await context.close();
    log(engine+" homepage announcement", "first visit only; permanent CTA");
  }
}

async function testEngine(engineType,engine){
 const browser=await engineType.launch({headless:true});
 try{
  for(const width of [240,320,375,390,430,768,1024,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
   await page.goto(BASE+"/releases/2026-11-22/",{waitUntil:"domcontentloaded"});
   await page.locator(".release-words .secret-char").first().waitFor();
   assert.equal(await page.locator("h2.release-statement-heading").innerText(),"FOR THIS RELEASE");
   assert.equal(await page.locator("#preview").count(),0,"premature preview removed");
   assert.equal(await page.locator("h2:has-text('まず、音楽から。')").count(),0,"unwanted heading removed");
   assert.equal(await page.locator(".hero + .editorial-note").count(),1,"statement follows jacket directly");
   const fontSize=await page.locator(".release-words").evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
   assert.ok(fontSize>=15,"release statement is visually legible at width "+width);
   if(width===375||width===768||width===1440){
     await page.locator("#for-this-release").screenshot({path:output+"/"+engine+"-statement-"+width+".png",animations:"disabled"});
   }
   await checkColumn(page,engine,width);
   if(width===375){
    await exerciseShare(page,engine);
    await page.screenshot({path:output+"/"+engine+"-mobile.png",fullPage:true,animations:"disabled"});
   }
   if(width===768)await page.screenshot({path:output+"/"+engine+"-ipad.png",fullPage:true,animations:"disabled"});
   if(width===1440)await page.screenshot({path:output+"/"+engine+"-desktop.png",fullPage:true,animations:"disabled"});
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:375,height:860}});
  await checkLyrics(page,engine);
  await page.close();
  await checkHomepage(browser,engine);
  await checkTeaser(browser,engine);
  await checkArtworkContest(browser,engine);
  await checkUcnucThanks(browser,engine);
 }finally{await browser.close();}
}
await testEngine(chromium,"chromium");
await testEngine(webkit,"webkit");
console.log("ALL FIRST SINGLE BROWSER TESTS PASSED");
