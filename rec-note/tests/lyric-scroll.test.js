/* Run: node rec-note/tests/lyric-scroll.test.js
   Regression guard: every lyric must remain reachable after selection/recording. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'lyric-sync-mobile.js'),'utf8');
const css=fs.readFileSync(path.join(root,'lyric-sync-mobile.css'),'utf8');
const html=fs.readFileSync(path.join(root,'lyric-sync.html'),'utf8');
assert.match(js,/contextHost\.append\(root\.querySelector\('\.syncDock'\),inlinePanel,displayEdit,quickEdit,review,adjust\)/,
 'Record controls must be inside selected-line editor');
assert.match(css,/body\.syncPage #syncStudio #syncContextEditor>\.syncDock\{[\s\S]*?position:sticky!important;top:0!important;bottom:auto!important;/,
 'Toolbar must not be fixed at bottom');
assert.match(css,/body\.syncPage #syncStudio #syncContextEditor>\.syncFineTune\[open\]\{[\s\S]*?position:static!important;/,
 'Timing editor must not open as fixed overlay');
assert.match(css,/@media\(min-width:901px\)\{[\s\S]*?body\.syncPage #syncStudio #syncLines\{[\s\S]*?max-height:none!important;[\s\S]*?overflow:visible!important;/,
 'Desktop lyric list must be scrollable as part of document');
assert.match(css,/@media\(max-width:900px\)\{[\s\S]*?body\.syncPage #syncStudio #syncLines\{[\s\S]*?overflow-y:auto!important;[\s\S]*?padding-bottom:110px!important;/,
 'Small-screen lyric list must leave space for the final row');
assert.match(html,/lyric-sync-mobile\.js\?v=18\.2/,'Versioned JS must invalidate stale cache');
assert.match(html,/lyric-sync-mobile\.css\?v=18\.2/,'Versioned CSS must invalidate stale cache');
console.log('REC NOTE v18.2 lyric scroll/toolbar regression: PASS');
