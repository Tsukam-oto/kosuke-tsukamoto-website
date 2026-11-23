/* REC NOTE v18.4: lyric changes must ONLY happen in /lyric-editor.
   Run with: node rec-note/tests/lyric-inline-layout.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'lyric-sync-mobile.js'),'utf8');
const html=fs.readFileSync(path.join(root,'lyric-sync.html'),'utf8');
const dedicated=fs.readFileSync(path.join(root,'lyric-editor-page.js'),'utf8');
new Function(js);
for(const prohibited of [
 'syncInlineSource','syncInlineCommit','syncInlineSave','syncDisplayPanel',
 'syncDisplaySplitNow','syncDisplayBreak','syncDisplayJoin','function dispSave(',
 'function publishInline(','function dispSplit('
])assert.ok(!js.includes(prohibited),'Timing site must not edit lyrics: '+prohibited);
assert.ok(js.includes("function dispQuick("),'Quick timing corrections remain');
assert.ok(js.includes("function renderQuickTiming("),'Existing timing update panel remains');
assert.ok(js.includes('syncContextLyricLink'),'Link to dedicated lyric editor must exist');
assert.ok(js.includes('node.after(contextHost)'),'Selected row must open timing editor in place');
assert.ok(html.includes('lyric-sync-mobile.js?v=18.4'),'Version must refresh');
assert.ok(dedicated.includes('function applyBreaks'),'Dedicated page retains display breaks');
assert.ok(dedicated.includes('function splitAtCursor'),'Dedicated page retains line splits');
assert.ok(dedicated.includes('function joinPrevious'),'Dedicated page retains line joins');
assert.ok(dedicated.includes('async function publish'),'Dedicated page retains official lyric revision');
console.log('REC NOTE v18.4 lyric/timing separation: PASS');
