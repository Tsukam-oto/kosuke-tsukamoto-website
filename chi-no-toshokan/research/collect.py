#!/usr/bin/env python3
"""Public metadata discovery for 知の図書館.

Only bibliographic/catalogue metadata is collected. NO page text is scraped.
A database hit, DOI, citation count, or image licence does not verify a claim.
Standard library only; safe to run with GitHub Actions or locally.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = Path(__file__).resolve().parents[1]
SEEDS = BASE / "research" / "seeds.json"
OUTPUT = BASE / "research-candidates.json"
ALLOWED = {
    "api.crossref.org", "api.openalex.org",
    "musicbrainz.org", "collectionapi.metmuseum.org",
    "www.ebi.ac.uk",
}
AGENT = "ChiNoToshokanEvidenceDiscovery/1.0 (https://kosuke-tsukamoto-website.pages.dev/chi-no-toshokan/)"
RESEARCH_NOTE = (
    "これは検索APIから得た候補資料と書誌情報です。本文・研究結果・"
    "原典の該当箇所は未照合です。記事の根拠として承認していません。"
)


def now_utc():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def fetch_json(url: str, attempts: int = 2) -> dict:
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED:
        raise ValueError("unapproved provider host")
    headers = {"Accept": "application/json", "User-Agent": AGENT}
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=17) as response:
                if response.status != 200:
                    raise RuntimeError("unexpected HTTP status")
                raw = response.read(1_600_001)
                if len(raw) > 1_600_000:
                    raise ValueError("provider response too large")
                value = json.loads(raw)
                if not isinstance(value, dict):
                    raise ValueError("expected JSON object")
                return value
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt + 1 == attempts:
                raise
            try:
                wait = float(exc.headers.get("Retry-After", "2"))
            except (ValueError, TypeError):
                wait = 2.0
            time.sleep(max(1.0, min(wait, 5.0)))
        except (urllib.error.URLError, TimeoutError):
            if attempt + 1 == attempts:
                raise
            time.sleep(2)
    raise RuntimeError("request failed")


def clean_text(value, cap=230):
    if isinstance(value, list):
        value = value[0] if value else ""
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", " ", value).strip()[:cap]


def get_year(parts):
    try:
        year = int(parts[0][0])
        return year if 1300 <= year <= dt.datetime.now().year + 1 else None
    except (TypeError, ValueError, IndexError):
        return None


def doi_key(doi):
    if not isinstance(doi, str):
        return ""
    value = doi.strip().lower().removeprefix("https://doi.org/")
    return value if re.fullmatch(r"10\.\d{4,9}/[^\s<>{}]+", value) else ""


def common(kind, key, title, url, topic, provider, **extra):
    return {
        "id": key,
        "kind": kind,
        "title": clean_text(title, 260),
        "url": url,
        "area": topic.get("area", "その他"),
        "topicIds": [topic.get("id", "")],
        "providers": [provider],
        "reviewStatus": "未照合",
        "evidenceStatus": "書誌・作品情報のみ",
        **extra,
    }


def crossref_items(topic, metadata):
    result = []
    for item in metadata.get("message", {}).get("items", [])[:3]:
        doi = doi_key(item.get("DOI"))
        title = clean_text(item.get("title"))
        if not doi or not title:
            continue
        year = get_year((item.get("published") or {}).get("date-parts", []))
        authors = [
            clean_text((a.get("given", "") + " " + a.get("family", "")).strip(), 70)
            for a in item.get("author", [])[:3] if isinstance(a, dict)
        ]
        result.append(common(
            "research-metadata", "doi:" + doi, title,
            "https://doi.org/" + urllib.parse.quote(doi, safe="/-._;():"),
            topic, "Crossref", year=year, authors=authors,
            publication=clean_text(item.get("container-title")),
            recordType=clean_text(item.get("type")),
            doi=doi,
        ))
    return result


def openalex_items(topic, metadata):
    result = []
    for item in metadata.get("results", [])[:2]:
        doi = doi_key(item.get("doi"))
        oid = str(item.get("id", ""))
        if doi:
            key = "doi:" + doi
            url = "https://doi.org/" + urllib.parse.quote(doi, safe="/-._;():")
        elif re.fullmatch(r"https://openalex.org/W\d+", oid):
            key, url = "openalex:" + oid.rsplit("/", 1)[1], oid
        else:
            continue
        title = clean_text(item.get("display_name") or item.get("title"))
        if not title:
            continue
        authors = [
            clean_text(x.get("author", {}).get("display_name"), 70)
            for x in item.get("authorships", [])[:3] if isinstance(x, dict)
        ]
        loc = item.get("primary_location") or {}
        source = loc.get("source") or {}
        result.append(common(
            "research-metadata", key, title, url, topic, "OpenAlex",
            year=item.get("publication_year"),
            authors=authors,
            publication=clean_text(source.get("display_name")),
            recordType=clean_text(item.get("type")),
            doi=doi,
        ))
    return result


def europe_pmc_items(topic, metadata):
    """PubMed/Europe PMC indexed research metadata; no abstract or copyrighted text."""
    result = []
    for item in (metadata.get("resultList") or {}).get("result", [])[:3]:
        doi = doi_key(item.get("doi"))
        pmid = str(item.get("pmid") or "")
        if doi:
            key = "doi:" + doi
            url = "https://doi.org/" + urllib.parse.quote(doi, safe="/-._;():")
        elif re.fullmatch(r"\d{4,12}", pmid):
            key, url = "pmid:" + pmid, "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/"
        else:
            continue
        title = clean_text(item.get("title"))
        if not title:
            continue
        types = ((item.get("pubTypeList") or {}).get("pubType") or [])[:8]
        publication_types = [clean_text(t, 90) for t in types if isinstance(t, str)]
        year = item.get("pubYear")
        try:
            year = int(year)
        except (ValueError, TypeError):
            year = None
        result.append(common(
            "research-metadata", key, title, url, topic, "Europe PMC",
            year=year,
            authors=[clean_text(item.get("authorString"), 180)] if item.get("authorString") else [],
            publication=clean_text(((item.get("journalInfo") or {}).get("journal") or {}).get("title")),
            recordType="indexed-publication",
            doi=doi, pmid=pmid if re.fullmatch(r"\d{4,12}", pmid) else "",
            publicationTypes=publication_types,
            abstractAvailable=bool(item.get("abstractText")),
            note="公開索引の書誌・文献種別です。抄録・本文の結論と妥当性は未照合です。",
        ))
    return result


def musicbrainz_items(topic, metadata):
    result = []
    for item in metadata.get("works", [])[:2]:
        mid = item.get("id", "")
        if not isinstance(mid, str) or not re.fullmatch(r"[a-fA-F0-9-]{36}", mid):
            continue
        title = clean_text(item.get("title"))
        if not title:
            continue
        result.append(common(
            "music-work-metadata", "mb-work:" + mid, title,
            "https://musicbrainz.org/work/" + mid, topic, "MusicBrainz",
            recordType=clean_text(item.get("type")),
            note="作品IDの候補です。特定の録音やApple Musicの再生先を保証しません。",
        ))
    return result


def museum_item(topic, metadata):
    number = metadata.get("objectID")
    if not isinstance(number, int) or number <= 0:
        return None
    # Rights gate: never show an image unless the Met itself marks it public domain.
    licensed = metadata.get("isPublicDomain") is True
    candidate_image = metadata.get("primaryImageSmall") or ""
    url_parts = urllib.parse.urlsplit(candidate_image)
    image = candidate_image if (
        licensed and url_parts.scheme == "https" and
        url_parts.hostname == "images.metmuseum.org"
    ) else ""
    return common(
        "museum-object", "met:" + str(number),
        metadata.get("title") or f"Met object {number}",
        "https://www.metmuseum.org/art/collection/search/" + str(number),
        topic, "The Met", year=None,
        medium=clean_text(metadata.get("medium")),
        objectDate=clean_text(metadata.get("objectDate")),
        accession=clean_text(metadata.get("accessionNumber"), 60),
        imageUrl=image,
        imageRights="Met Open Access / CC0" if image else "画像未許可・未掲載",
        note="画像の公開範囲は公式APIのisPublicDomainフラグを確認して判断しました。",
    )


def selected_topics(topics, at):
    """Rotate two searches per area; never let music or psychology monopolise a run."""
    groups = {}
    for t in topics:
        groups.setdefault(t["area"], []).append(t)
    # Mon/Tue/Wed and Thu/Fri/Sat/Sun use distinct topic windows.
    # This keeps the two weekly runs varied without over-requesting APIs.
    cycle = at.isocalendar().week * 2 + int(at.weekday() >= 3)
    selected = []
    for area in sorted(groups):
        pool = groups[area]
        start = (cycle * 2) % len(pool)
        selected.extend(pool[(start + j) % len(pool)] for j in range(min(2, len(pool))))
    return selected


def merge(old_items, fresh_items, timestamp):
    merged = {}
    for item in old_items:
        if isinstance(item, dict) and isinstance(item.get("id"), str):
            merged[item["id"]] = dict(item)
    for item in fresh_items:
        if not item.get("id") or not item.get("title") or not item.get("url"):
            continue
        prior = merged.get(item["id"], {})
        new = dict(prior)
        new.update(item)
        new["topicIds"] = sorted(set(prior.get("topicIds", [])) | set(item["topicIds"]))
        new["providers"] = sorted(set(prior.get("providers", [])) | set(item["providers"]))
        new["firstSeen"] = prior.get("firstSeen", timestamp)
        new["lastSeen"] = timestamp
        # The collector cannot grant human verification, regardless of previous state.
        new["reviewStatus"] = "未照合"
        new["evidenceStatus"] = "書誌・作品情報のみ"
        merged[item["id"]] = new
    result = sorted(merged.values(), key=lambda x: (x.get("lastSeen", ""), x["id"]), reverse=True)
    return result[:250]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", action="store_true", help="No network; validates source structure only.")
    args = parser.parse_args()
    cfg = json.loads(SEEDS.read_text(encoding="utf-8"))
    assert cfg.get("schema") == 1
    topics = selected_topics(cfg["topics"], dt.datetime.now(dt.timezone.utc))
    old = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {}
    existing = old.get("items", [])
    stamp = now_utc()
    fresh, errors = [], []
    success = 0

    def record(provider, topic, url, normalise):
        nonlocal success
        try:
            data = fetch_json(url)
            fresh.extend(normalise(topic, data))
            success += 1
        except (ValueError, KeyError, TypeError, TimeoutError, urllib.error.HTTPError,
                urllib.error.URLError, RuntimeError, json.JSONDecodeError) as exc:
            # Never write raw exception URLs: an optional API token might be present.
            errors.append({"source": provider, "topicId": topic["id"],
                           "errorType": type(exc).__name__,
                           "httpStatus": getattr(exc, "code", None)})

    if not args.fixture:
        for i, topic in enumerate(topics):
            qs = urllib.parse.urlencode({"query.bibliographic": topic["query"], "rows": 3})
            contact = os.environ.get("RESEARCH_CONTACT_EMAIL", "").strip()
            if contact:
                qs += "&" + urllib.parse.urlencode({"mailto": contact})
            record("Crossref", topic, "https://api.crossref.org/works?" + qs, crossref_items)
            if i % 2 == 0:
                qs = {"search": topic["query"], "per_page": 2}
                key = os.environ.get("OPENALEX_API_KEY", "").strip()
                if key:
                    qs["api_key"] = key
                record("OpenAlex", topic,
                       "https://api.openalex.org/works?" + urllib.parse.urlencode(qs),
                       openalex_items)
            if topic["area"] == "心理・臨床" or topic["id"] == "music-emotion":
                # Europe PMC search returns biomedical/clinical indexes and article types.
                # We explicitly do not save the abstract text in the published ledger.
                query = urllib.parse.urlencode({
                    "query": topic["query"], "format": "json",
                    "resultType": "core", "pageSize": "3",
                })
                record("Europe PMC", topic,
                       "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + query,
                       europe_pmc_items)
            time.sleep(.2)
        for item in cfg.get("musicbrainz", []):
            topic = {"id": item["topicId"], "area": "音楽作品データ"}
            qs = urllib.parse.urlencode({"query": item["query"], "fmt": "json", "limit": 2})
            record("MusicBrainz", topic,
                   "https://musicbrainz.org/ws/2/work/?" + qs, musicbrainz_items)
            time.sleep(1.2)  # MusicBrainz enforces max one request/sec/IP
        for item in cfg.get("museum", []):
            topic = {"id": item["topicId"], "area": "美術館所蔵品"}
            def make_museum(t, data):
                candidate = museum_item(t, data)
                return [candidate] if candidate else []
            record("The Met", topic,
                   "https://collectionapi.metmuseum.org/public/collection/v1/objects/"
                   + str(int(item["objectId"])), make_museum)
        if success == 0:
            raise RuntimeError("All providers failed; existing candidate file was preserved.")

    for item in cfg.get("anchors", []):
        url = item["url"]
        if not url.startswith("https://"):
            continue
        fresh.append(common(
            "curated-reference-path", "anchor:" + item["topicId"],
            item["title"], url, {"id": item["topicId"], "area": "原典・翻訳"},
            "事前登録リンク", note="固定の参照先。今回の自動処理では本文も到達性も確認していません。",
        ))
    if args.fixture:
        print(json.dumps({"valid": True, "topics": len(topics), "anchors": len(fresh)},
                         ensure_ascii=False))
        return

    doc = {
        "schemaVersion": 1, "lastRunAt": stamp,
        "editorialPolicy": RESEARCH_NOTE,
        "automation": {"frequency": "週2回（GitHub Actions）", "method": "公開APIの書誌・作品メタデータ"},
        "runSummary": {"topicsSearched": [x["id"] for x in topics],
                       "providerCallsSucceeded": success, "errors": errors[:24]},
        "items": merge(existing, fresh, stamp),
    }
    OUTPUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Knowledge discovery: {len(fresh)} new results, {len(doc['items'])} stored,"
          f" {success} successful provider calls, {len(errors)} errors")


if __name__ == "__main__":
    main()
