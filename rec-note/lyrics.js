/* REC NOTE v6 — Lyric time alignment, read only from the owner's existing lyric archive.
 * The actual lyrics stay in lyric_master_text_versions; only time anchors are saved.
 */
(function () {
  'use strict';
  const $l = id => document.getElementById(id);
  const bridge = window.RECNOTE_LYRIC_BRIDGE;
  if (!bridge || !$l('wave') || typeof state === 'undefined' || typeof persist !== 'function') return;
  if (!Array.isArray(state.lyricTimings)) state.lyricTimings = [];

  let work = null;
  let versions = [];
  let version = null;
  let rawLines = [];
  let selectedLine = -1;
  let requestSeq = 0;
  let activePlaybackLine = -1;

  const panel = document.createElement('section');
  panel.id = 'lyricsPanel';
  panel.className = 'lyricsPanel';
  panel.setAttribute('aria-label', '歌詞と時間を紐付ける');
  panel.innerHTML = [
    '<div class="lyricsHeading">',
    '  <div><h2>歌詞を見ながら聴く</h2><p>歌詞は「余白」から取得します。時間だけをREC NOTEに記録します。</p></div>',
    '  <button type="button" class="small" id="lyricsReload">歌詞を更新</button>',
    '</div>',
    '<div class="lyricsMeta">',
    '  <span class="lyricsLoadStatus" id="lyricsLoadStatus" role="status">確認中…</span>',
    '  <label class="lyricsVersionLabel" id="lyricsVersionWrap" hidden>歌詞の版 <select id="lyricsVersion" aria-label="表示する歌詞の版"></select></label>',
    '  <span class="lyricsProgress" id="lyricsProgress"></span>',
    '</div>',
    '<p class="lyricsCaution" id="lyricsCaution" hidden></p>',
    '<div class="lyricsScroll" id="lyricsScroll" role="list" aria-label="歌詞の行一覧"></div>',
    '<div class="lyricsEditor" id="lyricsEditor" hidden>',
    '  <div class="lyricsSelected" id="lyricsSelected"></div>',
    '  <div class="lyricsTimeGrid">',
    '    <label>開始 <input id="lyricsStart" type="text" inputmode="decimal" placeholder="1:19.0" autocomplete="off" /></label>',
    '    <label>終了 <input id="lyricsEnd" type="text" inputmode="decimal" placeholder="1:24.0" autocomplete="off" /></label>',
    '  </div>',
    '  <div class="lyricsActions">',
    '    <button type="button" id="lyricsCaptureStart">現在位置 → 開始</button>',
    '    <button type="button" id="lyricsCaptureEnd">現在位置 → 終了</button>',
    '    <button type="button" id="lyricsSaveTime" class="soft">時間を保存</button>',
    '  </div>',
    '  <div class="lyricsActions lyricsPrimaryActions">',
    '    <button type="button" id="lyricsPlay">▶ ここから聴く</button>',
    '    <button type="button" id="lyricsUse" class="primary">この歌詞で指示を作る</button>',
    '  </div>',
    '  <p class="lyricsHint" id="lyricsHint"></p>',
    '</div>',
    '<div class="lyricsExport"><button type="button" id="lyricsSrt" class="small" disabled>時間登録済みの歌詞をSRT出力</button>',
    '<span class="lyricsHint">未登録の行は出力しません。歌詞の原文には書き込みません。</span></div>'
  ].join('');
  const anchor = document.querySelector('.layout > .panel .panelBody .waveHelp');
  if (!anchor) return;
  anchor.insertAdjacentElement('afterend', panel);

  const status = (message, warning=false) => {
    $l('lyricsLoadStatus').textContent = message;
    $l('lyricsLoadStatus').classList.toggle('warning', warning);
  };
  const currentVersionKey = () => version && work ? work.id + ':' + version.id : '';
  const timingId = index => 'lyric-line:' + currentVersionKey() + ':' + index;
  const timings = () => Array.isArray(state.lyricTimings) ? state.lyricTimings : [];
  const primaryTiming = index => timings().find(x => x.id === timingId(index));
  const conflictTimings = index => timings().filter(x => x.syncConflictOf === timingId(index));
  const timestamp = () => Math.round(Math.max(0, Number(current) || 0) * 10) / 10;

  function renderLines() {
    const container = $l('lyricsScroll');
    const oldScroll = container.scrollTop;
    container.replaceChildren();
    if (!version) return;
    let registered = 0, count = 0;
    for (let i=0; i<rawLines.length; i++) {
      const line = rawLines[i];
      if (!line.trim()) {
        const gap=document.createElement('div');
        gap.className='lyricsStanza';
        gap.setAttribute('aria-hidden','true');
        container.append(gap);
        continue;
      }
      count++;
      const timing = primaryTiming(i);
      if (timing && Number.isFinite(timing.start)) registered++;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lyricsLine' + (selectedLine === i ? ' selected' : '');
      item.dataset.lineIndex = String(i);
      item.setAttribute('role','listitem');
      item.setAttribute('aria-pressed',String(selectedLine===i));
      const title = document.createElement('span');
      title.className = 'lyricsText';
      title.textContent = line;
      const time = document.createElement('span');
      time.className = 'lyricsTime';
      time.textContent = timing && Number.isFinite(timing.start) ?
        fmt(timing.start) + (Number.isFinite(timing.end) ? '–' + fmt(timing.end) : ' / 終了未設定') : '時間未設定';
      if (conflictTimings(i).length) {
        time.classList.add('warning');
        time.textContent += ' / 同時編集の競合あり';
      }
      item.append(title,time);
      item.addEventListener('click', () => selectLine(i));
      container.append(item);
    }
    container.scrollTop = oldScroll;
    $l('lyricsProgress').textContent = '開始時刻 ' + registered + ' / ' + count + '行';
    $l('lyricsSrt').disabled = !rawLines.some((l,i)=>{
      const t=primaryTiming(i);
      return l.trim() && Number.isFinite(t?.start) && Number.isFinite(t?.end) && t.end>t.start;
    });
    renderPlaybackLine();
  }

  function showEditor() {
    const chosen = selectedLine>=0 && version && rawLines[selectedLine]?.trim();
    $l('lyricsEditor').hidden = !chosen;
    if(!chosen) return;
    $l('lyricsSelected').textContent = rawLines[selectedLine];
    const record = primaryTiming(selectedLine);
    $l('lyricsStart').value = Number.isFinite(record?.start) ? fmt(record.start) : '';
    $l('lyricsEnd').value = Number.isFinite(record?.end) ? fmt(record.end) : '';
    const conflict = conflictTimings(selectedLine).length;
    $l('lyricsHint').textContent = conflict ?
      '同じ行が別端末で同時に編集されています。競合記録は保護されています。内容を確認してください。' :
      '曲を再生して現在位置を取得するか、上の時刻欄に直接入力してください。';
  }

  function selectLine(index) {
    if(!version || !rawLines[index]?.trim()) return;
    selectedLine = index;
    const timing = primaryTiming(index);
    if(Number.isFinite(timing?.start)) seek(timing.start);
    showEditor();
    renderLines();
  }

  function setTiming(start,end) {
    if(selectedLine<0 || !version || !work) return false;
    if(start!==null && (!Number.isFinite(start)||start<0)) {
      notify('開始時間は 1:19.0 の形式で入力してください。');
      return false;
    }
    if(end!==null && (!Number.isFinite(end)||end<0)) {
      notify('終了時間の形式を確認してください。');
      return false;
    }
    if(end!==null && start===null) {
      notify('先に開始時間を指定してください。');
      return false;
    }
    if(end!==null && end<=start) {
      notify('終了時間は開始時間より後にしてください。');
      return false;
    }
    const id=timingId(selectedLine);
    const data = {
      id, song, workId:work.id, textVersionId:version.id, lineIndex:selectedLine,
      start, end, updatedAt:new Date().toISOString()
    };
    const old=timings().findIndex(x=>x.id===id);
    if(old>=0) state.lyricTimings[old]=data;
    else state.lyricTimings.push(data);
    persist();
    showEditor();
    renderLines();
    notify('歌詞の時間を保存しました。Mac・iPhoneで同期されます。');
    return true;
  }

  function capture(which) {
    if(selectedLine<0 || !version) return;
    let start= $l('lyricsStart').value.trim() ? parseTime($l('lyricsStart').value) : null;
    let end= $l('lyricsEnd').value.trim() ? parseTime($l('lyricsEnd').value) : null;
    const t=timestamp();
    if(which==='start') {
      start=t;
      if(end!==null && end<=start)end=null;
    } else {
      if(start===null){notify('先に開始時間を指定してください。');return;}
      end=t;
    }
    setTiming(start,end);
  }
  function saveTimes(){
    const a=$l('lyricsStart').value.trim(), b=$l('lyricsEnd').value.trim();
    if(!a){notify('開始時間を指定してください。');return;}
    setTiming(parseTime(a), b?parseTime(b):null);
  }
  function useLyricForInstruction() {
    if(selectedLine<0 || !version || !work)return;
    if(editId) {
      notify('別の指示を編集中です。「入力をクリア」してから歌詞を選択してください。');
      return;
    }
    const t=primaryTiming(selectedLine);
    const start=Number.isFinite(t?.start)?t.start:timestamp();
    const end=Number.isFinite(t?.end)?t.end:null;
    $l('lyricInput').value=rawLines[selectedLine];
    rangeStart=start;rangeEnd=end;
    updateTimeLabels();
    seek(start);
    if(typeof saveDraft==='function')saveDraft();
    $l('lyricsUse').textContent = '✓ 指示フォームに反映済み';
    $l('formTitle').scrollIntoView({behavior:'smooth',block:'center'});
    notify('歌詞と時間を指示フォームに反映しました。内容を入力して保存してください。');
  }
  const getFormLink = () => {
    if(!version || selectedLine<0 || !work || !$l('lyricInput'))return null;
    if($l('lyricInput').value !== rawLines[selectedLine])return null;
    return {workId:work.id,textVersionId:version.id,lineIndex:selectedLine};
  };

  async function loadLyrics() {
    const seq=++requestSeq, requestedSong=song;
    selectedLine=-1;work=null;versions=[];version=null;rawLines=[];
    $l('lyricsEditor').hidden=true;
    $l('lyricsVersionWrap').hidden=true;
    $l('lyricsCaution').hidden=true;
    $l('lyricsScroll').replaceChildren();
    $l('lyricsProgress').textContent='';
    $l('lyricsSrt').disabled=true;
    if(!bridge.isSignedIn()) {
      status('歌詞を表示するには上のクラウドにログインしてください。');
      return;
    }
    status('「余白」の歌詞を読み込み中…');
    try {
      const response=await bridge.read(requestedSong);
      if(seq!==requestSeq || requestedSong!==song)return;
      if(!response || !response.versions?.length) {
        status('この曲の歌詞原文は「余白」に見つかりません。',true);
        return;
      }
      work=response.work;versions=response.versions;
      const picker=$l('lyricsVersion');
      picker.replaceChildren();
      for(const v of versions){
        const option=document.createElement('option');
        option.value=v.id;
        option.textContent='第'+v.version_no+'版 / '+(v.text_status==='author_original'?'作者原文':v.text_status==='author_revision'?'作者改稿':'原本未照合');
        picker.append(option);
      }
      $l('lyricsVersionWrap').hidden=versions.length<2;
      showVersion(versions[0].id);
    } catch(err) {
      if(seq!==requestSeq)return;
      status('歌詞を取得できません：'+err.message,true);
    }
  }
  function showVersion(id){
    version=versions.find(v=>v.id===id)||versions[0]||null;
    selectedLine=-1;
    rawLines=version ? version.literal_text.replace(/\r\n?/g,'\n').split('\n'):[];
    $l('lyricsVersion').value=version?.id||'';
    const unverified=version?.text_status==='unverified_pdf_extract' || work?.verification_status==='catalog_only';
    const warning=$l('lyricsCaution');
    warning.hidden=!unverified;
    warning.textContent=unverified?
      'この版はPDFから抽出された未照合の歌詞です。原文との一致確認が必要です。REC NOTEから元データは変更しません。':'';
    status(unverified?'歌詞を表示中（原文未照合）':'「余白」の登録済み歌詞を表示中',unverified);
    renderLines();
  }

  function playSelected(){
    const t=primaryTiming(selectedLine);
    if(!Number.isFinite(t?.start)){notify('先にこの行の開始時間を記録してください。');return;}
    seek(t.start);
    if(audio.paused)playAudio();
  }
  function formatSrtTime(t){
    const ms=Math.max(0,Math.round(t*1000));
    const hh=String(Math.floor(ms/3600000)).padStart(2,'0');
    const mm=String(Math.floor(ms%3600000/60000)).padStart(2,'0');
    const ss=String(Math.floor(ms%60000/1000)).padStart(2,'0');
    const sub=String(ms%1000).padStart(3,'0');
    return hh+':'+mm+':'+ss+','+sub;
  }
  function exportSrt(){
    if(!version)return;
    const rows=[];
    rawLines.forEach((lyric,i)=>{
      const t=primaryTiming(i);
      if(lyric.trim() && Number.isFinite(t?.start) && Number.isFinite(t?.end) && t.end>t.start)
        rows.push({lyric,start:t.start,end:t.end,lineIndex:i});
    });
    rows.sort((a,b)=>a.start-b.start||a.lineIndex-b.lineIndex);
    if(!rows.length){notify('開始・終了が登録されている歌詞がありません。');return;}
    const txt=rows.map((r,i)=>(i+1)+'\n'+formatSrtTime(r.start)+' --> '+formatSrtTime(r.end)+'\n'+r.lyric+'\n').join('\n');
    downloadText('REC_NOTE_'+song.replace(/[\/:*?"<>|]/g,'_')+'_歌詞タイミング.srt',txt,'text/plain;charset=utf-8');
    notify(rows.length+'行の字幕SRTを保存しました。未設定の行は含みません。');
  }
  function renderPlaybackLine(){
    if(!version)return;
    const t=Number(current)||0;
    let active=-1;
    for(let i=0;i<rawLines.length;i++){
      const a=primaryTiming(i);
      if(a && Number.isFinite(a.start) && a.start<=t && (Number.isFinite(a.end)?t<a.end:true)) {
        if(active<0 || a.start>(primaryTiming(active)?.start??-1)) active=i;
      }
    }
    if(active===activePlaybackLine) return;
    activePlaybackLine=active;
    for(const node of $l('lyricsScroll').querySelectorAll('.lyricsLine')){
      node.classList.toggle('playing',Number(node.dataset.lineIndex)===active);
    }
  }

  $l('lyricsReload').addEventListener('click',loadLyrics);
  $l('lyricsVersion').addEventListener('change',e=>showVersion(e.target.value));
  $l('lyricsCaptureStart').addEventListener('click',()=>capture('start'));
  $l('lyricsCaptureEnd').addEventListener('click',()=>capture('end'));
  $l('lyricsSaveTime').addEventListener('click',saveTimes);
  $l('lyricsUse').addEventListener('click',useLyricForInstruction);
  $l('lyricsPlay').addEventListener('click',playSelected);
  $l('lyricsSrt').addEventListener('click',exportSrt);
  audio.addEventListener('timeupdate',renderPlaybackLine);

  window.addEventListener('recnote:cloud-auth-change',()=>loadLyrics());
  window.addEventListener('recnote:cloud-synced',()=>{
    if(!version)return;
    renderLines();
    if(selectedLine>=0)showEditor();
  });

  // Each song is linked only after authenticated retrieval; no lyrics are bundled publicly.
  const previousSetSong = setSong;
  setSong=function(next){
    const before=song;
    previousSetSong(next);
    if(before!==song)loadLyrics();
  };
  window.RECNOTE_LYRICS=Object.freeze({
    getFormLink,
    refresh:loadLyrics,
    getSelected:()=>selectedLine>=0&&version?{text:rawLines[selectedLine],versionId:version.id,lineIndex:selectedLine}:null
  });
  loadLyrics();
})();