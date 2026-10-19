"""Regression checks for the homepage VOICES spotlight."""

from html.parser import HTMLParser
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class Elements(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.elements = []

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))


class HomeVoicesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.voice_page = (ROOT / "voice-box" / "index.html").read_text(encoding="utf-8")
        cls.css = (ROOT / "assets" / "home-voices.css").read_text(encoding="utf-8")
        parser = Elements()
        parser.feed(cls.html)
        cls.elements = parser.elements

    def test_main_section_order(self):
        markers = ['id="news"', 'id="home-voices"', 'id="lyric-box"', 'class="featured-recording"']
        positions = [self.html.index(marker) for marker in markers]
        self.assertEqual(positions, sorted(positions))
        self.assertEqual(self.html.count('id="home-voices"'), 1)
        self.assertEqual(self.html.count('id="news"'), 1)
        self.assertEqual(self.html.count('id="lyric-box"'), 1)

    def test_approved_text_not_invented(self):
        featured = "歌った日から時間が経ってもすぐ思い出すようなとっても良い曲"
        self.assertIn(featured, self.voice_page)
        self.assertIn(featured, self.html)
        self.assertIn("作詞作曲はとても難しいと思います", self.voice_page)

    def test_existing_voice_box_comments_preserved(self):
        self.assertIn("《これから》に寄せて", self.voice_page)
        for excerpt in ("VOICE 001", "VOICE 002", "歌詞読んでたら色々思い出してきました。", "ミュージックアルバム待ってます"):
            self.assertIn(excerpt, self.voice_page)
        self.assertIn("送信された内容が自動で公開されることはありません", self.voice_page)
        self.assertIn('id="voice-form"', self.voice_page)

    def test_homepage_is_a_short_teaser(self):
        spotlight = self.html.split('id="home-voices"', 1)[1].split('id="lyric-box"', 1)[0]
        self.assertEqual(spotlight.count("<blockquote>"), 1)
        self.assertNotIn("home-voice-mini", spotlight)
        self.assertIn("《これから》への声を読む", spotlight)
        self.assertNotIn("作詞作曲はとても難しいと思います", spotlight)

    def test_navigation_targets_and_existing_features(self):
        links = [attrs["href"] for tag, attrs in self.elements if tag == "a" and "href" in attrs]
        self.assertIn("/voice-box/#korekara", links)
        for fragment in ("voices", "korekara", "voice-form"):
            self.assertIn(f'id="{fragment}"', self.voice_page)
        for existing in ("portrait-frame", 'id="lyric-stage"', 'id="deai-live"', "site05-entrances"):
            self.assertIn(existing, self.html)

    def test_css_is_responsive_and_loaded(self):
        self.assertIn('/assets/home-voices.css', self.html)
        self.assertIn("max-width: 760px", self.css)
        self.assertIn(":focus-visible", self.css)


if __name__ == "__main__":
    unittest.main()
