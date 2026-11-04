/* No network or real credentials needed: private editorial studio safety and UI smoke. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=__dirname;
const html=fs.readFileSync(path.join(base,'editor-room.html'),'utf8');
const css=fs.readFileSync(path.join(base,'editor-room.css'),'utf8');
const src=fs.readFileSync(path.join(base,'editor-room.js'),'utf8');
const magSrc=fs.readFileSync(path.join(base,'editor-magazines.js'),'utf8');
let checks=0; const check=(title,ok)=>{assert.ok(ok,title);checks++};
check('mobile viewport',html.includes('viewport-fit=cover'));
check('mobile layout breakpoint',css.includes('@media(max-width:770px)'));
check('quick memo mobile entry',html.includes('id="quick-text"')&&html.includes('id="quick-save"')&&css.includes('.quick-controls'));
check('quick memo saved as private note',src.includes("async function saveQuick()")&&src.includes("kind:'note'")&&src.includes("stage:'seed'"));
check('research ideas require authentication',html.indexOf('id="research-ideas"')>html.indexOf('id="private-app" hidden'));
check('research idea intake does not auto-publish',src.includes("function selectResearchIdea(id)")&&src.includes("stage').value='candidate'")&&src.includes('本文と主張は未照合'));
check('research intake from public metadata only',src.includes("fetch('./research-dossiers.json'")&&!src.includes("fetch('https://note.com"));
check('metric input and comparison are private',html.includes('id="format-outcomes"')&&html.includes('id="pv7"')&&html.indexOf('id="format-outcomes"')>html.indexOf('id="private-app" hidden'));
check('note metrics are manual only',!src.includes("fetch('https://note.com")&&html.includes('手入力'));
check('retains PV as distinct from read completion',html.includes('PVは読了人数ではありません'));
check('article body remains in private app',html.includes('id="article-body"')&&html.includes('id="article-count"')&&html.indexOf('id="article-body"')>html.indexOf('id="private-app" hidden'));
check('copying a draft is manual',html.includes('id="copy-article"')&&src.includes("clipboard.writeText(text)"));
check('length guidelines are explicitly non-binding',magSrc.includes('字数より内容を優先')&&magSrc.includes('公式が保証した最適文字数ではありません'));
check('magazine config is included',html.includes('src="./editor-magazines.js"'));
check('magazine control and planner are mobile-ready',html.includes('id="magazine"')&&html.includes('id="cadence-output"')&&css.includes('.magazine-list')&&css.includes('scroll-snap-type:x'));
check('noindex for private management',html.includes('noindex,nofollow,noarchive'));
check('auth-gated app element',html.includes('id="private-app" hidden'));
check('cloud records use existing RLS-backed table',src.includes("const TABLE='knowledge_records',PREFIX='note:editor:'"));
check('no secret keys embedded',!src.includes('service_role')&&!src.includes('sb_secret_'));
check('optimistic CAS update',src.includes(".eq('updated_at',old.updated_at)"));
check('reading is filtered by account and note prefix',src.includes(".eq('user_id',owner).eq('kind','note').like('id',PREFIX+'%')"));
check('note posting cannot be automatic',!src.includes('note.com/api')&&!src.includes('fetch("https://note.com'));
check('public article URL required for published stage',src.includes("form.stage==='published'"));
const elements={};
const create=id=>elements[id]||(elements[id]={
 value:'',innerHTML:'',textContent:'',hidden:false,disabled:false,handlers:{},
 classList:{toggle(){}},
 addEventListener(type,fn){this.handlers[type]=fn},
 focus(){},reset(){},
 scrollIntoView(){},
});
const doc={getElementById:create,querySelectorAll:()=>[]};
let copied='',prompted=false,consented=false;
const win={confirm(){consented=true;return true},prompt(){prompted=true},matchMedia:()=>({matches:false}),
 crypto:{randomUUID:()=> '11111111-2222-4333-8444-555555555555'}};
const navigator={clipboard:{async writeText(value){copied=value}}};
vm.runInNewContext(magSrc,{window:win,Object},{timeout:5000});
check('five distinct magazines',win.EDITOR_MAGAZINES.magazines.length===5);
check('three article formats',win.EDITOR_MAGAZINES.formats.length===3);
check('short/standard/feature targets',win.EDITOR_MAGAZINES.formats.map(x=>x.min).join(',')==='800,1500,3000');
check('7-day rotation totals 7',win.EDITOR_MAGAZINES.weeklyPlan.length===7&&win.EDITOR_MAGAZINES.magazines.reduce((a,b)=>a+b.weeklyGoal,0)===7);
create('drafts-per-week').value='10';
create('ready-percent').value='50';
create('minutes-per-day').value='30';
const source=src.replace(/\ninit\(\);\nwindow\.EDITOR_DEBUG=/,'\nwindow.EDITOR_DEBUG=');
check('test runner removes only automatic auth initialization',source!==src);
vm.runInNewContext(source,{window:win,document:doc,navigator,URL,Date,Math,setTimeout,clearTimeout,console},{timeout:5000});
check('editorial prompt exists',typeof win.EDITOR_DEBUG.makePrompt==='function');
create('filter').handlers.input({target:{value:''}});
check('outcome display is conservative',create('format-outcomes').innerHTML.includes('比較には不足'));
check('new manuscript controls initialized',!!create('format').innerHTML&&!!create('article-range').textContent);
create('article-body').value='業務改善でAIを使いました。これはまだ実証していません。';
create('article-body').handlers.input();
check('live article length working',create('article-count').textContent.includes('字')&&create('article-count').textContent!=='0字');
check('length heuristic does not approve source accuracy',create('editor-lint').innerHTML.includes('事実の正確性'));

check('all five magazine cards rendered',(create('magazine-list').innerHTML.match(/magazine-card/g)||[]).length===5);
check('real weekly forecast is labelled hypothetical',create('cadence-output').innerHTML.includes('5本／週')&&create('cadence-output').innerHTML.includes('試算'));
const script=win.EDITOR_DEBUG.makePrompt({
 kind:'workflow',title:'鑑賞サイトの改善',problem:'授業で操作しづらい',
 aiMethod:'UIの導線を整理した',result:'テストは未完了',lesson:'要件を先に整理する',sources:'',magazine:'music-education'
});
check('source context preserved',script.includes('鑑賞サイトの改善')&&script.includes('テストは未完了'));
check('magazine-aware prompt',script.includes('対象マガジン：音楽の授業をつくる')&&script.includes('指導要領'));
check('brief prioritizes natural readable prose over fixed template',script.includes('均一な箇条書き')&&script.includes('適切な段落'));
check('no fabricated experience policy',script.includes('創作しない'));
check('citations requested in editorial prompt',script.includes('要出典・要確認'));
check('school privacy gate on prompt',script.includes('学校の内部資料')&&script.includes('個人情報'));
create('title').value='音楽の授業づくり';
create('kind').value='education';
create('magazine').value='music-education';
create('problem').value='授業準備を短縮したい';
create('ai-method').value='AIで構成を検討';
create('result').value='検証中';
create('lesson').value='確認手順を残す';
create('stage').value='seed';
create('sources').value='';
create('public-url').value='';
create('pv7').value='';
create('impressions7').value='';
create('likes7').value='';
create('format').value='standard';
create('article-body').value='授業で試したことを記録する。';
(async()=>{
 await create('copy-brief').handlers.click();
 check('copy is only triggered after confirmation',consented);
 check('copy gives ChatGPT editorial-ready prompt',copied.includes('note記事の下書き'));
 check('copy retains unverified result',copied.includes('検証中'));
 check('magazine style uses flexible word counts',copied.includes('1500〜2500字')&&!copied.includes('2,000〜3,000字'));
 check('no accidental external upload during copy',!prompted);
 console.log('Editorial room smoke PASS:',checks,'checks');
})().catch(e=>{console.error(e);process.exitCode=1});
