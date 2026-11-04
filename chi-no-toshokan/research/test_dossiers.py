"""Research dossier checks: metadata must never silently become verified science."""
import json
import unittest
import build_dossiers as b


class DossierTests(unittest.TestCase):
    def setUp(self):
        self.seed = {"schema": 1, "topics": [
            {"id": "x", "area": "心理・臨床", "label": "臨床試験の研究",
             "query": "psychotherapy trial outcome", "link": ""}
        ]}
        self.record = {
            "schemaVersion": 1, "lastRunAt": "2026-11-04T00:00:00+00:00",
            "items": [
                {"id": "doi:10.1000/one", "title": "psychotherapy trial outcome",
                 "url": "https://doi.org/10.1000/one", "kind": "research-metadata",
                 "area": "心理・臨床", "topicIds": ["x"], "providers": ["Europe PMC"],
                 "publicationTypes": ["Randomized Controlled Trial"],
                 "reviewStatus": "承認済み", "authors": ["A Researcher"]},
                {"id": "doi:10.1000/two", "title": "Noise control during construction",
                 "url": "https://doi.org/10.1000/two", "kind": "research-metadata",
                 "area": "心理・臨床", "topicIds": ["x"], "providers": ["Crossref"]},
            ],
        }

    def test_no_auto_approval_even_if_ledger_claims_approved(self):
        out = b.build(self.seed, self.record)
        d = out["dossiers"][0]
        self.assertFalse(d["readyToPublish"])
        self.assertEqual(d["verifiedClaims"], 0)
        self.assertTrue(all(x["reviewStatus"] == "本文未照合" for x in d["sources"]))
        self.assertEqual(out["counts"]["readyToPublish"], 0)

    def test_publication_type_not_evidence_confidence(self):
        doc = b.build(self.seed, self.record)
        first = doc["dossiers"][0]["sources"][0]
        self.assertIn("ランダム化比較試験", first["publicationTypeHint"])
        self.assertNotIn("信頼度", json.dumps(doc, ensure_ascii=False))

    def test_low_title_relevance_is_visible(self):
        doc = b.build(self.seed, self.record)
        weak = next(x for x in doc["dossiers"][0]["sources"] if x["id"].endswith("two"))
        self.assertFalse(weak["titleMatchesSearch"])
        self.assertEqual(weak["titleMatchCount"], 0)

    def test_no_fake_sources_for_empty_topic(self):
        self.record["items"] = []
        doc = b.build(self.seed, self.record)
        d = doc["dossiers"][0]
        self.assertEqual(d["sourceCount"], 0)
        self.assertTrue(any("不足" in n for n in d["warnings"]))
        self.assertEqual(doc["counts"]["topicsWithSources"], 0)

    def test_image_requires_cc0_even_in_dossiers(self):
        self.record["items"] = [
            {"id": "met:9", "kind": "museum-object", "title": "Ancient Greek vase",
             "url": "https://www.metmuseum.org/art/collection/search/9",
             "topicIds": ["x"], "imageUrl": "https://images.metmuseum.org/example.jpg",
             "imageRights": "未確認"}
        ]
        d = b.build(self.seed, self.record)["dossiers"][0]
        self.assertEqual(d["sources"][0]["imageUrl"], "")

    def test_no_copied_abstracts_or_external_claims(self):
        self.record["items"][0]["abstractText"] = "A full protected abstract that cannot be published"
        s = json.dumps(b.build(self.seed, self.record), ensure_ascii=False)
        self.assertNotIn("full protected abstract", s)

    def test_seeds_produce_dossiers_in_four_areas(self):
        s = json.loads(b.SEEDS.read_text(encoding="utf-8"))
        c = json.loads(b.CANDIDATES.read_text(encoding="utf-8"))
        result = b.build(s, c)
        self.assertEqual(len(result["dossiers"]), len(s["topics"]))
        self.assertGreaterEqual(len(result["counts"]["areas"]), 4)
        self.assertEqual(result["counts"]["verifiedClaims"], 0)
        for d in result["dossiers"]:
            self.assertGreaterEqual(len(d["reviewChecks"]), 5)


if __name__ == "__main__":
    unittest.main()
