/* 根拠を紐づけた編集済み特集。自動収集された候補はここへ無審査で流入しません。 */
window.KNOWLEDGE_SPECIALS = {
  "version": 1,
  "editorial": "出典を個々の主張へ結びつけた編集記事です。資料の存在だけを根拠にせず、定量情報の計算式や原典の対応箇所も示します。",
  "verifiedAsOf": "2026-11-04",
  "stories": [
    {
      "id": "piano",
      "theme": "音楽理論 × 数学",
      "duration": "約4分＋試聴",
      "type": "experiment",
      "kicker": "なぜ、ピアノの音程は少しだけずれているのか。",
      "title": "完璧な5度を、わざと少し狭くする理由。",
      "opening": "「音が合っている」はずのピアノ。でも、純粋な音程を12回積み上げると、最初の音には戻れません。",
      "lead": "オクターヴは周波数が2倍、純粋な完全5度は3/2倍。ところが「5度を12回」と「オクターヴを7回」では到着する周波数が一致しません。鍵盤楽器の調律には、数学的な折り合いが必要なのです。",
      "claims": [
        {
          "text": "純粋な完全5度は周波数比3:2、12平均律の完全5度は2^(7/12)です。",
          "ids": [
            "sfu",
            "libre"
          ]
        },
        {
          "text": "純粋な5度を12回重ねた値(3/2)^12は、7オクターヴの2^7より約1.36%大きくなります。",
          "ids": [
            "math",
            "theory"
          ]
        },
        {
          "text": "12平均律ではオクターヴを12等分するため、5度をわずかに狭めます。すべての音程が純正になるわけではありません。",
          "ids": [
            "sfu",
            "theory"
          ]
        }
      ],
      "insight": "つまり「平均律＝音を適当にずらした」のではなく、複数の調で演奏できる鍵盤という条件のもとで、音程の誤差を配分した仕組みです。",
      "limitation": "この試聴はサイン波を合成した教育用デモです。実際のピアノの調律では弦の非調和性なども関わり、純正律と平均律の違いを一度聴いただけで識別できるとは限りません。",
      "next": "音律を変えたら、同じメロディーの表情も変わるのでしょうか。",
      "follow": "./music-library.html#theory/intervals",
      "sources": [
        {
          "id": "sfu",
          "kind": "大学の音響資料",
          "title": "Simon Fraser University — Equal Temperament",
          "url": "https://www.sfu.ca/sonic-studio-webdav/cmns/Handbook5/handbook/Equal_Temperament.html",
          "detail": "12平均律の定義、5度と長3度の偏差"
        },
        {
          "id": "libre",
          "kind": "教育用解説",
          "title": "Physics LibreTexts — Musical Intervals and Temperament",
          "url": "https://phys.libretexts.org/Courses/Joliet_Junior_College/Physics_110_-_by_Conceptual_Objective/15%3A_Conceptual_Objective_15/15.02%3A_Musical_intervals_and_temperament",
          "detail": "音程の比と半音数の対応"
        },
        {
          "id": "math",
          "kind": "大学の数学教材",
          "title": "Drexel University — Mathematics & Music / Tuning",
          "url": "https://www.math.drexel.edu/~dp399/textbooks/mathmusic/musictheory.html",
          "detail": "3:2と2^(7/12)の差"
        },
        {
          "id": "theory",
          "kind": "査読誌の論考",
          "title": "Music Theory Online — Algorithms for Tunings and Temperaments",
          "url": "https://www.mtosmt.org/classic/mto.98.4.4/mto.98.4.4.scholtz.html",
          "detail": "五度圏とピタゴラスコンマ"
        }
      ]
    },
    {
      "id": "chaos",
      "theme": "ギリシャ神話 × 原典読解",
      "duration": "約3分＋原典",
      "type": "genealogy",
      "kicker": "世界の始まりは、親子関係ではなかった。",
      "title": "カオスは、ガイアのお母さんだった？",
      "opening": "神々の家系図を見ていると「カオス→ガイア」と矢印を描きたくなります。でも、その矢印には落とし穴があります。",
      "lead": "ヘシオドス『神統記』116行以降では、まずカオスが現れ、その次にガイア、タルタロス、エロスが挙げられます。しかし「次に登場する」ことと「そこから生まれた」ことは同じではありません。",
      "claims": [
        {
          "text": "『神統記』の原初の存在の列挙では、カオスの後にガイアらが続きます。",
          "ids": [
            "theogony"
          ]
        },
        {
          "text": "原典はカオスからエレボスとニュクスが生まれたと述べ、ガイアがウラノスを生んだとも述べます。",
          "ids": [
            "theogony"
          ]
        },
        {
          "text": "この系譜図はヘシオドスの一つの伝承を整理したもので、ギリシャ神話全体に共通する唯一の正典ではありません。",
          "ids": [
            "theogony",
            "theoi"
          ]
        }
      ],
      "insight": "「登場順」と「親子関係」を描き分けるだけで、神話は暗記ではなく、原典に何が書かれ何が書かれていないかを読む学問になります。",
      "limitation": "ここで扱うのはヘシオドスの作品にある一つの系統です。後世の神話集・地域の別伝承と一致しないことがあります。",
      "next": "ガイアが生んだウラノスは、どうして息子クロノスと争ったのでしょうか。",
      "follow": "./myth-series.html#chapter/uranus",
      "sources": [
        {
          "id": "theogony",
          "kind": "古典の原典翻訳",
          "title": "Hesiod, Theogony — translated by H. G. Evelyn-White",
          "url": "https://www.theoi.com/Text/HesiodTheogony.html",
          "detail": "原初の存在：116–134行付近"
        },
        {
          "id": "theoi",
          "kind": "原典抜粋と人物整理",
          "title": "Theoi — Gaea and the Birth of the Cosmos",
          "url": "https://www.theoi.com/Protogenos/Gaia.html",
          "detail": "ガイアの系譜と別伝承への入口"
        }
      ]
    },
    {
      "id": "alliance",
      "theme": "臨床心理学 × 研究方法",
      "duration": "約4分＋研究解説",
      "type": "study",
      "kicker": "「話を聞いてくれる人」の力は、科学で測れるのか。",
      "title": "心理療法は、技法だけで決まるのでしょうか。",
      "opening": "心理療法の効果を考えるとき、方法の名前ばかりに注目しがちです。でも、研究には「一緒に取り組める関係」という別の観点があります。",
      "lead": "治療同盟（therapeutic alliance）は、治療者と相談者が目標・課題を共有し、協働する関係を指す概念です。2018年の大規模メタ分析では、その評価と治療成績の間に正の関連が示されました。",
      "claims": [
        {
          "text": "2018年のメタ分析は295の独立した研究、3万人以上を対象に、対面心理療法でr=.278の正の関連を報告しました。",
          "ids": [
            "meta",
            "review"
          ]
        },
        {
          "text": "その相関は『信頼関係が治療成果の27.8%を生んだ』という意味ではありません。関連と因果は区別する必要があります。",
          "ids": [
            "meta",
            "review"
          ]
        },
        {
          "text": "患者側の特徴などを調整した研究をまとめた2020年のメタ分析でも、治療同盟と成績の正の関連が報告されています。",
          "ids": [
            "adjusted"
          ]
        }
      ],
      "insight": "重要なのは、技法と関係を二者択一にしないことです。「何をするか」と「誰とどう進めるか」は、ともに検討すべき要素です。",
      "limitation": "ここで示した相関は集団の研究結果です。個々の人の相談や治療の効果を予測するものではなく、治療の助言・診断でもありません。",
      "next": "心理学で『効果がある』と言うとき、相関・因果・個人差をどう区別すればよいのでしょうか。",
      "follow": "./research.html",
      "sources": [
        {
          "id": "meta",
          "kind": "査読付きメタ分析",
          "title": "Flückiger et al. (2018) — The alliance in adult psychotherapy",
          "url": "https://pubmed.ncbi.nlm.nih.gov/29792475/",
          "detail": "295研究・3万人以上・r=.278"
        },
        {
          "id": "review",
          "kind": "学術レビュー",
          "title": "Wampold (2023) — The alliance in mental health care",
          "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9840508/",
          "detail": "メタ分析の統合と因果解釈への注意"
        },
        {
          "id": "adjusted",
          "kind": "査読付きメタ分析",
          "title": "2020 review — Alliance–outcome association adjusted",
          "url": "https://pubmed.ncbi.nlm.nih.gov/32212755/",
          "detail": "患者の要因などを考慮した分析"
        }
      ]
    }
  ]
};
