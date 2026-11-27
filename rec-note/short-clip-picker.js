/* REC NOTE: read-only short cut picker. No persistence, naming, or cloud writes. */
function shortPartFromCues(cues,hint) {
  const [label,estimatedStart,estimatedEnd]=hint;
  const timed=(cues||[]).filter(r=>Number.isFinite(r.start)&&!r.conflict).slice().sort((a,b)=>a.start-b.start);
  if(timed.length<2)return null;
  const first=timed.reduce((best,r)=>Math.abs(r.start-estimatedStart)<Math.abs(best.start-estimatedStart)?r:best,timed[0]);
  if(Math.abs(first.start-estimatedStart)>9)return null;
  const last=timed.filter(r=>r.i>=first.i && r.start<estimatedEnd-0.25).at(-1);
  if(!last)return null;
  const next=timed.find(r=>r.start>last.start+.05);
  const boundaries=[last.end,next?.start].filter(v=>Number.isFinite(v)&&v>last.start);
  if(!boundaries.length)return null;
  const end=Math.min(...boundaries);
  if(end<=first.start+1||Math.abs(end-estimatedEnd)>9)return null;
  return {label,from:first.i,to:last.i,start:first.start,end};
}
(function initShortPicker(){
  'use strict';
  const root=document.getElementById('syncStudio');
  if(!root||typeof window.RECNOTE_READONLY_SYNC!=='function')return;
  const hints={
    'あなたと':[['1番 Aメロ',19.89,46.63],['1番 Bメロ',46.63,80.79],['1番 サビ',80.79,118.53],['2番 Aメロ',136.55,164.10],['2番 サビ',164.10,204.98]],
    'これから':[['1番 Aメロ',31.12,71.89],['1番 Bメロ',71.89,88.11],['1番 サビ',88.11,115.40],['2番 Aメロ',115.40,169.50],['2番 Bメロ',169.50,196.78],['2番 サビ',196.78,232.09]],
    'これからも':[['1番 Aメロ',27.40,72.28],['1番 Bメロ',72.28,90.36],['1番 サビ',90.36,114.36],['1番 サビ後半',114.36,140.54],['2番 Aメロ',165.50,190.80],['2番 Bメロ',190.80,220.00],['2番 Cメロ',220.00,245.51],['ラスサビ',245.51,278.55]]
  };
  const panel=document.createElement('details');
  panel.id='recnoteShortPicker';
  panel.className='recnoteShortPicker';
  panel.innerHTML=`<summary>ショート動画の区間を選ぶ <small>歌詞・時刻を再登録しません</small></summary>
  <div class="scpBody">
    <p>候補を押すだけで、保存済みの歌詞時刻から切り出し範囲を取得します。Aメロ等の名称は過去の仮マップをもとにした目安です。試聴して確かめてください。</p>
    <div class="scpCandidates" id="scpCandidates" aria-label="楽曲構成の候補"></div>
    <div class="scpSelects">
      <label>始める歌詞<select id="scpFrom"></select></label>
      <label>終わる歌詞<select id="scpTo"></select></label>
      <label>長さ<select id="scpLength"><option value="all">選択範囲すべて</option><option value="15">最大15秒</option><option value="30" selected>最大30秒</option><option value="60">最大60秒</option></select></label>
    </div>
    <div id="scpPreview" class="scpPreview" role="status">歌詞の時刻を読み込んでいます。</div>
    <div class="scpActions"><button type="button" id="scpListen">この区間を試聴</button><button type="button" id="scpCopy">切り出し位置をコピー</button></div>
    <p class="scpNote" id="scpStatus" role="status">入力や保存は不要です。元の歌詞と時刻は変更しません。</p>
  </div>`;
  root.insertBefore(panel,root.querySelector('.syncSectionLabel'));
  const $=id=>document.getElementById(id);
  let chosen=null,activeSong='',activeVersion='',previewEnd=null;
  const audio=document.getElementById('audio');
  const format=t=>{const n=Math.max(0,Math.round(t*100));return Math.floor(n/6000)+':'+String(Math.floor(n/100)%60).padStart(2,'0')+'.'+String(n%100).padStart(2,'0');};
  function current(){return window.RECNOTE_READONLY_SYNC();}
  function selectedRange(){
    const d=current(),cues=d?.rows||[];
    const from=cues.find(r=>String(r.i)===$('scpFrom').value),to=cues.find(r=>String(r.i)===$('scpTo').value);
    if(!from||!to||from.i>to.i||from.conflict||to.conflict||!Number.isFinite(from.start)||!Number.isFinite(to.start))return null;
    const next=cues.find(r=>r.i>to.i&&Number.isFinite(r.start)&&r.start>to.start);
    const sectionStarts=(d.sections||[]).filter(r=>['interlude','outro'].includes(r.type)&&Number.isFinite(r.start)&&r.start>to.start).map(r=>r.start);
    const ends=[to.end,next?.start,...sectionStarts].filter(v=>Number.isFinite(v)&&v>to.start);
    if(!ends.length)return null;
    const fullEnd=Math.min(...ends);
    const cap=$('scpLength').value==='all'?Infinity:Number($('scpLength').value);
    const end=Math.min(fullEnd,from.start+cap);
    if(!Number.isFinite(end)||end<=from.start)return null;
    return {song:d.song,start:from.start,end,lyric:cues.filter(r=>r.i>=from.i&&r.i<=to.i).map(r=>r.text).join(' / ')};
  }
  function previewText(){
    const range=selectedRange(),view=$('scpPreview'),ok=!!range;
    $('scpListen').disabled=!ok||!current()?.audioReady;
    $('scpCopy').disabled=!ok;
    view.textContent=ok?`${format(range.start)} 〜 ${format(range.end)}（${Math.round((range.end-range.start)*10)/10}秒）\n${range.lyric}`:'開始と終了の歌詞に時刻が必要です。終了時刻が未設定の場合は次の歌詞・間奏の開始を参照します。';
  }
  function selectPart(from,to){
    $('scpFrom').value=String(from);$('scpTo').value=String(to);previewEnd=null;previewText();
  }
  function redraw(){
    if(!panel.open)return;
    const d=current();if(!d)return;
    const cues=(d.rows||[]).filter(r=>Number.isFinite(r.start)&&!r.conflict);
    const source=$('scpCandidates');source.replaceChildren();
    const songChanged=d.song!==activeSong||d.versionId!==activeVersion;
    if(songChanged){activeSong=d.song;activeVersion=d.versionId;chosen=null;}
    for(const hint of hints[d.song]||[]){
      const r=shortPartFromCues(d.rows||[],hint),button=document.createElement('button');
      button.type='button';button.textContent=hint[0];button.disabled=!r;
      if(r&&chosen===r.label)button.classList.add('active');
      button.title=r?`${format(r.start)}〜${format(r.end)}：試聴して確認`:'この範囲の歌詞タイミングが不足しています';
      button.addEventListener('click',()=>{chosen=r.label;source.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===button));selectPart(r.from,r.to);});
      source.append(button);
    }
    for(const [id,placeholder] of [['scpFrom','開始'],['scpTo','終了']]){
      const select=$(id),value=songChanged?'':select.value;select.replaceChildren();
      for(const r of cues){
        const opt=document.createElement('option');opt.value=String(r.i);opt.textContent=`${format(r.start)} ${r.text.slice(0,34)}`;select.append(opt);
      }
      if(cues.some(r=>String(r.i)===value))select.value=value;
      else select.value=id==='scpFrom'?String(cues[0]?.i??''):String(cues[Math.min(cues.length-1,4)]?.i??'');
    }
    if(!cues.length)$('scpStatus').textContent='保存済みの歌詞時刻がありません。曲のタイミング合わせを先に行ってください。';
    else $('scpStatus').textContent='候補の名称は推定です。登録・命名は不要です。歌詞原本・時刻・クラウドには何も書き込みません。';
    previewText();
  }
  panel.addEventListener('toggle',redraw);
  for(const id of ['scpFrom','scpTo','scpLength'])$(id).addEventListener('change',()=>{if(id!=='scpLength'){chosen=null;sourceButtons().forEach(b=>b.classList.remove('active'));}previewText();});
  function sourceButtons(){return Array.from($('scpCandidates').querySelectorAll('button'));}
  $('scpListen').addEventListener('click',()=>{
    const range=selectedRange(),d=current();if(!range||!d?.audioReady){$('scpStatus').textContent='この曲の音源が読み込まれていません。';return;}
    previewEnd=range.end;
    audio.currentTime=Math.max(0,range.start-(d.offset||0));
    audio.play().catch(e=>{$('scpStatus').textContent='再生できません：'+e.message;previewEnd=null;});
  });
  audio.addEventListener('timeupdate',()=>{
    if(previewEnd===null)return;
    const d=current();if(!d||d.song!==activeSong){previewEnd=null;return;}
    if(audio.currentTime+(d.offset||0)>=previewEnd){audio.pause();previewEnd=null;}
  });
  $('scpCopy').addEventListener('click',async()=>{
    const r=selectedRange();if(!r)return;
    const text=`${r.song}\n原曲：${format(r.start)} 〜 ${format(r.end)}\n長さ：約${(r.end-r.start).toFixed(2)}秒\n歌詞：${r.lyric}`;
    try{await navigator.clipboard.writeText(text);$('scpStatus').textContent='切り出し位置をコピーしました。';}
    catch(_e){
      const t=document.createElement('textarea');t.value=text;t.readOnly=true;t.style.width='100%';$('scpStatus').replaceChildren(t);t.focus();t.select();
      $('scpStatus').insertAdjacentText('beforeend',' コピーが許可されないため、この文章を選択しました。');
    }
  });
  window.addEventListener('recnote:lyric-snapshot',redraw);
  window.addEventListener('recnote:cloud-synced',redraw);
  window.addEventListener('recnote:cloud-auth-change',redraw);
  window.addEventListener('hashchange',()=>{if(location.hash==='#recnoteShortPicker')panel.open=true;});
  if(location.hash==='#recnoteShortPicker')panel.open=true;
})();
