"""Small homepage integrity check: python3 verify.py."""
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def handle_data(self, data):
        self.text.append(data)


page = Page()
page.feed((ROOT / "index.html").read_text())
images = [a for tag, a in page.tags if tag == "img"]
games = [a for tag, a in page.tags if tag == "a" and (
    a.get("href", "").startswith("choplifter-") or
    a.get("href", "").startswith("https://lifeline-82.")
)]
assert len(images) == 7 and len(games) == 14
assert len({a["href"] for a in games}) == 7
for a in games:
    assert a.get("target") == "_blank" and "noopener" in a.get("rel", "")
for img in images:
    assert (ROOT / img["src"]).is_file() and img.get("alt")
    assert int(img["width"]) == 1000 and int(img["height"]) > 0
prompt = (ROOT / "PROMPT.md").read_text().split("> ", 1)[1].split("\n", 1)[0]
assert prompt in "".join(page.text)
dates = {a["datetime"] for tag, a in page.tags if tag == "time"}
assert dates == {"2026-02-05", "2026-09-26", "2026-02", "2026-03", "2026-07", "2026-09", "2026-09-25", "2026-09-26"}
assert "Brøderbund" in "".join(page.text) and "hirudov" in "".join(page.text)
print("PASS: seven game images, seven destinations, new-tab links, exact prompt, dates, and credits")
