// First Single — local browser regression tests (runs only against a local HTTP server).
// node tests/first-single-ui.mjs
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";

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
  if(width<=700){
    assert.equal(await page.locator(".release-words").evaluate(el=>el.classList.contains("secret-active")),false,"the eight character column is formed in untouched normal text");
    const steps=coords.slice(1).map((o,i)=>o.y-coords[i].y);
    const variance=Math.max(...steps)-Math.min(...steps);
    assert.ok(variance<=2.0,engine+" "+width+"px: uneven original-state vertical rhythm "+variance.toFixed(2)+"px");
    const layout=await page.locator(".release-words").evaluate(el=>getComputedStyle(el).gridAutoRows);
    assert.equal(layout,"1fr",engine+" untouched prose must use equal-height grid tracks");
    assert.ok(await page.locator(".release-words .note-line").first().evaluate(el=>el.textContent.includes("大切に思っていても")),"long prose is fully present in untouched state");
  }
  const viewport = await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(viewport.scroll<=viewport.client+1.5,engine+" at "+width+": horizontal overflow");
  log(engine+" "+width+"px", "column drift "+spread.toFixed(2)+"px; no overflow");
}

async function checkLandscapeStatement(browser,engine){
  for(const [width,height] of [[667,375],[844,390],[956,440]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce"});
    await page.goto(BASE+"/releases/2026-11-22/#for-this-release",{waitUntil:"domcontentloaded"});
    const lines=page.locator(".release-words .note-line");
    await lines.first().waitFor();
    const textBefore=await lines.allTextContents();
    assert.equal(textBefore.length,8,"all eight original lines remain visible in landscape");
    const measurements=await page.evaluate(()=>{
      const block=document.querySelector("#for-this-release");
      const words=document.querySelector(".release-words");
      const chars=[...words.querySelectorAll(".secret-char")].map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y}));
      return {font:parseFloat(getComputedStyle(words).fontSize),layout:getComputedStyle(words).gridAutoRows,
        blockHeight:block.getBoundingClientRect().height,
        scrollWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,
        xDrift:Math.max(...chars.map(x=>x.x))-Math.min(...chars.map(x=>x.x)),
        steps:chars.slice(1).map((p,i)=>p.y-chars[i].y)};
    });
    assert.ok(measurements.font>=14&&measurements.font<=16.1,engine+" horizontal phone text must remain readable without desktop scaling "+width+"x"+height);
    assert.equal(measurements.layout,"1fr",engine+" horizontally rotated phone still aligns its eight natural text lines");
    assert.ok(measurements.xDrift<=1.25,engine+" landscape secret text column remains straight");
    assert.ok(Math.max(...measurements.steps)-Math.min(...measurements.steps)<=2,engine+" landscape line rhythm must remain even");
    assert.ok(measurements.scrollWidth<=measurements.viewportWidth+1.5,engine+" landscape document must not scroll sideways");
    if(width>=844)assert.ok(measurements.blockHeight<=height,engine+" landscape statement should fit a short viewport: "+measurements.blockHeight);
    if(width===844)await page.locator("#for-this-release").screenshot({path:output+"/"+engine+"-landscape-before-844.png",animations:"disabled"});
    await page.locator(".release-words .secret-char").nth(2).click();
    assert.equal(await page.locator(".release-words").evaluate(el=>el.classList.contains("secret-active")),true);
    const activated=await page.locator(".release-words .secret-char").evaluateAll(els=>els.map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y})));
    assert.ok(Math.max(...activated.map(a=>a.x))-Math.min(...activated.map(a=>a.x))<=1.25,engine+" touched landscape characters form a straight column");
    assert.ok(activated[7].y-activated[0].y<=250,engine+" touched eight-letter reveal remains compact in landscape");
    assert.deepEqual(await lines.allTextContents(),textBefore,"landscape touch does not mutate original prose");
    if(width===844)await page.locator("#for-this-release").screenshot({path:output+"/"+engine+"-landscape-revealed-844.png",animations:"disabled"});
    await page.locator("#secret-clear").click();
    assert.equal(await page.locator(".release-words").evaluate(el=>el.classList.contains("secret-active")),false);
    assert.deepEqual(await lines.allTextContents(),textBefore,"landscape clear restores the original full text");
    await page.close();
    log(engine+" landscape "+width+"x"+height,"legible original text, aligned eight letters, touch/share behavior preserved");
  }
}

