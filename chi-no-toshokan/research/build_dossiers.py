#!/usr/bin/env python3
"""Deterministic, non-generative research preparation sheets (NOT finished articles).

No invented claims. Every source is a URL that appears in the collected ledger.
Does not fetch copyrighted text, does not call an LLM, does not approve articles.
"""
from __future__ import annotations
from collections import defaultdict
import datetime as dt
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SEEDS = ROOT / "research" / "seeds.json"
CANDIDATES = ROOT / "research-candidates.json"
DOSSIERS = ROOT / "research-dossiers.json"

# A matching search phrase is not a bibliographic relevance guarantee.
NOISE = frozenset("""
a about and are as at be can do does for from has how in into is its of on
or our the their them these this to use using via was were what when where why
with world article approach review reviews literature study studies research
history historical effects effect perspective perspectives comparison
analysis theory music psychology greek ancient modern evidence methods
""".split())

DOMAIN_CHECKS = {
    "音楽": [
        "作品の正式名称・作曲者・版・成立年代を一次資料や信頼できる作品目録で確認する",
        "音楽理論の用語が譜例・実際の演奏に当てはまるか検証する",
        "楽譜・音源・図版の権利状態と、作品と録音の違いを確認する",
        "一つの演奏解釈を唯一の正解として紹介していないか点検する",
    ],
    "心理・臨床": [
        "原論文の研究設計、対象者、比較群、サンプル数を確認する",
        "レビューの種類・バイアス評価・対象研究の重複を確認する",
        "相関と因果、臨床的効果と理論的主張を区別する",
        "反証・再現性・文化圏による違い・適用限界を確認する",
    ],
    "神話・歴史": [
        "原典のどの章・行・翻訳に当たるかを確認する",
        "異なる時代や地域の伝承・異伝を区別する",
        "神話中の出来事と考古学的・文献史的事実を混同していないか確認する",
        "図版の制作年代と物語の舞台年代が異なることを確認する",
    ],
    "科学・社会": [
        "一次研究と解説記事を分け、測定・観測の方法を確認する",
        "結果の不確実性・検証範囲・反対の報告を確認する",
        "研究成果が一般化できる対象・時代・地域を確認する",
        "数値・図表・画像の出典と利用条件を確認する",
    ],
}
GENERAL = [
    "資料の本文または原典該当箇所に到達して確認する",
    "個別の主張ごとに、裏づける出典と留保条件を対応づける",
]
VALID_TYPES = {
    "research-metadata", "music-work-metadata", "museum-object",
    "curated-reference-path",
}


def normalize(text):
    return set(t for t in re.findall(r"[a-zA-Z]{4,}", str(text).lower())
               if t not in NOISE)


def token_overlap(query, title):
    """A discoverability hint, not evidence confidence."""
    terms, words = normalize(query), normalize(title)
    if not terms:
        return 0
    return len(terms & words)


def publication_hint(item):
    """Only provider-supplied metadata categories; no inference of methodology."""
    types = [str(x).lower() for x in item.get("publicationTypes", [])]
    if "meta-analysis" in types:
        return "文献索引の種別：メタ分析"
    if "systematic review" in types:
        return "文献索引の種別：システマティックレビュー"
    if "randomized controlled trial" in types:
        return "文献索引の種別：ランダム化比較試験"
    if "review" in types:
        return "文献索引の種別：レビュー"
    if item.get("kind") == "research-metadata":
        return "研究書誌（研究デザイン未確認）"
    if item.get("kind") == "music-work-metadata":
        return "音楽作品目録（録音の一致は未確認）"
    if item.get("kind") == "museum-object":
        return "美術館の収蔵品情報（画像の権利は別に確認）"
    return "原典への登録済み入口（本文未照合）"


