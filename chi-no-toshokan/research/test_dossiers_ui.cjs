/* Node-only UI smoke test for the evidence preparation screen. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function main(){
 const root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'research-dossiers.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'research-dossiers.js'),'utf8');
 const json=JSON.parse(fs.readFileSync(path.join(root,'research-dossiers.json'),'utf8'));
 assert(html.includes('name="viewport"'), 'Mobile viewport is required');
 assert(html.includes('@media(max-width:690px)'), 'Responsive phone layout is required');
 assert(html.includes('research-dossiers.js'), 'The screen must load the rendering logic');

 const elements={};
 const get=id=>elements[id]||(elements[id]={
  innerHTML:'',textContent:'',value:'',listeners:{},children:[],
  addEventListener(event,fn){this.listeners[event]=fn;},
  appendChild(x){this.children.push(x);},
  scrollIntoView(){},
 });
 const document={getElementById:get,createElement:()=>({value:'',textContent:''})};
 const context={document,URL,console,
  location:{hash:''},
  fetch:async()=>({ok:true,json:async()=>json})};
 vm.runInNewContext(js,context,{filename:'research-dossiers.js',timeout:5000});
 // Async fetch Promise must settle.
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(Number(get('topic-count').textContent),json.counts.topics);
 assert.equal(Number(get('review-count').textContent),0);
 assert.equal(Number(get('source-count').textContent),json.counts.sourcesLinked);
 assert(get('sheets').innerHTML.includes('本文未照合'));
 assert(get('sheets').innerHTML.includes('検証前'));
 assert(get('sheets').innerHTML.includes('target="_blank"'));
 const first=json.dossiers[0];
 get('search').listeners.input({target:{value:first.question}});
 assert(get('found').textContent.includes('1件')||get('found').textContent.includes('2件'));
 get('coverage').listeners.change({target:{value:'few'}});
 assert(get('found').textContent.includes('件'));

 // A malicious title from untrusted metadata must not become executable HTML.
 const tainted=JSON.parse(JSON.stringify(json));
 const sample=tainted.dossiers.find(x=>x.sources.length);
 assert(sample);
 sample.sources[0].title='<img src=x onerror=alert(1)>';
 sample.sources[0].url='javascript:alert(1)';
 const freshElements={};
 const getFresh=id=>freshElements[id]||(freshElements[id]={
  innerHTML:'',textContent:'',listeners:{},children:[],
  addEventListener(name,fn){this.listeners[name]=fn;},
  appendChild(x){this.children.push(x)},
  scrollIntoView(){},
 });
 vm.runInNewContext(js,{document:{getElementById:getFresh,createElement:()=>({})},
  URL,location:{hash:''},fetch:async()=>({ok:true,json:async()=>tainted})},
  {filename:'research-dossiers-tainted.js',timeout:5000});
 await new Promise(resolve=>setImmediate(resolve));
 assert(!getFresh('sheets').innerHTML.includes('<img src=x onerror'));
 assert(getFresh('sheets').innerHTML.includes('&lt;img src=x'));
 assert(!getFresh('sheets').innerHTML.includes('href="javascript:'));
 console.log('Research dossier UI smoke PASS — mobile structure, 20-topic rendering, search, source links and HTML/URL escaping');
}
main().catch(error=>{console.error(error);process.exitCode=1});
