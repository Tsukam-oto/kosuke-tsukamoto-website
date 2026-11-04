/*
 * v1.5 Evidence catalog
 * Editorial status applies ONLY to the claims listed here, never to the entire article.
 * Original diagrams are schematic, not measured or facsimile data.
 * No personal data or keys in this file.
 */
window.KNOWLEDGE_EVIDENCE = {
  'notation': {
    reviewedAt:'2026-11-04',visual:'notation',
    overview:'中世の記譜法を「一人の発明」で説明せず、譜線のない記号から音高を示す記譜への変化を資料と照合しました。',
    figures:[{title:'中世写本の実物を見る',url:'https://tales.nmc.unibas.ch/en/from-ink-to-sound-32/from-sound-to-ink-early-forms-of-musical-notation-188/lines-and-staff-949',credit:'バーゼル大学の解説・写本図版。画像の権利表示は資料元をご確認ください。'}],
    sources:[
      {id:'basel',kind:'大学の資料解説',title:'Lines and staff — University of Basel',url:'https://tales.nmc.unibas.ch/en/from-ink-to-sound-32/from-sound-to-ink-early-forms-of-musical-notation-188/lines-and-staff-949',note:'無譜線ネウマと譜線付き記譜の違い、音高の表示を説明。'},
      {id:'haines',kind:'査読研究論文',title:'Haines (2009), The Origins of the Musical Staff',url:'https://doi.org/10.1093/musqtl/gdp002',note:'五線・譜線の起源を一人の発明者に還元する説明を批判的に検討。'},
      {id:'met',kind:'博物館の解説',title:'The Guidonian Hand — The Met',url:'https://www.metmuseum.org/pt/perspectives/musical-bodies-guidonian-hand',note:'グイードの音楽教育法が後世へ広まった文化史を紹介。'}
    ],
    claims:[
      {kind:'source',title:'無譜線ネウマは音高の正確な位置を必ずしも示さない',detail:'旋律を知る歌い手の記憶を補う役割があり、譜線のない記号だけでは具体的な音程を復元しにくい場合があります。',sources:['basel'],section:0},
      {kind:'source',title:'譜線付きの記譜は音の高さの読み取りを改善した',detail:'中世に譜線や基準となる音の指定が発達し、譜面から音高関係を読みやすくなりました。',sources:['basel'],section:0},
      {kind:'debate',title:'「グイードが譜線を単独で発明した」は単純化です',detail:'グイードの重要性は大きい一方、譜線の前史や同時代の実践を検討する研究があります。',sources:['haines','met'],section:1}
    ]
  },
  'astronomy':{
    reviewedAt:'2026-11-04',visual:'transit',
    overview:'恒星の明るさが一時的に下がる観測と、そこから惑星の存在・大きさを推定する作業を区別します。',
    figures:[{title:'NASAのトランジット模式図を見る',url:'https://science.nasa.gov/exoplanets/whats-a-transit/',credit:'NASA Science。光度曲線の説明と図版。'}],
    sources:[
      {id:'nasa',kind:'宇宙機関の解説',title:'NASA — What’s a transit?',url:'https://science.nasa.gov/exoplanets/whats-a-transit/',note:'恒星前を惑星が通過したときの減光と光度曲線。'},
      {id:'exowatch',kind:'観測・解析の教材',title:'NASA Exoplanet Watch — Background',url:'https://science.nasa.gov/citizen-science/exoplanet-watch/background/',note:'減光の深さと惑星の相対的な大きさの関係。'},
      {id:'analysis',kind:'研究機関の手順解説',title:'NASA Exoplanet Watch — How to analyze data',url:'https://science.nasa.gov/citizen-science/exoplanet-watch/how-to-contribute/how-to-analyze-your-data/',note:'実際の観測画像から光度曲線を作る流れ。'}
    ],
    claims:[
      {kind:'source',title:'惑星が恒星の前を横切ると、光の量が一時的に減る',detail:'この現象がトランジットです。実際に直接惑星像を撮影する必要はありません。',sources:['nasa'],section:0},
      {kind:'source',title:'減光の深さから惑星の大きさの比を推定できる',detail:'単純化したモデルでは減光率は惑星と恒星の半径比の二乗です。星の明るさのむらや観測ノイズ等は別途扱います。',sources:['exowatch','analysis'],section:0},
      {kind:'interpretation',title:'「明るさが下がった＝必ず惑星がある」ではない',detail:'減光の候補には追加観測と別要因の検討が必要です。単発の変化だけで惑星を確定しません。',sources:['analysis'],section:1}
    ]
  },
  'memory':{
    reviewedAt:'2026-11-04',visual:'memory',
    overview:'記憶の再固定化は重要な研究テーマですが、想起するだけで必ず記憶が変わるという主張は支持されません。',
    figures:[{title:'研究レビューの概要を読む',url:'https://pubmed.ncbi.nlm.nih.gov/29792441/',credit:'PubMed（学術論文の書誌情報と抄録）'}],
    sources:[
      {id:'elsey',kind:'査読レビュー論文',title:'Elsey, Van Ast & Kindt (2018) — Human memory reconsolidation',url:'https://pubmed.ncbi.nlm.nih.gov/29792441/',note:'人間の再固定化研究を批判的に検討。代替説明や一貫しない結果を指摘。'},
      {id:'kida',kind:'査読レビュー論文',title:'Kida (2020) — Function and mechanisms of memory destabilization',url:'https://pubmed.ncbi.nlm.nih.gov/32161213/',note:'想起後の不安定化には条件があることを整理。'},
      {id:'review',kind:'査読レビュー論文',title:'The evidence for and against reactivation-induced memory updating',url:'https://pubmed.ncbi.nlm.nih.gov/35247380/',note:'再現性の課題と、研究条件による差を総説。'}
    ],
    claims:[
      {kind:'source',title:'思い出した記憶が不安定化し、再び安定化する現象が研究されている',detail:'想起後の再固定化は、動物と人を対象とする研究で議論されている現象です。',sources:['elsey','kida'],section:0},
      {kind:'debate',title:'すべての想起で再固定化が起こるとは限らない',detail:'記憶の強さ、古さ、想起条件などが影響し、再現性の課題もあります。',sources:['kida','review'],section:1},
      {kind:'debate',title:'臨床応用がどの治療でも有効だと確立したわけではない',detail:'人間の研究では他の機序でも説明可能な例があり、臨床応用の一般化には慎重さが必要です。',sources:['elsey'],section:2}
    ]
  }
};