async function exerciseShare(page,engine) {
  const sourceLines=await page.locator(".release-words .note-line").allTextContents();
  assert.equal(sourceLines.length,8,"the original editorial note remains eight complete lines");
  await page.locator(".secret-char").nth(2).click();
  assert.equal(await page.locator(".release-words").evaluate(el=>el.classList.contains("secret-active")),true);
  await page.waitForTimeout(1300);
  const column=await page.locator(".release-words .secret-char").evaluateAll(els=>els.map(el=>({x:el.getBoundingClientRect().left,y:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height,letter:el.textContent.trim()})));
  assert.equal(column.map(ch=>ch.letter).join(""),"けっこんしました","the original eight buttons still spell the exact secret");
  assert.ok(Math.max(...column.map(ch=>ch.x))-Math.min(...column.map(ch=>ch.x))<=1.25,"touch reveal has a straight vertical character column");
  assert.ok(column.every((ch,i)=>i===0||(ch.y-column[i-1].y>=30&&ch.y-column[i-1].y<=48)),"mobile reveal has compact, regularly spaced rows");
  assert.ok(column[7].y-column[0].y<=350,"all eight touched characters fit in one mobile viewport");
  assert.deepEqual(await page.locator(".release-words .note-line").allTextContents(),sourceLines,"all original text stays unchanged after reveal");
  assert.equal(await page.locator(".release-words .note-line .tail").first().evaluate(el=>getComputedStyle(el).textOverflow),"ellipsis","long prose is visually clipped, not deleted, during reveal");
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
  assert.deepEqual(await page.locator(".release-words .note-line").allTextContents(),sourceLines,"clearing restores original prose");
  assert.notEqual(await page.locator(".release-words .note-line .tail").first().evaluate(el=>getComputedStyle(el).textOverflow),"ellipsis","full lines are readable again after clear");
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
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.locator("#teaser").waitFor({state:"visible"});
  assert.equal(await page.locator("#hero-teaser-link").isVisible(),true,"actual published Shorts teaser is linked");
  assert.equal(await page.locator(".release-teaser-item").count(),1,"exactly one verified teaser is published");
  assert.equal(await page.locator(".release-teaser-item h3").innerText(),"1st EP TEASER");
  assert.equal(await page.locator(".release-teaser-item a").first().getAttribute("href"),"https://youtube.com/shorts/9sHQVSQfBnc");
  assert.equal(await page.locator(".release-youtube-channel").isVisible(),true,"YouTube channel link always visible");
  assert.equal(await page.locator(".hero + #for-this-release").count(),1,"release essay keeps priority");
  await page.close();
  log(engine+" published Shorts teaser","YouTube short 9sHQVSQfBnc is linked, no placeholder videos");
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
  assert.equal(await page.locator(".release-secondary-link").count(),3,"teaser, YouTube, and TikTok links are available");
  assert.equal(await page.locator('.release-secondary-link[href="https://www.tiktok.com/@tsukam.oto.kos"]').count(),1,"official TikTok destination remains available");
  assert.equal(await page.locator('.release-secondary-link[href="https://www.youtube.com/channel/UC3mLzMQottVyAoX3goOAouA"]').count(),1,"official YouTube destination remains available");
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
 {
  // A YouTube channel URL is not a playable video; it must not activate a teaser CTA.
  const bad={teasers:[{id:"intro",title:"《これからも》 INTRO",youtubeUrl:"https://www.youtube.com/",audioUrl:null}]};
  for(const [path,selector] of [
    ["/releases/2026-11-22/","#hero-teaser-link"],
    ["/releases/","#releases-teaser-link"]
  ]){
    const page=await browser.newPage({viewport:{width:375,height:844}});
    await page.route("**/assets/releases/first-single-media.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(bad)}));
    await page.goto(BASE+path,{waitUntil:"networkidle"});
    assert.equal(await page.locator(selector).isVisible(),false,engine+" invalid video URL must not show "+selector);
    await page.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
  const page=await context.newPage();
  await page.route("**/assets/releases/first-single-media.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(bad)}));
  await page.addInitScript(()=>{
    const NativeDate=Date;class FixedDate extends NativeDate{
      constructor(...args){super(...(args.length?args:["2026-11-22T12:00:00+09:00"]));}
      static now(){return new NativeDate("2026-11-22T12:00:00+09:00").valueOf();}
    }globalThis.Date=FixedDate;
  });
  await page.goto(BASE+"/",{waitUntil:"networkidle"});
  assert.equal(await page.locator("#first-single-popup-teaser").isVisible(),false,"invalid popup teaser URL must remain hidden");
  await context.close();
  log(engine+" invalid teaser URLs","no false playable links on release, catalog, or homepage");
 }
 {
  // The local audio file must remain usable when a video URL is invalid.
  const fixture={teasers:[{id:"intro",title:"《これからも》 INTRO",youtubeUrl:"https://www.youtube.com/",audioUrl:"/assets/releases/teaser.mp3"}]};
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route("**/assets/releases/first-single-media.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixture)}));
  await page.goto(BASE+"/releases/",{waitUntil:"networkidle"});
  assert.equal(await page.locator("#releases-teaser-link").isVisible(),true,"valid audio must activate catalog teaser CTA");
  await page.close();
  log(engine+" teaser audio fallback","valid audio survives invalid video URL");
 }
}

async function checkEPFeedback(browser,engine){
 for(const width of [320,375,768,1440]){
  const page=await browser.newPage({viewport:{width,height:860},reducedMotion:"reduce"});
  await page.goto(BASE+"/releases/2026-11-22/",{waitUntil:"domcontentloaded"});
  const form=page.locator("#ep-feedback-form");
  assert.equal(await form.count(),1,engine+" one dedicated EP feedback form");
  assert.equal(await form.getAttribute("method"),"POST");
  assert.equal(await form.getAttribute("action"),"https://formspree.io/f/xbgjraga");
  assert.equal(await page.locator('.release-feedback-link[href="#ep-message"]').count(),1,"EP hero links directly to feedback");
  assert.equal(await form.locator('input[name="email"]').count(),0,"no contact info required from commenters");
  assert.equal(await form.locator('textarea[name="voice"]').getAttribute("required"),"","EP feedback text required");
  assert.equal(await form.locator('input[name="publication"]:checked').getAttribute("value"),"掲載しない","default to no public sharing");
  assert.equal(await form.evaluate(el=>el.checkValidity()),false,"cannot submit blank comment");
  const dims=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  assert.ok(dims[0]<=dims[1]+1.5,engine+" EP form mobile overflow at "+width);
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
 await page.goto(BASE+"/releases/2026-11-22/",{waitUntil:"domcontentloaded"});
 await page.locator("#ep-feedback-message").fill("ティザーを見ました。配信が楽しみです。");
 await page.locator("#ep-feedback-name").fill("音楽ファン");
 await page.locator('#ep-feedback-form input[name="publication"][value="匿名で掲載してよい"]').check();
 assert.equal(await page.locator("#ep-feedback-form").evaluate(el=>el.checkValidity()),true);
 let post=null;
 await page.route("https://formspree.io/f/xbgjraga",async route=>{
  post={method:route.request().method(),body:route.request().postData()};
  await route.fulfill({status:200,contentType:"text/html",body:"<p>Mocked. No real message sent.</p>"});
 });
 await page.locator("#ep-feedback-form button[type=submit]").click();
 await page.waitForURL("https://formspree.io/f/xbgjraga");
 const fields=new URLSearchParams(post?.body||"");
 assert.equal(post?.method,"POST");
 assert.equal(fields.get("project"),"first-ep-2026-11-22");
 assert.equal(fields.get("category"),"1st EP / 感想・メッセージ");
 assert.equal(fields.get("work"),"あなたと、これから、これからも");
 assert.equal(fields.get("voice"),"ティザーを見ました。配信が楽しみです。");
 assert.equal(fields.get("name"),"音楽ファン");
 assert.equal(fields.get("publication"),"匿名で掲載してよい");
 await page.close();
 log(engine+" EP message intake","4 widths; anonymous option; private by default; intercepted Formspree POST");
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
  assert.equal(await page.locator("#unpaid-confirm").count(),0,"no compulsory unpaid agreement");
  assert.ok((await page.locator("main").innerText()).includes("制作を始める前に金額と条件を決めます"));
  assert.ok(!(await page.locator("main").innerText()).includes("無償でのご協力"));
  assert.ok((await page.locator("main").innerText()).includes("中学校を卒業された方"));
  const bounds=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  assert.ok(bounds[0]<=bounds[1]+1.5,engine+" contest horizontal overflow "+width);
  assert.equal(await page.locator("#artwork-entry-form").evaluate(form=>form.checkValidity()),false,"empty message must fail");
  assert.equal(await page.locator("#artwork-message").getAttribute("required"),null,"interest form does not demand an elaborate proposal");
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
 await page.locator("#data-consent").check();
 await page.locator("#artwork-message").fill("");
 assert.equal(await page.locator("#artwork-entry-form").evaluate(form=>form.checkValidity()),true,"artwork interest can be submitted without a full proposal");
 await page.locator("#artwork-message").fill("二曲のジャケットを描いてみたいです。ご連絡ください。");
 assert.equal(await page.locator("#artwork-entry-form").evaluate(form=>form.checkValidity()),true,"interest message valid after privacy and graduation checks");
 assert.equal(await page.locator("#artwork-entry-form").evaluate(form=>form.checkValidity()),true,"valid interest message");
 let post=null;
 await page.route("https://formspree.io/f/xbgjraga",async route=>{
  post={method:route.request().method(),body:route.request().postData()};
  await route.fulfill({status:200,contentType:"text/html",body:"<p>Test success</p>"});
 });
 await page.locator("#artwork-entry-form button[type=submit]").click();
 await page.waitForURL("https://formspree.io/f/xbgjraga");
 assert.equal(post?.method,"POST");
 // Native HTML forms percent-encode values (spaces become '+').
 // Parse as application/x-www-form-urlencoded instead of comparing raw text.
 const fields=new URLSearchParams(post?.body||"");
 assert.equal(fields.get("project"),"first-single-artwork-interest-2026");
 assert.equal(fields.get("_subject"),"ARTWORK PROJECT｜制作希望メッセージ");
 assert.equal(fields.get("name"),"Test Artist");
 assert.equal(fields.get("email"),"sample@example.com");
 assert.equal(fields.get("song"),"両方");
 assert.equal(fields.get("message"),"二曲のジャケットを描いてみたいです。ご連絡ください。");
 assert.equal(fields.get("junior_high_graduated"),"yes");
 assert.equal(fields.get("data_policy_accepted"),"yes");
 assert.equal(fields.has("unpaid_project_confirmed"),false,"no unpaid consent data");
 assert.equal(fields.has("artwork_url"),false,"no artwork link is collected");
 await page.close();
 const listing=await browser.newPage({viewport:{width:390,height:844}});
 await listing.goto(BASE+"/releases/",{waitUntil:"domcontentloaded"});
 assert.equal(await listing.locator('a[href="/releases/artwork-project/"]').count(),1,"catalog interest link");
 await listing.close();
 log(engine+" artwork interests","5 widths; graduate-only interest message; intercepted POST; catalog link");
}

async function checkCoverWhenAvailable(browser,engine){
 // The real album cover is supplied later. Mock a valid image at the exact planned path.
 const artwork=await readFile("assets/share-works.png");
 for(const item of [
  {path:"/releases/",img:"#releases-artwork",pending:"#releases-cover-pending"},
  {path:"/releases/2026-11-22/",img:"#release-cover-image",pending:"#release-cover-pending"}
 ]){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route("**/assets/releases/first-single-2026-cover.webp",route=>route.fulfill({status:200,contentType:"image/png",body:artwork}));
  await page.goto(BASE+item.path,{waitUntil:"networkidle"});
  await page.locator(item.img).waitFor({state:"visible"});
  assert.equal(await page.locator(item.pending).isVisible(),false,"placeholder must disappear when artwork loads");
  assert.ok(await page.locator(item.img).evaluate(el=>el.naturalWidth>0),"real image dimensions loaded");
  if(item.path.includes("2026-11-22"))assert.equal(await page.locator("#release-cover-label").innerText(),"JACKET ARTWORK");
  await page.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
 const page=await context.newPage();
 await page.route("**/assets/releases/first-single-2026-cover.webp",route=>route.fulfill({status:200,contentType:"image/png",body:artwork}));
 await page.addInitScript(()=>{
  const NativeDate=Date;class FixedDate extends NativeDate{
   constructor(...args){super(...(args.length?args:["2026-11-22T12:00:00+09:00"]));}
   static now(){return new NativeDate("2026-11-22T12:00:00+09:00").valueOf();}
  }globalThis.Date=FixedDate;
 });
 await page.goto(BASE+"/",{waitUntil:"networkidle"});
 await page.locator("#first-single-announcement-cover").waitFor({state:"visible"});
 assert.equal(await page.locator("#first-single-announcement-placeholder").isVisible(),false);
 assert.ok(await page.locator("#first-single-announcement-cover").evaluate(el=>el.naturalWidth>0));
 assert.equal(await page.locator(".release-announcement-art-note").isVisible(),true,"artwork note should accompany a loaded cover");
 await context.close();
 log(engine+" album artwork replacement","all three release surfaces display the image and hide placeholders");
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
 for(const width of [320,375,768,1440]){
  const index=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
  await index.goto(BASE+"/special-thanks/#jacket-artwork-thanks",{waitUntil:"domcontentloaded"});
  assert.equal(await index.locator('a[href="/special-thanks/ucnuc/"]').count(),1,"SPECIAL THANKS retains UCNUC");
  assert.equal(await index.locator('a[href="/special-thanks/eastgate/"]').count(),1,"SPECIAL THANKS retains the choir");
  const jacket=index.locator("#jacket-artwork-thanks");
  assert.equal(await jacket.count(),1,"2026 EP artwork credit must be available");
  assert.ok((await jacket.innerText()).includes("ジャケットイラスト"),"anonymous artwork credit is visible");
  assert.ok((await jacket.innerText()).includes("あなたと、これから、これからも"),"artwork credit links to the correct EP");
  assert.equal(await jacket.locator('a[href^="https://"]').count(),0,"anonymous artwork section must not link to any artist profile");
  assert.equal(await jacket.locator('a[href="/releases/2026-11-22/"]').count(),1,"artwork acknowledgement links to EP");
  const bounds=await index.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  assert.ok(bounds[0]<=bounds[1]+1.5,engine+" thanks index mobile overflow at width "+width);
  if(width===375)await index.screenshot({path:output+"/"+engine+"-special-thanks-artwork-375.png",fullPage:true,animations:"disabled"});
  await index.close();
 }
 const home=await browser.newPage({viewport:{width:375,height:840}});
 await home.goto(BASE+"/",{waitUntil:"domcontentloaded"});
 const orderedTopics=await home.locator("#news > .wrap > .news-list > .news-item").evaluateAll(els=>els.slice(0,3).map(el=>el.id));
 assert.deepEqual(orderedTopics,["first-single-topic","special-thanks-ep-topic","artwork-contest-topic"],"TOPICS prioritizes EP release, thanks, then artwork recruitment");
 assert.equal(await home.locator('#special-thanks-ep-topic a[href="/special-thanks/#jacket-artwork-thanks"]').count(),1,"updated TOPICS links directly to anonymous artwork credit");
 await home.close();
 const release=await browser.newPage();
 await release.goto(BASE+"/releases/2026-11-22/",{waitUntil:"domcontentloaded"});
 assert.equal(await release.locator('.ucnuc-credit a[href="/special-thanks/ucnuc/"]').count(),1,"release links to recording acknowledgement");
 await release.close();
 log(engine+" credits and TOPICS","4 widths; UCNUC, unnamed artwork, choir preserved; 11/22 TOPICS ordering");
}

async function checkLyrics(page,engine){
  await page.goto(BASE+"/lyrics/#korekaramo",{waitUntil:"domcontentloaded"});
  await page.locator("#korekaramo").waitFor();
  assert.equal(await page.locator(".lyrics-item").count(),12);
  assert.equal(await page.locator("#korekaramo").evaluate(el=>el.open),true,"direct link should expand lyrics");
  assert.equal(await page.locator("#korekaramo .poem-line").count(),38,"Korekaramo must retain all 38 original lyric lines");
  assert.equal(await page.locator("#korekaramo .poem-line").first().innerText(),"僕のこれからを話したら","Korekaramo first lyric line unchanged");
  assert.equal(await page.locator("#korekaramo .poem-line").last().innerText(),"ありがとう、これからも","Korekaramo final lyric line unchanged");
  assert.equal(await page.locator('#korekaramo a[href="/releases/2026-11-22/"]').count(),1,"Korekaramo links to its EP feature");
  const releaseMeta=await page.locator("#korekaramo .poem-meta").innerText();
  assert.ok(releaseMeta.includes("1st EP"),"Korekaramo metadata uses 1st EP branding");
  assert.ok(!releaseMeta.includes("1st Single"),"obsolete release branding is not shown");
  await page.locator("#korekaramo .poem-share-begin").click();
  await page.locator("#korekaramo .poem-line").first().click();
  await page.locator("#phrase-share").click();
  assert.equal(await page.locator("#share-modal").isVisible(),true,"existing lyric share modal opens");
  log(engine+" lyric share","12 poems; deep-link; selection");
}

async function checkHomepage(browser,engine){
  async function freshWithDate(iso,width=390,height=840) {
    const context = await browser.newContext({viewport:{width,height}, reducedMotion:"reduce"});
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
    assert.deepEqual(await page.locator("#lyric-box .lyric-stat strong").allInnerTexts(),["534","12"],"LYRIC BOX includes Korekaramo in 12 works");
    assert.ok((await page.content()).includes('"source":"これからも"'),"Korekaramo excerpt source exists in LYRIC BOX");
    assert.ok((await page.content()).includes('"これからも": "korekaramo"'),"Korekaramo LYRIC BOX link maps to published poem");
    assert.equal(await page.locator('#korekaramo').count(),0,"the song lyrics are linked from the separate lyrics page");
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
    assert.equal(await page.locator(".release-announcement-topline .date").innerText(),"ANNOUNCED / 2026.11.22");
    assert.ok((await modal.innerText()).includes("配信開始日は後日発表します"));
    assert.equal(await page.locator(".release-announcement-content h2").innerText(),"配信決定。");
    assert.ok((await page.locator(".release-announcement-kicker").innerText()).includes("1st EP"));
    assert.ok((await page.locator(".release-announcement-description").innerText()).includes("全6曲収録予定"));
    assert.equal(await modal.locator('a[href="https://www.tiktok.com/@tsukam.oto.kos"]').count(),1,"official TikTok linked from EP popup");
    const coverLoaded=await page.locator("#first-single-announcement-cover").evaluate(el=>el.complete&&el.naturalWidth>0);
    assert.equal(await page.locator(".release-announcement-art-note").isVisible(),coverLoaded,"artwork caption must match actual cover-load state");
    const layout=await page.locator(".release-announcement-panel").evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,bg:getComputedStyle(el).backgroundColor}));
    assert.ok(layout.scroll<=layout.client+2,"mobile announcement should not overflow horizontally");
    assert.equal(layout.bg,"rgb(20, 20, 23)","new editorial announcement styles must load");
    await page.screenshot({path:output+"/"+engine+"-homepage-popup-390.png",animations:"disabled"});
    await page.locator("#first-single-announcement-close").click();
    assert.equal(await modal.isVisible(),false);
    assert.equal(await page.locator(".countdown-announced-link").isVisible(),true);
    assert.equal(await page.locator('.countdown-youtube-link[href="https://www.youtube.com/channel/UC3mLzMQottVyAoX3goOAouA"]').isVisible(),true,"home channel link remains after dismissing popup");
    const docWidth=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
    assert.ok(docWidth[0]<=docWidth[1]+1.5,"no homepage horizontal overflow after release");
    await page.reload({waitUntil:"domcontentloaded"});
    assert.equal(await modal.isVisible(),false,"popup shown once per visitor");
    await context.close();
    const desktop=await freshWithDate("2026-11-22T12:00:00+09:00",1440);
    await desktop.page.locator("#first-single-announcement").waitFor({state:"visible"});
    await desktop.page.screenshot({path:output+"/"+engine+"-homepage-popup-1440.png",animations:"disabled"});
    await desktop.context.close();
    const compact=await freshWithDate("2026-11-22T12:00:00+09:00",320,568);
    await compact.page.locator("#first-single-announcement").waitFor({state:"visible"});
    assert.equal(await compact.page.locator("#first-single-announcement-close").isVisible(),true);
    const surface=await compact.page.locator(".release-announcement-panel").evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
    assert.ok(surface.scroll<=surface.client+2,"compact popup must not overflow horizontally");
    await compact.page.locator(".release-announcement-actions a.primary").scrollIntoViewIfNeeded();
    assert.equal(await compact.page.locator(".release-announcement-actions a.primary").isVisible(),true,"compact-screen CTA remains reachable");
    await compact.page.keyboard.press("Escape");
    assert.equal(await compact.page.locator("#first-single-announcement").isVisible(),false,"keyboard escape closes the popup");
    await compact.context.close();
    log(engine+" homepage announcement", "first visit only; permanent CTA; 320px keyboard and compact viewport; mobile + desktop screenshots");
  }
}

async function checkReleaseMetadata(browser,engine){
 const expected="https://kosuke-tsukamoto-website.pages.dev/assets/releases/first-single-2026-og.jpg";
 for(const path of ["/releases/","/releases/2026-11-22/","/releases/artwork-project/"]){
  const page=await browser.newPage();
  await page.goto(BASE+path,{waitUntil:"domcontentloaded"});
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"),expected,"release OGP uses dedicated image");
  assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute("content"),"1200");
  assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute("content"),"630");
  assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute("content"),"summary_large_image");
  await page.close();
 }
 log(engine+" release metadata","1200x630 social artwork configured on three pages");
}

