/* Run with: node rec-note/tests/lyric-layout.test.js
   Prevent accidental return of fixed-count breaks and CSS writing-mode overflow. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const mock={window:{},document:{createElement(tag){return {tag,style:{},textContent:'',className:''};}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'lyric-layout.js'),'utf8'),mock);
const layout=mock.window.RECNOTE_LYRIC_LAYOUT;
assert.equal(layout.uniquePhrases,22);
assert.equal(layout.curatedEntries,23);
const examples=[
 ['これからも','音楽に救われた、人に救われた　だから',['音楽に救われた、','人に救われた　だから']],
 ['これからも','どうか「おはよう」って言い合える世界でいて',['どうか「おはよう」って','言い合える世界でいて']],
 ['これからも','その手触りが煩わしい　でも',['その手触りが','煩わしい　でも']],
 ['あなたと','幸せな日々が過ぎ去っていく',['幸せな日々が','過ぎ去っていく']],
 ['これから','「先輩」って呼んでくれたから',['「先輩」って','呼んでくれたから']],
];
for(const [song,source,want] of examples){
 const actual=layout.columns(source,layout.suggestions(song,source));
 assert.equal(JSON.stringify(actual),JSON.stringify(want));
 assert.equal(actual.join(''),source);
}
assert.equal(layout.resolve('これからも',examples[0][1],{breaks:[],mode:'single'}).source,'single');
assert.equal(layout.resolve('これからも',examples[0][1],{breaks:[],mode:'manual'}).source,'manual');
assert.equal(layout.resolve('これからも',examples[0][1],{breaks:[]}).source,'v04');
const widget={children:[],dataset:{},style:{setProperty(k,v){this[k]=v;}},replaceChildren(){this.children=[];},append(x){this.children.push(x);}};
layout.render(widget,examples[0][1],layout.suggestions(examples[0][0],examples[0][1]));
assert.equal(widget.children.length,2);
assert.ok(widget.children.every(x=>x.style.whiteSpace==='pre'&&x.style.writingMode==='vertical-rl'));
const css=fs.readFileSync(path.join(root,'lyric-editor.css'),'utf8');
assert.ok(css.includes('white-space:pre!important'));
assert.ok(css.includes('max-height:none!important'));
assert.ok(css.includes('direction:rtl!important'));
console.log('REC NOTE v18.1 semantic lyric layout: PASS',examples.length,'fixtures');
