"""Offline regression tests. No network access or secrets required."""
import json
from pathlib import Path
import unittest
from unittest.mock import patch

import collect as c


class DiscoveryTests(unittest.TestCase):
    def test_rotates_all_four_areas(self):
        seeds = json.loads(c.SEEDS.read_text(encoding="utf-8"))
        selected = c.selected_topics(seeds["topics"], __import__("datetime").datetime(2026, 11, 4))
        self.assertEqual(len(selected), 8)
        areas = {t["area"] for t in selected}
        self.assertEqual(len(areas), 4)
        for area in areas:
            self.assertEqual(sum(t["area"] == area for t in selected), 2)

    def test_weekly_runs_look_at_different_topics(self):
        seeds = json.loads(c.SEEDS.read_text(encoding="utf-8"))
        datetime = __import__("datetime").datetime
        monday = {x["id"] for x in c.selected_topics(seeds["topics"], datetime(2026, 11, 2))}
        thursday = {x["id"] for x in c.selected_topics(seeds["topics"], datetime(2026, 11, 5))}
        self.assertNotEqual(monday, thursday)
        self.assertEqual(len(monday), len(thursday))

    def test_doi_sanitizing(self):
        self.assertEqual(c.doi_key("https://doi.org/10.1000/ABC"), "10.1000/abc")
        self.assertEqual(c.doi_key("javascript:alert(1)"), "")
        self.assertEqual(c.doi_key("10.1000/evil space"), "")

    def test_crossref_metadata_not_body(self):
        t = {"id": "memory", "area": "心理・臨床"}
        data = {"message": {"items": [{
            "DOI": "10.1000/Test", "title": ["A relevant paper"],
            "published": {"date-parts": [[2020, 1]]},
            "abstract": "<p>copyrighted text not to reproduce</p>",
            "author": [{"given": "A", "family": "Researcher"}],
            "type": "journal-article",
        }]}}
        out = c.crossref_items(t, data)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["id"], "doi:10.1000/test")
        self.assertEqual(out[0]["year"], 2020)
        self.assertEqual(out[0]["reviewStatus"], "未照合")
        self.assertNotIn("abstract", json.dumps(out))

    def test_openalex_merges_doi(self):
        t = {"id": "memory", "area": "心理・臨床"}
        data = {"results": [{
            "id": "https://openalex.org/W123",
            "doi": "https://doi.org/10.1000/test",
            "display_name": "A relevant paper",
            "primary_location": {"source": {"display_name": "A journal"}},
            "authorships": [],
        }]}
        fresh = c.openalex_items(t, data)
        original = c.crossref_items(t, {"message": {"items": [
            {"DOI": "10.1000/Test", "title": ["A relevant paper"]}
        ]}})
        merged = c.merge([], fresh + original, "2026-11-04T00:00:00+00:00")
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["providers"], ["Crossref", "OpenAlex"])

    def test_restricted_museum_image_is_never_published(self):
        t = {"id": "zeus-titans", "area": "美術館所蔵品"}
        base = {"objectID": 247308, "title": "Greek jar",
                "primaryImageSmall": "https://images.metmuseum.org/one.jpg"}
        candidate = c.museum_item(t, {**base, "isPublicDomain": False})
        self.assertEqual(candidate["imageUrl"], "")
        self.assertNotIn("CC0", candidate["imageRights"])
        allowed = c.museum_item(t, {**base, "isPublicDomain": True})
        self.assertEqual(allowed["imageRights"], "Met Open Access / CC0")
        forged = c.museum_item(t, {**base, "isPublicDomain": True,
                                  "primaryImageSmall": "https://evil.test/fake.jpg"})
        self.assertEqual(forged["imageUrl"], "")

    def test_musicbrainz_does_not_claim_recording(self):
        t = {"id": "beethoven5", "area": "音楽作品データ"}
        result = c.musicbrainz_items(t, {"works": [{
            "id": "8df992b6-43a5-433a-9b2d-9316728cdb80",
            "title": "Symphony No. 5"
        }]})
        self.assertEqual(len(result), 1)
        self.assertIn("録音", result[0]["note"])
        self.assertNotIn("recordingUrl", result[0])

    def test_does_not_auto_approve(self):
        old = [{"id": "doi:10.1000/a", "title": "A", "url": "https://doi.org/10.1000/a",
                "topicIds": ["music"], "providers": ["Crossref"],
                "reviewStatus": "承認済み", "lastSeen": "2025"}]
        fresh = [{"id": "doi:10.1000/a", "title": "A", "url": "https://doi.org/10.1000/a",
                  "topicIds": ["music"], "providers": ["OpenAlex"]}]
        result = c.merge(old, fresh, "2026")
        self.assertEqual(result[0]["reviewStatus"], "未照合")

    def test_http_host_allowlist(self):
        with self.assertRaises(ValueError):
            c.fetch_json("https://example.com/anything")
        with self.assertRaises(ValueError):
            c.fetch_json("http://api.crossref.org/works")


if __name__ == "__main__":
    unittest.main()