async function checkLocalPreview(browser,engine){
 const page=await browser.newPage({viewport:{width:375,height:812}});
 const baseOrigin=new URL(BASE);
 if(!["localhost","127.0.0.1"].includes(baseOrigin.hostname))return;
 await page.goto(BASE+"/?preview-first-single=1",{waitUntil:"domcontentloaded"});
 await page.locator("#first-single-announcement").waitFor({state:"visible"});
 await page.locator("#first-single-announcement-close").click();
 assert.equal(await page.locator("#first-single-announcement").isVisible(),false);
 await page.reload({waitUntil:"domcontentloaded"});
 await page.locator("#first-single-announcement").waitFor({state:"visible"});
 await page.close();
 log(engine+" localhost-only preview","release announcement may be reviewed locally without date changes");
}

async function checkReleaseInternalLinks(browser,engine){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const origin=new URL(BASE).origin;
 const sources=["/releases/artwork-project/","/releases/2026-11-22/","/releases/","/special-thanks/ucnuc/"];
 const checked=new Set();
 try{
  for(const source of sources){
   await page.goto(BASE+source,{waitUntil:"domcontentloaded"});
   const hrefs=await page.locator("a[href]").evaluateAll(els=>els.map(el=>el.getAttribute("href")).filter(Boolean));
   for(const href of hrefs){
    const target=new URL(href,BASE+source);
    if(target.origin!==origin)continue;
    const path=target.pathname+target.search;
    if(!checked.has(path)){
     const response=await page.request.get(origin+path);
     assert.ok(response.ok(),engine+" broken local link from "+source+" -> "+href+" (HTTP "+response.status()+")");
     checked.add(path);
    }
    if(target.pathname===new URL(source,origin).pathname&&target.hash&&target.hash!=="#"){
     const id=decodeURIComponent(target.hash.slice(1));
     assert.equal(await page.evaluate(id=>!!document.getElementById(id),id),true,engine+" missing on-page anchor "+source+" -> "+href);
    }
   }
  }
  log(engine+" internal release links",checked.size+" unique local routes returned HTTP 200; on-page anchors verified");
 }finally{await page.close();}
}