def choose_for_topic(topic, items, limit=6):
    pool = []
    for item in items:
        if topic["id"] not in item.get("topicIds", []):
            continue
        if item.get("kind") not in VALID_TYPES:
            continue
        if not item.get("title") or not str(item.get("url", "")).startswith("https://"):
            continue
        overlap = token_overlap(topic.get("query", ""), item.get("title", ""))
        # Relevant looking titles are prioritised, not certified.
        # Original sources and museum objects remain discoverable even without word overlap.
        pool.append((item, overlap))
    # Include at most six records per topic. Queries without title overlap are tagged.
    pool.sort(key=lambda x: (
        x[1],
        x[0].get("kind") == "curated-reference-path",
        len(x[0].get("providers", [])),
        x[0].get("year") or 0,
    ), reverse=True)
    return [{
        "id": p["id"],
        "title": p["title"],
        "url": p["url"],
        "kind": p["kind"],
        "providers": p.get("providers", []),
        "authors": p.get("authors", [])[:3],
        "year": p.get("year"),
        "publication": p.get("publication", ""),
        "publicationTypeHint": publication_hint(p),
        "titleMatchesSearch": overlap > 0,
        "titleMatchCount": overlap,
        "reviewStatus": "本文未照合",
        "sourceType": "原典の参照先" if p["kind"] == "curated-reference-path" else
                      "研究・作品・収蔵品のメタデータ",
        "imageUrl": p.get("imageUrl", "") if p.get("imageRights") == "Met Open Access / CC0" else "",
        "imageRights": p.get("imageRights", ""),
        "note": p.get("note", ""),
    } for p, overlap in pool[:limit]]


def build(seed, candidate_doc):
    if seed.get("schema") != 1 or candidate_doc.get("schemaVersion") != 1:
        raise ValueError("unsupported input schema")
    source_items = candidate_doc.get("items")
    if not isinstance(source_items, list):
        raise ValueError("missing source records")
    records = []
    areas = defaultdict(int)
    for topic in seed.get("topics", []):
        chosen = choose_for_topic(topic, source_items)
        areas[topic["area"]] += 1
        kinds = {s["kind"] for s in chosen}
        notes = []
        if len(chosen) < 2:
            notes.append("独立した資料候補が不足しています。追加の探索が必要です。")
        if chosen and not any(s["titleMatchesSearch"] for s in chosen):
            notes.append("検索語と題名が直接重ならないため、関連性の確認が必要です。")
        if any(s["kind"] == "research-metadata" for s in chosen):
            notes.append("書誌情報だけでは研究結果を判断できません。本文・方法・結果の確認が必要です。")
        if "music-work-metadata" in kinds:
            notes.append("作品目録と、特定の演奏・録音の照合は別に必要です。")
        checks = GENERAL + DOMAIN_CHECKS.get(topic.get("area"), [])
        records.append({
            "id": topic["id"],
            "question": topic.get("label") or topic.get("query"),
            "area": topic["area"],
            "searchQuery": topic["query"],
            "relatedPage": topic.get("link", "") or "",
            "editorialStage": "記事化準備・自動整理",
            "readyToPublish": False,
            "verifiedClaims": 0,
            "sourceCount": len(chosen),
            "sources": chosen,
            "warnings": notes,
            "reviewChecks": checks,
            "storyboard": [
                {"section": "入口の問い", "status": "題材のみ（本文未作成）"},
                {"section": "原典・研究で確認できたこと", "status": "本文照合が必要"},
                {"section": "争点・異説・不確かさ", "status": "反証・限界の検討が必要"},
                {"section": "図・楽譜・年代・音源", "status": "資料と利用権限の確認が必要"},
                {"section": "次に考えたい問い", "status": "編集時に作成"},
            ],
        })
    return {
        "schemaVersion": 1,
        "generatedFrom": candidate_doc.get("lastRunAt"),
        "scope": "事実検証前の編集用調査票／自動公開記事ではありません",
        "policy": ("検索・書誌データから作る調査計画です。論文や原典の本文は"
                   "自動照合していないため、記事の結論を含まず、資料の信頼度を採点しません。"),
        "counts": {
            "topics": len(records),
            "topicsWithSources": sum(bool(x["sourceCount"]) for x in records),
            "sourcesLinked": sum(x["sourceCount"] for x in records),
            "verifiedClaims": 0,
            "readyToPublish": 0,
            "areas": dict(areas),
        },
        "dossiers": records,
    }


def main():
    seed = json.loads(SEEDS.read_text(encoding="utf-8"))
    candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))
    prepared = build(seed, candidates)
    DOSSIERS.write_text(json.dumps(prepared, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")
    print("Research dossiers:", prepared["counts"])


if __name__ == "__main__":
    main()
