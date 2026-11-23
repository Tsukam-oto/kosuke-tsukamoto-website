/* REC NOTE v18.3: row reachability and obsolete overlay regression.
   Run: node rec-note/tests/lyric-scroll.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'lyric-sync-mobile.js'),'utf8');
const css=fs.readFileSync(path.join(root,'lyric-sync-mobile.css'),'utf8');
const html=fs.readFileSync(path.join(root,'lyric-sync.html'),'utf8');
assert.match(js,/node\.after\(contextHost\)/,'Editor must follow selected row, not stay in a sidebar');
assert.match(js,/contextHost\.append\(contextNavigation,root\.querySelector\('\.syncDock'\),inlinePanel,displayEdit,quickEdit,review,adjust\)/,
 'Record controls must stay inside contextual editor');
assert.match(css,/body\.syncPage #syncStudio\{\s*display:block!important;/,'Single-column page layout');
assert.match(css,/body\.syncPage #syncStudio #syncLines\{[\s\S]*?max-height:none!important;[\s\S]*?overflow:visible!important;/,
 'All lyric rows must remain in document flow');
assert.match(css,/body\.syncPage #syncStudio #syncLines>#syncContextEditor\{[\s\S]*?position:static!important;/,
 'Selected-line editor must never be fixed or sticky');
assert.match(css,/body\.syncPage #syncStudio #syncLines>#syncContextEditor>\.syncDock\{[\s\S]*?position:static!important;/,
 'Record controls must not cover final lyric');
assert.match(css,/body\.syncPage #syncStudio #syncInstrumentRail:not\(\[hidden\]\)\{[\s\S]*?position:static!important;/,
 'Section controls must not cover lyrics');
assert.match(css,/body\.syncPage #syncStudio #syncLines>#syncContextEditor>\.syncFineTune\[open\]\{[\s\S]*?position:static!important;/,
 'Fine-timing editor must not open as bottom sheet');
assert.match(js,/const focusInEditor=!!focusNode&&contextHost\.contains\(focusNode\);/,
 'Focused editor input must be preserved during row refresh');
assert.match(html,/lyric-sync-mobile\.js\?v=18\.3/);
assert.match(html,/lyric-sync-mobile\.css\?v=18\.3/);
console.log('REC NOTE v18.3 row reachability/no-overlay: PASS');