async function testEngine(engineType,engine){
 const browser=await engineType.launch({headless:true});
 try{
  for(const width of [240,320,375,390,430,768,1024,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
   await page.goto(BASE+"/releases/2026-11-22/",{waitUntil:"domcontentloaded"});
   await page.locator(".release-words .secret-char").first().waitFor();
   assert.equal(await page.locator("h2.release-statement-heading").innerText(),"FOR THIS RELEASE");
   assert.equal(await page.locator(".track").count(),6,"the first EP contains six planned tracks");
   assert.equal(await page.locator('.new-song-lyrics a[href="/lyrics/#korekaramo"]').count(),1,"new song lyrics receive the first visible tracklist CTA");
   assert.ok((await page.locator(".new-song-lyrics h3").innerText()).includes("これからも"),"the new song is highlighted above the tracklist");
   assert.equal(await page.locator("#tracks details.track[open]").count(),0,"song details must be collapsed by default");
   assert.equal(await page.locator("#tracks details.track").count(),3,"three sung tracks retain optional credits and lyrics");
   const firstTrack=page.locator("#tracks details.track").first();
   await firstTrack.locator("summary").click();
   assert.equal(await firstTrack.evaluate(el=>el.open),true,"credits remain accessible on demand");
   assert.equal(await firstTrack.locator('a[href="/lyrics/#anata-to"]').count(),1,"prior song lyrics remain available");
   await firstTrack.locator("summary").click();
   assert.equal(await firstTrack.evaluate(el=>el.open),false,"details can be collapsed again");

   assert.equal(await page.locator(".hero h1").innerText(),"配信決定。","announcement is the primary heading");
   assert.ok((await page.locator(".release-work-title").innerText()).replace(/\s/g,"").includes("あなたと、これから、これからも"));
   assert.ok((await page.locator(".hero .summary").innerText()).includes("全6曲の1st EP"));
   assert.ok((await page.locator(".hero .summary").innerText()).includes("配信開始日は後日発表"));
   const heroLinks=page.locator(".release-hero-actions a");
   assert.deepEqual((await heroLinks.allTextContents()).map(s=>s.replace(/\s+/g," ").trim()),["EPについて読む ↓","ティザーを見る ↓","ひとことを送る ↓","YouTubeチャンネルを見る ↗","TikTokを見る ↗"]);
   assert.equal(await page.locator("#artwork-project a[href=\"/voice-box/\"]").count(),1,"anonymous feedback is reachable");
   assert.equal(await page.locator("#artwork-project a[href=\"/releases/artwork-project/\"]").count(),1,"artwork participation is distinct");
   const wrongArrows=await page.locator("a[href]").evaluateAll(links=>links.filter(a=>/[↗↓→]/.test(a.textContent)).filter(a=>{const href=a.getAttribute("href");const expected=href.startsWith("#")?"↓":new URL(href,location.href).origin===location.origin||new URL(href,location.href).origin==="https://kosuke-tsukamoto-website.pages.dev"?"→":"↗";return !a.textContent.trim().endsWith(expected);}).map(a=>a.textContent));
   assert.deepEqual(wrongArrows,[],"arrows describe actual navigation");
   assert.equal(await page.locator('.release-hero-actions a[href="https://www.tiktok.com/@tsukam.oto.kos"]').count(),1,"TikTok is accessible from first ep hero");
   assert.ok((await page.locator(".eyebrow").innerText()).includes("1st EP"),"release is identified as first EP");
   assert.equal(await page.locator(".track-title").count(),6);
   assert.equal(await page.locator('a[href="/lyrics/#korekaramo"]').count()>0,true,"EP feature links to the full Korekaramo lyrics");
   assert.equal(await page.locator(".track-title").filter({hasText:"Piano Instrumental"}).count(),3,"three piano-only versions are listed");
   assert.equal(await page.locator(".track-version").count(),3,"instrumental subtitle remains a secondary text label");
   assert.equal(await page.locator(".track-instrumental summary,.track-instrumental .plus,.track-instrumental .track-description").count(),0,"instrumentals are compact informational rows");
   const titleSize=await page.locator(".track-instrumental .track-title").first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
   assert.ok(titleSize<=27,engine+" instrumental title is visually restrained at width "+width);
   const versionSize=await page.locator(".track-version").first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
   assert.ok(versionSize<titleSize,engine+" Piano Instrumental subtitle must be smaller than the title");
   assert.ok((await page.locator("#listen .credit-line").innerText()).includes("全6曲予定"),"EP planned duration and count are accurate");
   assert.equal(await page.locator("#preview").count(),0,"premature preview removed");
   assert.equal(await page.locator("h2:has-text('まず、音楽から。')").count(),0,"unwanted heading removed");
   assert.equal(await page.locator(".hero + .editorial-note").count(),1,"statement follows jacket directly");
   const fontSize=await page.locator(".release-words").evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
   assert.ok(fontSize>=15,"release statement is visually legible at width "+width);
   if(width===375||width===768||width===1440){
     await page.locator(".hero").screenshot({path:output+"/"+engine+"-hero-"+width+".png",animations:"disabled"});
     await page.locator("#artwork-project").screenshot({path:output+"/"+engine+"-participation-"+width+".png",animations:"disabled"});
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
  await checkLandscapeStatement(browser,engine);
  const page=await browser.newPage({viewport:{width:375,height:860}});
  await checkLyrics(page,engine);
  await page.close();
  await checkHomepage(browser,engine);
  await checkLocalPreview(browser,engine);
  await checkReleaseMetadata(browser,engine);
  await checkTeaser(browser,engine);
  await checkCoverWhenAvailable(browser,engine);
  await checkEPFeedback(browser,engine);
  await checkArtworkContest(browser,engine);
  await checkUcnucThanks(browser,engine);
  await checkReleaseInternalLinks(browser,engine);
 }finally{await browser.close();}
}
await testEngine(chromium,"chromium");
await testEngine(webkit,"webkit");
console.log("ALL FIRST SINGLE BROWSER TESTS PASSED");
