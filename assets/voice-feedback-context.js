/* VOICE BOX contextual feedback — only allowlisted public music and poems. */
(() => {
  "use strict";
  const works = {"anata-to":{"title":"あなたと","path":"/works/ongaku-no-fuukei/anata-to/","versions":["demo"]},"deai":{"title":"出会い","path":"/works/ongaku-no-fuukei/deai/","versions":["demo","live"]},"haru-ni-afurete":{"title":"春にあふれて","path":"/works/ongaku-no-fuukei/haru-ni-afurete/","versions":["demo"]},"natsu-wo-suikonde":{"title":"夏を吸い込んで","path":"/works/ongaku-no-fuukei/natsu-wo-suikonde/","versions":["demo"]},"tadanaka":{"title":"ただなか","path":"/works/ongaku-no-fuukei/tadanaka/","versions":["demo"]},"harewataru-sora":{"title":"晴れ渡る空","path":"/works/ongaku-no-fuukei/harewataru-sora/","versions":["demo"]},"korekara":{"title":"これから","path":"/works/ongaku-no-fuukei/korekara/","versions":["demo"]},"asa-ni-nattara":{"title":"朝になったら","path":"/works/ongaku-no-fuukei/asa-ni-nattara/","versions":["demo"]},"negai":{"title":"願い","path":"/works/ongaku-no-fuukei/negai/","versions":["demo"]},"futashika":{"title":"ふたしか","path":"/works/futashika/","versions":["demo"]},"umi-ni-made-anata-wa-hon-wo-tsurete-kite":{"title":"海にまで あなたは本を連れてきて","path":"/works/umi-ni-made-anata-wa-hon-wo-tsurete-kite/","versions":["preview"]},"kono-fuukei-ni-yosete":{"title":"この風景に寄せて","path":"/works/kono-fuukei-ni-yosete/","versions":["demo"]},"moshi-kotoba-ga":{"title":"もし言葉が","path":"/works/moshi-kotoba-ga/","versions":["demo"]},"hibi":{"title":"日日","path":"/works/hibi/","versions":["demo"]},"hana-to-konetsu":{"title":"花と高熱","path":"/works/hana-to-konetsu/","versions":["demo"]},"undokai-fanfare":{"title":"運動会のためのファンファーレ","path":"/works/undokai-fanfare/","versions":["demo"]},"undokai-fanfare-4-asa":{"title":"運動会のためのファンファーレ 第4番「朝」","path":"/works/undokai-fanfare-4-asa/","versions":["demo"]},"clarinet-piano-ongi":{"title":"音戯","path":"/works/clarinet-piano-ongi/","versions":["demo"]},"aoiro-no-shi":{"title":"青色の詩","path":"/works/aoiro-no-shi/","versions":["demo"]},"clarinet-piano-fukei":{"title":"風景","path":"/works/clarinet-piano-fukei/","versions":["demo"]},"fanfare-sora":{"title":"ファンファーレ 空","path":"/works/fanfare-sora/","versions":["demo"]}};
  const poems = {"all-around-you":"All around you","haru-ni-afurete":"春にあふれて","muda-2026-03-18":"無題（2026年3月18日）","natsu-wo-suikonde":"夏を吸い込んで","korekara":"これから","tadanaka":"ただなか","harewataru-sora":"晴れ渡る空","anata-to":"あなたと","asa-ni-nattara":"朝になったら","deai":"出会い","negai":"願い"};
  const versions = {demo: "制作デモ", live: "正式ライブ演奏", preview: "試聴音源"};
  const params = new URLSearchParams(window.location.search);
  const key = params.get("work") || "";
  const poem = params.get("poem") || "";
  if (Boolean(key) === Boolean(poem)) return; // none or ambiguous: use free-form VOICE BOX
  const section = document.getElementById("voice-work-context");
  const form = document.querySelector("form.voice-form");
  const theme = document.getElementById("voice-theme");
  const title = document.getElementById("voice-context-title");
  const detail = document.getElementById("voice-context-detail");
  const back = document.getElementById("voice-context-back");
  if (!section || !form || !theme || !title || !detail || !back) return;
  const fields = {};
  if (poem) {
    if (!Object.prototype.hasOwnProperty.call(poems, poem)) return;
    title.textContent = `《${poems[poem]}》への言葉`;
    detail.textContent = "この詩・歌詞を読んで感じたことを、ひとことから届けられます。";
    back.href = "/lyrics/#" + poem;
    fields.context_kind = "poem";
    fields.context_poem_id = poem;
    fields.context_poem_title = poems[poem];
    fields.context_source = "lyrics";
  } else {
    if (!Object.prototype.hasOwnProperty.call(works, key)) return;
    const entry = works[key];
    const requested = params.get("recording") || "";
    const version = entry.versions.includes(requested) ? requested : entry.versions[0];
    title.textContent = `《${entry.title}》への言葉`;
    detail.textContent = `${versions[version]}についてのご感想を届けられます。短い言葉でも構いません。`;
    const source = params.get("source") || "";
    const returns = {home: "/", "special-thanks": "/special-thanks/", eastgate: "/special-thanks/eastgate/"};
    back.href = (version === "live" && Object.prototype.hasOwnProperty.call(returns, source))
      ? returns[source] : entry.path;
    fields.context_kind = "audio";
    fields.context_work_id = key;
    fields.context_work_title = entry.title;
    fields.context_recording = version;
    fields.context_source = ["home", "special-thanks", "eastgate", "work"].includes(source) ? source : "unspecified";
  }
  back.textContent = "もとのページへ戻る";
  theme.value = "作品の感想";
  // Never prefill the message, name, or publication consent.
  for (const [field, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = field;
    input.value = value;
    form.appendChild(input);
  }
  section.hidden = false;
})();
