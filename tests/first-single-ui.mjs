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
    await context.close();
    log(engine+" homepage pre-release", "no spoiler popup");
  }
  {
    const {context,page}=await freshWithDate("2026-11-22T12:00:00+09:00");
    const modal=page.locator("#first-single-announcement");
    await modal.waitFor({state:"visible"});
    assert.equal(await page.locator("#first-single-topic").isVisible(),true);
    await page.locator("#first-single-announcement-close").click();
    assert.equal(await modal.isVisible(),false);
    assert.equal(await page.locator(".countdown-announced-link").isVisible(),true);
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
 }finally{await browser.close();}
}
await testEngine(chromium,"chromium");
await testEngine(webkit,"webkit");
console.log("ALL FIRST SINGLE BROWSER TESTS PASSED");
