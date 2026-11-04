#!/usr/bin/env python3
"""Publication gate for machine-generated *unverified* research metadata."""
import json
from pathlib import Path
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parents[1]
SOURCE = BASE / "research-candidates.json"
DOSSIERS = BASE / "research-dossiers.json"
HOSTS = {
    "doi.org", "openalex.org", "pubmed.ncbi.nlm.nih.gov",
    "www.metmuseum.org", "www.theoi.com", "musicbrainz.org",
}
SENSITIVE = {"abstractText", "fullText", "session", "accessToken",
             "serviceRole", "userId", "password", "email"}


def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    prepared = json.loads(DOSSIERS.read_text(encoding="utf-8"))
    assert data["schemaVersion"] == prepared["schemaVersion"] == 1
    assert prepared["generatedFrom"] == data["lastRunAt"]
    assert prepared["counts"]["topics"] == len(prepared["dossiers"])
    assert prepared["counts"]["verifiedClaims"] == 0
    assert prepared["counts"]["readyToPublish"] == 0
    original = {p["id"]: p for p in data["items"]}
    for dossier in prepared["dossiers"]:
        assert dossier["editorialStage"] == "記事化準備・自動整理"
        assert dossier["readyToPublish"] is False
        assert dossier["verifiedClaims"] == 0
        assert dossier["sourceCount"] == len(dossier["sources"])
        for item in dossier["sources"]:
            assert item["reviewStatus"] == "本文未照合"
            assert item["id"] in original
            assert item["title"] == original[item["id"]]["title"]
            assert item["url"] == original[item["id"]]["url"]
            parts = urlsplit(item["url"])
            assert parts.scheme == "https" and parts.hostname in HOSTS
            if item.get("imageUrl"):
                old = original[item["id"]]
                assert item["imageRights"] == old["imageRights"] == "Met Open Access / CC0"
                assert item["imageUrl"] == old["imageUrl"]
                src = urlsplit(item["imageUrl"])
                assert src.scheme == "https" and src.hostname == "images.metmuseum.org"
            assert not (set(item) & SENSITIVE)
        assert not (set(dossier) & SENSITIVE)
    # Metadata, not paper texts: no special token/material leaves this pipeline.
    assert not (set(data) & SENSITIVE)
    print("Public research gate passed:", len(prepared["dossiers"]), "dossiers;",
          prepared["counts"]["sourcesLinked"], "source links; zero verified claims.")


if __name__ == "__main__":
    main()
