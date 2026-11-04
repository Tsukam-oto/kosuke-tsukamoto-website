/* Browser regression check; run with @playwright/test and a local http.server. */
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const url='http://127.0.0.1:8765/chi-no-toshokan/specials.html';
async function main(){
 const browser=await chromium.launch({headless:true});
 const widths=[320,375,430,768,1280];
 const outcomes=[];
 fs.mkdirSync('/tmp/chi-no-toshokan-smoke',{recursive:true});
 try{
  for(const width of widths){
   const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,hasTouch:width<768,isMobile:width<768});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('#story .story-layout').waitFor({timeout:10000});
   const title=await page.locator('#story h2').first().textContent();
   assert.match(title,/完全5度/);
   const dims=await page.evaluate(()=>({
    w:document.documentElement.scrollWidth,
    inner:window.innerWidth,
    controls:[...document.querySelectorAll('.story-switcher a')].map(x=>({width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height}))
   }));
   assert.ok(dims.w<=dims.inner+2,'Horizontal overflow at '+width+': '+dims.w+' > '+dims.inner);
   assert.ok(dims.controls.every(x=>x.height>=44),'Navigation too small at '+width);
   assert.equal(await page.locator('.claim').count(),3);
   await page.locator('[data-audio="pure"]').click();
   await page.locator('[data-story="chaos"]').click();
   await page.locator('#story .story-layout').waitFor();
   assert.match(await page.locator('#story h2').first().textContent(),/カオス/);
   await page.locator('[data-guess="0"]').click();
   assert.ok(await page.locator('#quiz-reveal').isVisible());
   await page.locator('[data-story="alliance"]').click();
   assert.match(await page.locator('#story h2').first().textContent(),/心理療法/);
   assert.match(await page.locator('.number-highlight').textContent(),/\.278/);
   await page.locator('#fresh-sources .candidate').first().waitFor({timeout:10000});
   assert.ok((await page.locator('#fresh-sources .candidate').count())>=1);
   await page.locator('[data-story="piano"]').click();
   await page.screenshot({path:'/tmp/chi-no-toshokan-smoke/specials-'+width+'.png',fullPage:true});
   assert.deepEqual(errors,[],'Uncaught browser JS exceptions at '+width);
   outcomes.push({width,overflow:0,sourceCards:await page.locator('.candidate').count(),chapterCount:3,jsErrors:errors.length});
   await page.close();
  }
  console.log(JSON.stringify({passed:true,devices:outcomes},null,2));
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
