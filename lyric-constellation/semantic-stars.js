/* 星空 v1 — 本人専用の作品間比較を、歌詞を公開せずに可視化します。
 * 素材は認証後にRLSで取得。精読の線は「仮説」であり、作者の承認とは別です。 */
(function(){
'use strict';
var state={mode:'meaning',layout:'album',scope:'all',collection:'',search:'',path:'',expanded:false,history:[]};
var records=[],pathRows=[],status='signed_out',problem='';
var originalGraph,originalCard,originalConstellation,originalRender,originalLoader;
var rawConnections,connectionCache={signature:'',links:[]},gravityCache={key:'',geo:null};

function cleanText(value){return String(value==null?'':value);}
function safe(value){return cleanText(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h;}
function catalog(all){
 return all.filter(function(w){return w.sky==='rap';}).slice().sort(function(a,b){
  return (Number.isFinite(a.originalBookIndex)?a.originalBookIndex:99999)-(Number.isFinite(b.originalBookIndex)?b.originalBookIndex:99999)||String(a.title).localeCompare(String(b.title),'ja');
 });
}
function makePositions(all){
 var groups=new Map(),ordered=catalog(all);
 ordered.forEach(function(w){var k=w.collection||'その他・個人作品';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(w);});
 var ncol=5,cellW=332,cellH=266,width=1730,height=Math.max(1050,Math.ceil(groups.size/ncol)*cellH+66);
 var pos=new Map(),labels=[],j=0;
 groups.forEach(function(ws,name){
  var col=j%ncol,row=Math.floor(j/ncol),cx=177+col*cellW,cy=156+row*cellH;
  labels.push({title:name,x:cx,y:cy-119,count:ws.length});
  ws.forEach(function(w,k){
   var angle=(k+1)*2.399963229728653+(hash(name)%100)/110,rad=21+Math.sqrt(k)*22;
   pos.set(w.id,{x:cx+Math.cos(angle)*rad,y:cy+Math.sin(angle)*rad,group:j});
  });j++;
 });
 return {pos:pos,labels:labels,width:width,height:height};
}
function normalize(rows,all){
 var ids=new Set(all.map(function(w){return w.id;})),seen=new Set();
 return (Array.isArray(rows)?rows:[]).filter(function(e){
  if(!e||!e.left_work_id||!e.right_work_id)return false;
  var a='master-'+e.left_work_id,b='master-'+e.right_work_id;
  if(a===b||!ids.has(a)||!ids.has(b))return false;
  var key=e.link_key||[a,b].sort().join('|');
  if(seen.has(key))return false;seen.add(key);return true;
 }).map(function(e){
  return {a:'master-'+e.left_work_id,b:'master-'+e.right_work_id,
   topic:cleanText(e.topic),kind:cleanText(e.relation_type),left:cleanText(e.evidence_left),
   right:cleanText(e.evidence_right),observation:cleanText(e.observation),
   interpretation:cleanText(e.interpretation),alternative:cleanText(e.alternative),
   key:cleanText(e.link_key)};
 });
}
function normalizePaths(rows,all){
 var ids=new Set(all.filter(function(w){return w.sky==='rap';}).map(function(w){return w.id;}));
 return (Array.isArray(rows)?rows:[]).map(function(p){
  if(!p||!p.thread_key||!Array.isArray(p.anchors))return null;
  var seen=new Set(),steps=[];
  p.anchors.forEach(function(a){
   if(a&&a.kind==='work'&&a.source_id){
    var id='master-'+a.source_id;
    if(ids.has(id)&&!seen.has(id)){
     seen.add(id);steps.push({id:id,quote:cleanText(a.quote),observation:cleanText(a.observation),
      technique:cleanText(a.technique)});
    }
   }
  });
  return steps.length>=2?{id:cleanText(p.thread_key),title:cleanText(p.title||'名称未設定の星座'),
   question:cleanText(p.guiding_question),hypothesis:cleanText(p.core_hypothesis),
   alternative:cleanText(p.counterreading),limit:cleanText(p.inference_limit),
   ids:steps.map(function(x){return x.id;}),steps:steps}:null;
 }).filter(Boolean).sort(function(a,b){return a.title.localeCompare(b.title,'ja');});
}
/* Deterministic force-directed layout. Coordinates reflect sourced links, NOT a claim
 * of mathematical similarity or verified authorial intention. Unlinked works remain
 * as clearly separate outer stars; no connections are invented. */
function semanticPositions(all,links,paths){
 var nodes=catalog(all),ids=new Set(nodes.map(function(w){return w.id;}));
 var couples=[],seen=new Set(),degree=new Map(),width=1730,height=1260,cx=width/2,cy=height/2;
 nodes.forEach(function(w){degree.set(w.id,0);});
 function bond(a,b,weight,dist){
  if(!ids.has(a)||!ids.has(b)||a===b)return;
  var key=[a,b].sort().join('|')+'|'+dist;
  if(seen.has(key))return;
  seen.add(key);couples.push({a:a,b:b,weight:weight,d:dist});
  degree.set(a,degree.get(a)+weight);degree.set(b,degree.get(b)+weight);
 }
 (links||[]).forEach(function(e){bond(e.a,e.b,1,118);});
 (paths||[]).forEach(function(p){
  for(var i=1;i<p.ids.length;i++)bond(p.ids[i-1],p.ids[i],.38,170);
 });
 var signature=nodes.map(function(w){return w.id;}).join(',')+'|'+couples.map(function(e){return e.a+':'+e.b+':'+e.d;}).join(';');
 if(gravityCache.key===signature&&gravityCache.geo)return gravityCache.geo;
 if(!couples.length)return makePositions(all);
 var movable=nodes.filter(function(w){return degree.get(w.id)>0;});
 var outside=nodes.filter(function(w){return degree.get(w.id)===0;});
 var pos=new Map(),velocity=new Map(),tone=new Map(),indexed=new Map();
 var groups=new Map();
 nodes.forEach(function(w){var k=w.collection||'その他';if(!groups.has(k))groups.set(k,groups.size);tone.set(w.id,groups.get(k));});
 movable.forEach(function(w,i){
  var n=hash(w.id),ang=(n%65521)/65521*Math.PI*2,r=145+(hash('r'+w.id)%340);
  pos.set(w.id,{x:cx+Math.cos(ang)*r,y:cy+Math.sin(ang)*r,group:tone.get(w.id)});
  velocity.set(w.id,{x:0,y:0});indexed.set(w.id,i);
 });
 var edges=couples.filter(function(e){return indexed.has(e.a)&&indexed.has(e.b);})
  .map(function(e){return {a:indexed.get(e.a),b:indexed.get(e.b),weight:e.weight,d:e.d};});
 var arr=movable.map(function(w){return pos.get(w.id);});
 var vel=movable.map(function(w){return velocity.get(w.id);});
 for(var iter=0;iter<120;iter++){
  for(var i=0;i<arr.length;i++){
   var a=arr[i],v=vel[i];
   for(var j=i+1;j<arr.length;j++){
    var b=arr[j],bv=vel[j],dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy+120;
    var dist=Math.sqrt(d2),f=Math.min(3.7,13000/d2),fx=dx/dist*f,fy=dy/dist*f;
    v.x+=fx;v.y+=fy;bv.x-=fx;bv.y-=fy;
   }
  }
  edges.forEach(function(e){
   var a=arr[e.a],b=arr[e.b],dx=b.x-a.x,dy=b.y-a.y;
   var d=Math.sqrt(dx*dx+dy*dy)+.001,pull=Math.min(9,Math.max(-9,(d-e.d)*.0085*e.weight));
   var fx=dx/d*pull,fy=dy/d*pull;
   vel[e.a].x+=fx;vel[e.a].y+=fy;vel[e.b].x-=fx;vel[e.b].y-=fy;
  });
  for(var i=0;i<arr.length;i++){
   var p=arr[i],v=vel[i];
   v.x=(v.x+(cx-p.x)*.0018)*.71;v.y=(v.y+(cy-p.y)*.0018)*.71;
   p.x=Math.min(width-116,Math.max(116,p.x+Math.max(-13,Math.min(13,v.x))));
   p.y=Math.min(height-112,Math.max(112,p.y+Math.max(-13,Math.min(13,v.y))));
  }
 }
 outside.forEach(function(w,i){
  var angle=(i+.5)/outside.length*Math.PI*2-.6;
  pos.set(w.id,{x:cx+Math.cos(angle)*(width/2-82),
   y:cy+Math.sin(angle)*(height/2-78),group:tone.get(w.id),unlinked:true});
 });
 gravityCache={key:signature,geo:{pos:pos,labels:[],width:width,height:height,unlinked:outside.length}};
 return gravityCache.geo;
}
function wordLinks(){
 return connections().slice(0,600).map(function(e){
  return {a:e.a,b:e.b,kind:'word',topic:e.shared.slice(0,3).join('・'),
   observation:'歌詞に共通する表記：'+e.shared.slice(0,5).join('、'),
   interpretation:'文字列の一致です。主題や制作意図の一致を意味しません。',
   left:'',right:'',key:e.a+'|'+e.b,score:e.score};
 });
}
function related(edges,id){return edges.filter(function(e){return e.a===id||e.b===id;});}
function edgeList(all){
 return state.mode==='words'?wordLinks():normalize(records,all);
}
function currentModeWorks(all,edges,selection){
 if(state.scope==='all')return catalog(all);
 var chosen=new Set(selection?[selection]:[]);
 related(edges,selection).slice(0,13).forEach(function(e){chosen.add(e.a===selection?e.b:e.a);});
 var path=activePath(all);if(path)path.ids.forEach(function(id){chosen.add(id);});
 if(chosen.size<=1){var focus=all.find(function(w){return w.id===selection;});all.filter(function(w){return w.collection===focus?.collection&&w.id!==selection;}).slice(0,10).forEach(function(w){chosen.add(w.id);});}
 return catalog(all).filter(function(w){return chosen.has(w.id);});
}
function nearPositions(all,selection){
 var pos=new Map(),width=1100,height=690,cx=550,cy=328;
 all.forEach(function(w,i){
  if(w.id===selection){pos.set(w.id,{x:cx,y:cy,group:0});return;}
  var n=all.length-(all.some(function(x){return x.id===selection;})?1:0),at=i-(all.findIndex(function(x){return x.id===selection;})<i?1:0);
  var ang=-Math.PI/2+2*Math.PI*at/Math.max(1,n);
  var radius=n>9?(at%2?235:175):220;
  pos.set(w.id,{x:cx+Math.cos(ang)*radius,y:cy+Math.sin(ang)*radius,group:at%5});
 });
 return {pos:pos,labels:[],width:width,height:height};
}
function buildGraphModel(all,rows,selection,scope,mode){
 var e=normalize(rows,all),nodes=scope==='near'?currentModeWorks(all,e,selection):catalog(all);
 return {nodes:nodes,links:e.filter(function(x){return nodes.some(function(n){return n.id===x.a;})&&nodes.some(function(n){return n.id===x.b;});})};
}
window.LyricStarfield={makePositions:makePositions,normalize:normalize,normalizePaths:normalizePaths,semanticPositions:semanticPositions,buildGraphModel:buildGraphModel,safe:safe};
if(typeof renderGraph!=='function'||typeof viewConstellation!=='function'||typeof render!=='function')return;
originalGraph=renderGraph;originalCard=selectedWorkCard;originalConstellation=viewConstellation;originalRender=render;originalLoader=loadMasterReadingCorpus;
/* Cache the large lexical comparison: selecting a star should never rerun every pairwise comparison. */
rawConnections=connections;
connections=function(){var all=works(),signature=sky+'|'+db.customWords.join('|')+'|'+all.map(function(w){return w.id+':'+hash(w.lyrics||'')+':'+(w.sourceVersionNo||0);}).join(';');if(signature!==connectionCache.signature){connectionCache={signature:signature,links:rawConnections()};}return connectionCache.links;};
function userWorks(){return works().filter(function(w){return w.sky==='rap'&&(cloudUser||w.sourceSystem!=='lyric_master');});}
function activePath(all){return normalizePaths(pathRows,all).find(function(p){return p.id===state.path;})||null;}
function allCollections(all){
 var map=new Map();catalog(all).forEach(function(w){var c=w.collection||'その他・個人作品';map.set(c,(map.get(c)||0)+1);});return map;
}
function selectStar(id){
 var w=getWork(id);if(!w||w.sky!=='rap')return;
 selected=id;state.expanded=false;
 if(state.history[state.history.length-1]!==id){state.history.push(id);if(state.history.length>24)state.history.shift();}
 repaint();centerSelected();
}
function repaint(){
 var box=document.querySelector('.constellation-scroll'),left=box?.scrollLeft||0,top=box?.scrollTop||0;
 render();box=document.querySelector('.constellation-scroll');
 if(box){box.scrollLeft=left;box.scrollTop=top;}
}
function centerSelected(){
 var box=document.querySelector('.semantic-star-viewport'),svg=box?.querySelector('.semantic-stars-svg'),core=box?.querySelector('.semantic-star.chosen .semantic-star-core');
 if(!box||!svg||!core)return;
 var vb=svg.viewBox.baseVal,px=svg.clientWidth/vb.width,py=svg.clientHeight/vb.height;
 var x=Number(core.getAttribute('cx'))*px,y=Number(core.getAttribute('cy'))*py;
 if(Number.isFinite(x)&&Number.isFinite(y))box.scrollTo({left:Math.max(0,x-box.clientWidth/2),top:Math.max(0,y-box.clientHeight/2),behavior:'instant'});
}
function graphSVG(){
 var all=userWorks(),picked=all.find(function(w){return w.id===selected;})||all[0];
 if(!all.length)return '<div class="starfield-empty">'+(!cloudUser?'木乃伊の星空は非公開です。本人アカウントでログインすると表示されます。':'登録された作品がありません。')+'</div>';
 var edges=edgeList(all),nodes=currentModeWorks(all,edges,picked?.id);
 var geo=state.scope==='all'?(state.layout==='gravity'&&status==='ready'?semanticPositions(all,normalize(records,all),normalizePaths(pathRows,all)):makePositions(all)):nearPositions(nodes,picked?.id);
 var path=activePath(all),inPath=new Set(path?path.ids:[]);
 var available=new Set(nodes.map(function(w){return w.id;}));
 var filtered=edges.filter(function(e){return available.has(e.a)&&available.has(e.b);});
 var hot=related(filtered,picked?.id),chosenNeighbors=new Set(hot.map(function(e){return e.a===picked.id?e.b:e.a;}));
 var search=state.search.trim().toLocaleLowerCase('ja');
 var wanted=new Set(nodes.filter(function(w){
  return (!state.collection||(w.collection||'その他・個人作品')===state.collection)&&(!search||w.title.toLocaleLowerCase('ja').includes(search));
 }).map(function(w){return w.id;}));
 var draw=state.scope==='near'?filtered:filtered.slice(0,state.mode==='words'?155:420);
 var lines=draw.map(function(e){
  var a=geo.pos.get(e.a),b=geo.pos.get(e.b);if(!a||!b)return '';
  var focus=e.a===picked?.id||e.b===picked?.id;
  var style=focus?'focused':state.scope==='near'?'near-link':'ambient';
  var contrast=e.kind==='counterpoint'?' contrast':e.kind==='text_overlap'?' version-link':'';
  var dim=state.collection&&!wanted.has(e.a)&&!wanted.has(e.b);
  return '<line class="semantic-link '+style+contrast+(dim?' dim-link':'')+'" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'"/>';
 }).join('');
 var route=path?path.ids.filter(function(id){return geo.pos.has(id);}).map(function(id){return geo.pos.get(id);}):[];
 var pathLines=route.slice(1).map(function(p,i){var a=route[i];return '<line class="semantic-theme-route" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+p.x.toFixed(1)+'" y2="'+p.y.toFixed(1)+'"/>';}).join('');
 var trail=state.history.slice(-7).filter(function(id){return geo.pos.has(id);}).map(function(id){return geo.pos.get(id);});
 var traces=trail.slice(1).map(function(p,i){var a=trail[i];return '<line class="semantic-trail" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+p.x.toFixed(1)+'" y2="'+p.y.toFixed(1)+'"/>';}).join('');
 var labels=geo.labels.map(function(g,i){
  return '<text class="semantic-cluster-label" x="'+g.x+'" y="'+g.y+'">'+safe(g.title.replace(/^\d+(st|nd|rd|th)\./,'').slice(0,22))+'</text><text class="semantic-cluster-count" x="'+g.x+'" y="'+(g.y+17)+'">'+g.count+' STARS</text>';
 }).join('');
 var stars=nodes.map(function(w){
  var p=geo.pos.get(w.id);if(!p)return '';
  var active=w.id===picked?.id,neighbor=chosenNeighbors.has(w.id),match=wanted.has(w.id);
  var onPath=inPath.has(w.id);
  var show=state.scope==='near'||active||onPath||neighbor&&chosenNeighbors.size<=12||search&&w.title.toLocaleLowerCase('ja').includes(search);
  var classes='semantic-star'+(active?' chosen':'')+(neighbor?' neighbor':'')+(onPath?' in-theme':'')+(path&&!onPath&&!active?' outside-theme':'')+(p.unlinked?' no-relation':'')+(!match?' dim-star':'');
  var sx=p.x>geo.width*.67?-1:1;
  var label=show?'<text class="semantic-star-name'+(active?' chosen':'')+(onPath?' in-theme':'')+'" data-star-focus="'+safe(w.id)+'" role="button" tabindex="0" aria-label="'+safe(w.title)+'を選ぶ" x="'+(p.x+sx*13).toFixed(1)+'" y="'+(p.y-10).toFixed(1)+'" text-anchor="'+(sx===1?'start':'end')+'">'+safe(w.title.slice(0,21))+'</text>':'';
  // Keep labels outside the focusable SVG group: long labels otherwise stretch its
  // hit bounding box into the empty sky, where the SVG background intercepts clicks.
  return '<g class="'+classes+'" data-star-focus="'+safe(w.id)+'" role="button" tabindex="0" aria-label="'+safe(w.title)+'を選ぶ"><title>'+safe(w.title)+'</title><circle class="semantic-star-hit" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="19"/><circle class="semantic-star-halo" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(active?20:neighbor?14:11)+'"/><circle class="semantic-star-core tone-'+(p.group%5)+'" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(active?7:neighbor?5:3.4)+'"/></g>'+label;
 }).join('');
 return '<svg class="semantic-stars-svg" data-scope="'+state.scope+'" viewBox="0 0 '+geo.width+' '+geo.height+'" role="group" aria-label="木乃伊の星空。作品の星を選び、精読に基づく関係をたどれます。" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="semanticNebula"><stop offset="0%" stop-color="#52366b" stop-opacity=".6"/><stop offset="100%" stop-color="#120f20" stop-opacity="0"/></radialGradient></defs><ellipse cx="490" cy="330" rx="520" ry="400" fill="url(#semanticNebula)"/>'+labels+lines+pathLines+traces+stars+'</svg>';
}
renderGraph=function(){if(sky!=='rap')return originalGraph();if(!cloudUser){records=[];pathRows=[];status='signed_out';state.path='';}return graphSVG();};
function controls(){
 var all=userWorks(),edges=normalize(records,all),n=edges.length,items=allCollections(all),paths=normalizePaths(pathRows,all);
 var linked=new Set();edges.forEach(function(e){linked.add(e.a);linked.add(e.b);});
 var orphanCount=all.filter(function(w){return !linked.has(w.id);}).length;
 var options=['<option value="">すべての作品集</option>'].concat([...items].map(function(e){return '<option value="'+safe(e[0])+'"'+(state.collection===e[0]?' selected':'')+'>'+safe(e[0])+'（'+e[1]+'）</option>'; })).join('');
 var pathOptions=['<option value="">星座を選ぶ（テーマを横断して読む）</option>'].concat(paths.map(function(p){return '<option value="'+safe(p.id)+'"'+(state.path===p.id?' selected':'')+'>'+safe(p.title)+'（'+p.ids.length+'作品）</option>';})).join('');
 var info=status==='loading'?'精読のつながりを読み込み中…':status==='error'?'精読データを取得できません：'+safe(problem):status==='ready'?'作品同士の直接比較 '+n+'組。まだ直接比較のない星 '+orphanCount+'作品。線は暫定的な読解です。':'ログインすると精読でつながります';
 return '<div class="semantic-toolbar"><div class="semantic-toolbar-main"><div><strong>全作品の星空</strong><small>'+all.length+'の星が浮かびます。星を選んで言葉のつながりをたどれます。</small></div><div class="semantic-switches"><button type="button" data-semantic-mode="meaning" class="'+(state.mode==='meaning'?'active':'')+'">精読の線</button><button type="button" data-semantic-mode="words" class="'+(state.mode==='words'?'active':'')+'">共通語の線</button></div></div>'+
 '<div class="semantic-layout-toolbar"><span>星の並び方</span><div class="semantic-switches"><button type="button" data-semantic-layout="album" class="'+(state.layout==='album'?'active':'')+'">作品集ごと</button><button type="button" data-semantic-layout="gravity" class="'+(state.layout==='gravity'?'active':'')+'"'+(status!=='ready'?' disabled':'')+'>意味の星空</button></div><small>'+(state.layout==='gravity'?'精読の直接比較と星座の順路をもとに配置。線のない作品は外周に残します。':'収録作品集の位置関係です。')+'</small></div>'+
 '<div class="semantic-path-control"><label for="semanticPath">星座を探す</label><select id="semanticPath" aria-label="精読テーマから星座を選ぶ"'+(!paths.length?' disabled':'')+'>'+pathOptions+'</select><span>点線＝複数作品をたどる読解の道筋。実線＝二作品の直接比較。</span></div>'+
 '<div class="semantic-controls"><div class="semantic-switches"><button type="button" data-semantic-scope="all" class="'+(state.scope==='all'?'active':'')+'">星空全体</button><button type="button" data-semantic-scope="near" class="'+(state.scope==='near'?'active':'')+'">この星の近く</button></div><label class="semantic-search-label" for="semanticStarSearch">作品を探す</label><input id="semanticStarSearch" autocomplete="off" placeholder="曲名を入力" value="'+safe(state.search)+'"><button type="button" data-semantic-action="search">探す</button><select id="semanticCollection" aria-label="作品集を強調">'+options+'</select><button type="button" data-semantic-action="next">次の星へ</button><button type="button" data-semantic-action="unlinked"'+(status==='ready'?'':' disabled')+'>未比較の星を探す</button><button type="button" data-semantic-action="reset">全体に戻す</button></div><p class="semantic-status" aria-live="polite">'+info+'</p></div>';
}
selectedWorkCard=function(){
 if(sky!=='rap')return originalCard();
 var available=userWorks(),w=available.find(function(x){return x.id===selected;})||available[0];if(!w)return '<div class="panel"><p class="desc">星を選ぶと、つながりの根拠が表示されます。非公開作品は本人ログイン後に読み込まれます。</p></div>';
 var links=related(edgeList(userWorks()),w.id).sort(function(a,b){return a.kind==='counterpoint'?-1:b.kind==='counterpoint'?1:0;});
 var max=state.expanded?links.length:7;
 var path=activePath(available),pos=path?path.ids.indexOf(w.id):-1;
 var step=path&&pos>=0?path.steps[pos]:null;
 var thematic=path?'<div class="semantic-path-story"><small>選んだ星座 / 精読の道筋</small><h3>'+safe(path.title)+'</h3><p>'+safe(path.question||'複数作品を通して読み進める仮説です。')+'</p>'+
 (step?'<div class="semantic-step-anchor"><small>'+safe(step.technique||'原文に根拠のある読解')+'</small>'+
 (step.quote?'<blockquote>'+safe(step.quote)+'</blockquote>':'')+
 (step.observation?'<p>'+safe(step.observation)+'</p>':'')+'</div>':'<p>この星は選択した星座の道筋には含まれていません。</p>')+
 '<div class="semantic-path-progress">'+(pos>=0?String(pos+1)+' / '+path.ids.length+'作品目':'星座の外')+'</div>'+
 '<div class="semantic-path-steps"><button type="button" data-semantic-action="prev">前の星へ</button><button type="button" data-semantic-action="next">次の星へ</button></div>'+
 (path.hypothesis?'<details class="semantic-theme-explanation"><summary>星座全体の読みと別の可能性</summary><p>'+safe(path.hypothesis)+'</p>'+
 (path.alternative?'<p>別の読み：'+safe(path.alternative)+'</p>':'')+
 (path.limit?'<p>読みの限界：'+safe(path.limit)+'</p>':'')+'</details>':'')+
 '<p class="semantic-caution">点線は読む順番です。隣接する二曲の直接比較が成立したことを示すものではありません。</p></div>':'';
 var list=links.slice(0,max).map(function(e){
  var other=getWork(e.a===w.id?e.b:e.a);if(!other)return '';
  var isLeft=e.a===w.id;
  var tag=e.kind==='counterpoint'?'対照':e.kind==='text_overlap'?'別版・再用':e.kind==='reframing'?'意味の変化':e.kind==='word'?'共通語':'共鳴・関係';
  var quote1=isLeft?e.left:e.right,quote2=isLeft?e.right:e.left;
  return '<article class="semantic-related"><div class="semantic-related-head"><button type="button" data-star-focus="'+safe(other.id)+'">✦ '+safe(other.title)+'</button><small>'+tag+'</small></div><div class="semantic-related-theme">'+safe(e.topic||'作品のつながり')+'</div><p>'+safe(e.observation||'')+'</p><details><summary>なぜつながる？ 原文の根拠</summary>'+(quote1?'<blockquote>この曲：'+safe(quote1)+'</blockquote>':'')+(quote2?'<blockquote>相手の曲：'+safe(quote2)+'</blockquote>':'')+'<p>'+safe(e.interpretation||'')+'</p><p class="semantic-caution">これは精読による仮説です。作者が確認した制作意図ではありません。</p></details></article>';
 }).join('');
 var history=state.history.slice(-6).map(function(id){var item=getWork(id);return item?'<button type="button" data-star-focus="'+safe(id)+'">'+safe(item.title)+'</button>':'';}).join('');
 return '<div class="panel semantic-focus-panel"><div class="eyebrow">SELECTED STAR / いま見ている作品</div><h2>'+safe(w.title)+'</h2><p class="desc">'+safe(w.collection||'収録先未登録')+'</p><div class="semantic-focus-total">'+links.length+' <span>本の線が、この星から伸びています</span></div>'+
 thematic+(history?'<div class="semantic-history"><small>たどった星</small><div>'+history+'</div></div>':'')+
 '<div class="semantic-panel-actions"><button class="btn primary" data-open="'+safe(w.id)+'">原文を読む</button><button class="btn" data-deep-work="'+safe(w.id)+'">精読を読む</button></div>'+
 '<h3>つながっている作品</h3>'+(list||'<p class="desc">この表示方法では、まだ線がありません。別の星または共通語の線をお試しください。</p>')+
 (links.length>7?'<button type="button" class="semantic-show-more" data-semantic-action="more">'+(state.expanded?'少なく表示する':'残り'+(links.length-7)+'組を見る')+'</button>':'')+'</div>';
};
viewConstellation=function(){
 var html=originalConstellation();
 if(sky!=='rap')return html;
 html=html.replace('<div class="constellation-scroll">',controls()+'<div class="constellation-scroll semantic-star-viewport">');
 html=html.replace(/代表40 \/ 全\d+ stars/g,userWorks().length+' stars');
 html=html.replace('<span>星図は代表40点。作品画面で全件を確認できます。</span>','<span>全作品を星として表示しています。</span>');
 html=html.replace('線＝主な共通語のつながり','線＝'+(state.mode==='meaning'?'精読による関係の仮説':'共通する文字列'));
 return html;
};
render=function(){
 if(!cloudUser){records=[];pathRows=[];state.path='';state.history=[];gravityCache={key:'',geo:null};status='signed_out';problem='';}
 originalRender();
 if(sky==='rap'&&view==='constellation'){
  var block=document.querySelector('.rap-discovery'),grid=document.querySelector('#screen .grid-2');
  if(block&&grid&&grid.parentNode)grid.parentNode.insertBefore(block,grid.nextSibling);
 }
};
async function loadLinks(user,epoch){
 if(!user?.id||!cloudClient)return;
 status='loading';records=[];problem='';render();
 try{
  var res=await cloudClient.from('lyric_cross_readings')
   .select('link_key,topic,relation_type,left_work_id,right_work_id,evidence_left,evidence_right,observation,interpretation,alternative')
   .eq('user_id',user.id).not('left_work_id','is',null).not('right_work_id','is',null).limit(900);
  if(res.error)throw res.error;
  if(epoch!==cloudEpoch||cloudUser?.id!==user.id)return;
  records=res.data||[];status='ready';problem='';render();
 }catch(err){
  if(epoch!==cloudEpoch||cloudUser?.id!==user.id)return;
  records=[];status='error';problem=err?.message||'取得失敗';console.warn('private starfield connection load',err);render();
 }
}
async function loadPaths(user,epoch){
 if(!user?.id||!cloudClient)return;
 pathRows=[];
 try{
  var res=await cloudClient.from('lyric_close_reading_paths')
   .select('thread_key,title,guiding_question,anchors').eq('user_id',user.id).limit(80);
  if(res.error)throw res.error;
  if(epoch!==cloudEpoch||cloudUser?.id!==user.id)return;
  pathRows=res.data||[];render();
 }catch(err){
  if(epoch!==cloudEpoch||cloudUser?.id!==user.id)return;
  pathRows=[];console.warn('private constellation path load',err);render();
 }
}
loadMasterReadingCorpus=async function(user,epoch){
 await originalLoader(user,epoch);
 if(epoch===cloudEpoch&&cloudUser?.id===user?.id)await Promise.all([loadLinks(user,epoch),loadPaths(user,epoch)]);
};
document.addEventListener('click',function(event){
 var target=event.target.closest('[data-star-focus],[data-semantic-mode],[data-semantic-layout],[data-semantic-scope],[data-semantic-action]');if(!target)return;
 if(target.hasAttribute('data-star-focus')){selectStar(target.dataset.starFocus);return;}
 if(target.hasAttribute('data-semantic-mode')){state.mode=target.dataset.semanticMode==='words'?'words':'meaning';state.expanded=false;repaint();return;}
 if(target.hasAttribute('data-semantic-layout')){
  state.layout=target.dataset.semanticLayout==='gravity'&&status==='ready'?'gravity':'album';
  state.scope='all';repaint();centerSelected();return;
 }
 if(target.hasAttribute('data-semantic-scope')){state.scope=target.dataset.semanticScope==='near'?'near':'all';repaint();centerSelected();return;}
 var action=target.dataset.semanticAction;
 if(action==='more'){state.expanded=!state.expanded;repaint();return;}
 if(action==='prev'){
  var path=activePath(userWorks());if(path){
   var i=path.ids.indexOf(selected);selectStar(path.ids[(i+path.ids.length-1)%path.ids.length]);
  }return;
 }
 if(action==='unlinked'){
  var all=userWorks(),linked=new Set();
  normalize(records,all).forEach(function(e){linked.add(e.a);linked.add(e.b);});
  var missing=catalog(all).filter(function(w){return !linked.has(w.id);});
  if(!missing.length)return;
  var i=missing.findIndex(function(w){return w.id===selected;});
  state.path='';selectStar(missing[(i+1)%missing.length].id);return;
 }
 if(action==='next'){
  var all=userWorks(),path=activePath(all);
  if(path){var currentIndex=path.ids.indexOf(selected),nextIndex=(currentIndex+1)%path.ids.length;selectStar(path.ids[nextIndex]);return;}
  var links=related(edgeList(all),selected),options=links.map(function(e){return e.a===selected?e.b:e.a;}).filter(function(id){return !!getWork(id);});
  if(!options.length)options=all.map(function(w){return w.id;}).filter(function(id){return id!==selected;});
  if(options.length)selectStar(options[Math.floor(Math.random()*options.length)]);return;
 }
 if(action==='reset'){state.collection='';state.search='';state.path='';state.scope='all';state.expanded=false;state.history=[];selected=userWorks()[0]?.id||null;repaint();return;}
 if(action==='search'){
  state.search=document.getElementById('semanticStarSearch')?.value.trim()||'';
  var found=userWorks().find(function(w){return w.title.toLocaleLowerCase('ja').includes(state.search.toLocaleLowerCase('ja'));});
  if(found&&state.search)selected=found.id;
  repaint();if(found&&state.search)centerSelected();return;
 }
});
document.addEventListener('change',function(event){
 if(event.target.id==='semanticCollection'){state.collection=event.target.value;repaint();}
 if(event.target.id==='semanticPath'){state.path=event.target.value;state.scope='all';state.collection='';state.search='';var p=activePath(userWorks());if(p){selectStar(p.ids[0]);}else repaint();}
});
document.addEventListener('keydown',function(event){
 if((event.key==='Enter'||event.key===' ')&&event.target.closest('.semantic-star[data-star-focus],.semantic-star-name[data-star-focus]')){event.preventDefault();selectStar(event.target.closest('[data-star-focus]').dataset.starFocus);}
 if(event.key==='Enter'&&event.target.id==='semanticStarSearch'&&!event.isComposing){event.preventDefault();document.querySelector('[data-semantic-action="search"]')?.click();}
});
render();
})();