/* note投稿準備ツール: 公開API・秘密情報・外部画像取得を必要としない。 */
(function(root){
'use strict';
const PALETTES={
  'ai-work':{bg:'#153c34',alt:'#255a4b',accent:'#b8e0bb',ink:'#f7f7ef',theme:'AI × WORK'},
  'music-education':{bg:'#283e4c',alt:'#385968',accent:'#c9dbe3',ink:'#f5f7f3',theme:'MUSIC EDUCATION'},
  composing:{bg:'#493c37',alt:'#65544b',accent:'#e3c6a4',ink:'#fcf7ef',theme:'COMPOSITION'},
  knowledge:{bg:'#233c43',alt:'#325661',accent:'#e0cf99',ink:'#f7f4eb',theme:'KNOWLEDGE LIBRARY'},
  tools:{bg:'#34395d',alt:'#4b517a',accent:'#c4d7ee',ink:'#f9f8fa',theme:'TOOLS & MATERIALS'}
};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function headings(text){
  const lines=String(text||'').split(/\r?\n/),out=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i],md=line.match(/^\s*(#{2,3})\s+(.+?)\s*#*\s*$/),jp=!md?line.match(/^\s*【([^】]{2,55})】\s*$/):null;
    const value=md?clean(md[2]):jp?clean(jp[1]):'';
    if(value&&value.length<=85&&out.length<30)out.push({text:value,level:md?md[1].length:2,line:i+1});
  }
  return out;
}
function visualPlan(body,magazine,format){
  const hs=headings(body),count=[...String(body||'').replace(/\s/g,'')].length;
  if(count<1000||format==='short')return [];
  // 図解候補は必要最小限。記事内容に対応する画像そのものは別途確認する。
  const max=(count>3000||format==='deep')?2:1;
  const configs={
    'ai-work':['手順図・改善前後の比較','工程や画面を伝える図。実際の手順から再作成し、学校データを載せない'],
    'music-education':['学習の流れ・教材の図解','授業のねらいと活動のつながりを可視化。楽譜・写真・生徒情報の権利を確認'],
    composing:['制作過程の視覚資料','自作楽曲の譜例や制作メモなど、本人の許可した資料だけ使用'],
    knowledge:['概念図・年表・地図','資料照合後に作成。史実・年代・出典の確認が必須'],
    tools:['画面キャプチャ・使い方の図','本人が公開を認めた画面だけを使用。名前・アカウント等を写さない']
  };
  const [type,rule]=configs[magazine]||configs['ai-work'];
  const result=[];
  for(let i=0;i<Math.min(max,hs.length);i++){
    const h=hs[Math.floor((i+1)*hs.length/(Math.min(max,hs.length)+1))-1]||hs[i];
    result.push({type,after:h.text,description:rule,status:'制作前・権利未確認'});
  }
  if(!hs.length&&count>1800)result.push({type,after:'本文中ほど（見出し設定後に確定）',description:rule,status:'制作前・権利未確認'});
  return result;
}
function wrap(ctx,text,maxWidth,maxLines){
  const chars=Array.from(clean(text)),out=[];let line='';
  for(const ch of chars){
    if(!line){line=ch;continue;}
    if(ctx.measureText(line+ch).width>maxWidth){out.push(line);line=ch;if(out.length>=maxLines)break}
    else line+=ch;
  }
  if(out.length<maxLines&&line)out.push(line);
  if(out.join('')!==chars.join('')&&out.length){
    let last=out.length-1;
    while(out[last].length>1&&ctx.measureText(out[last]+'…').width>maxWidth)out[last]=out[last].slice(0,-1);
    out[last]+='…';
  }
  return out;
}
function cover(canvas,title,magazineName,magazineId){
  if(!canvas||typeof canvas.getContext!=='function')throw Error('画像の書き出しに対応したブラウザで開いてください');
  canvas.width=1280;canvas.height=670;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('2D画像の生成に失敗しました');
  const p=PALETTES[magazineId]||PALETTES['ai-work'];
  ctx.fillStyle=p.bg;ctx.fillRect(0,0,1280,670);
  // 写真や人物を偽装せず、マガジンごとの図形とタイポグラフィで構成する。
  ctx.fillStyle=p.alt;ctx.beginPath();ctx.arc(1115,104,430,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=p.accent;ctx.lineWidth=2;ctx.globalAlpha=.45;
  for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(1100,160,175+i*48,0,Math.PI*2);ctx.stroke()}
  ctx.globalAlpha=1;ctx.fillStyle=p.accent;ctx.fillRect(82,92,70,5);
  ctx.font='700 24px "Zen Kaku Gothic New",sans-serif';
  ctx.fillText(p.theme,82,166);
  ctx.fillStyle=p.ink;ctx.font='700 57px "Zen Kaku Gothic New",sans-serif';
  let lines=wrap(ctx,title||'記事タイトル',1030,3);
  if(lines.length===3&&lines.join('').length>55){ctx.font='700 50px "Zen Kaku Gothic New",sans-serif';lines=wrap(ctx,title||'記事タイトル',1030,3)}
  const step=ctx.font.includes('50px')?77:87;
  const startY=lines.length===1?350:lines.length===2?310:260;
  lines.forEach((line,i)=>ctx.fillText(line,82,startY+i*step));
  ctx.strokeStyle=p.accent;ctx.globalAlpha=.75;ctx.beginPath();ctx.moveTo(82,565);ctx.lineTo(1198,565);ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle=p.ink;ctx.font='500 25px "Zen Kaku Gothic New",sans-serif';
  const label=clean(magazineName||'知の図書館').slice(0,30);
  ctx.fillText(label,82,613);
  ctx.font='500 17px "Zen Kaku Gothic New",sans-serif';ctx.fillText('MUSIC · EDUCATION · CREATION',880,613);
  return canvas;
}
root.EDITOR_NOTE_PACKAGE=Object.freeze({headings,visualPlan,cover,PALETTES});
})(window);