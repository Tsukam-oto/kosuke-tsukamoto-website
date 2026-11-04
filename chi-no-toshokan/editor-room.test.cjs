/* No network or real credentials needed: private editorial studio safety and UI smoke. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=__dirname;
const html=fs.readFileSync(path.join(base,'editor-room.html'),'utf8');
const css=fs.readFileSync(path.join(base,'editor-room.css'),'utf8');
const src=fs.readFileSync(path.join(base,'editor-room.js'),'utf8');
let checks=0; const check=(title,ok)=>{assert.ok(ok,title);checks++};
check('mobile viewport',html.includes('viewport-fit=cover'));
check('mobile layout breakpoint',css.includes('@media(max-width:770px)'));
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
const source=src.replace(/\ninit\(\);\nwindow\.EDITOR_DEBUG=/,'\nwindow.EDITOR_DEBUG=');
check('test runner removes only automatic auth initialization',source!==src);
vm.runInNewContext(source,{window:win,document:doc,navigator,URL,Date,Math,setTimeout,clearTimeout,console},{timeout:5000});
check('editorial prompt exists',typeof win.EDITOR_DEBUG.makePrompt==='function');
const script=win.EDITOR_DEBUG.makePrompt({
 kind:'workflow',title:'鑑賞サイトの改善',problem:'授業で操作しづらい',
 aiMethod:'UIの導線を整理した',result:'テストは未完了',lesson:'要件を先に整理する',sources:''
});
check('source context preserved',script.includes('鑑賞サイトの改善')&&script.includes('テストは未完了'));
check('no fabricated experience policy',script.includes('創作しない'));
check('citations requested in editorial prompt',script.includes('要出典・要確認'));
check('school privacy gate on prompt',script.includes('学校の内部資料')&&script.includes('個人情報'));
create('title').value='音楽の授業づくり';
create('kind').value='education';
create('problem').value='授業準備を短縮したい';
create('ai-method').value='AIで構成を検討';
create('result').value='検証中';
create('lesson').value='確認手順を残す';
create('stage').value='seed';
create('sources').value='';
create('public-url').value='';
(async()=>{
 await create('copy-brief').handlers.click();
 check('copy is only triggered after confirmation',consented);
 check('copy gives ChatGPT editorial-ready prompt',copied.includes('note記事の下書き'));
 check('copy retains unverified result',copied.includes('検証中'));
 check('no accidental external upload during copy',!prompted);
 console.log('Editorial room smoke PASS:',checks,'checks');
})().catch(e=>{console.error(e);process.exitCode=1});
