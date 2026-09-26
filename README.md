# Choplifter, one-shotted

One Choplifter prompt, seven models: a personal collection of browser-game experiments from February 5 to September 26, 2026.

[Explore the experiments](https://www.danielpradilla.info/projects/choplifter/) · [Original prompt](PROMPT.md)

The homepage follows Daniel Pradilla’s house style. Each game has a screenshot and opens in a new tab. The original game directories are preserved; the homepage adds no code to them.

| Attempt | Date | Play |
| --- | --- | --- |
| GPT-5.3 Codex | February 2026 | [Choplifter 5.3](https://www.danielpradilla.info/projects/choplifter/choplifter-5.3/) |
| GPT-5.4 | March 2026 | [Choplifter 5.4](https://www.danielpradilla.info/projects/choplifter/choplifter-5.4/) |
| GPT-5.6 Sol | July 2026 | [Lifeline ’82](https://www.danielpradilla.info/projects/choplifter/choplifter-5.6-sol/) |
| GPT-6 Astra | September 2026 | [Rescue Operations](https://www.danielpradilla.info/projects/choplifter/choplifter-6-astra/) |
| DeepSeek 4.1 | September 25, 2026 | [Choplifter web clone](https://www.danielpradilla.info/projects/choplifter/choplifter-deepseek-4.1/) |
| Opus 5.5 | September 25, 2026 | [Choplifter ’82](https://www.danielpradilla.info/projects/choplifter/choplifter-opus-5-5/) |
| GPT-6 Sol | September 26, 2026 | [Choplifter! browser tribute](https://www.danielpradilla.info/projects/choplifter/choplifter-gpt-6-sol/) |

Dates identify when each version entered the collection. OpenAI model release references: [ChatGPT & Codex changelog](https://learn.chatgpt.com/docs/changelog) (GPT-5.3) and [API changelog](https://developers.openai.com/api/docs/changelog) (GPT-5.4, GPT-5.6, GPT-6). This is a personal collection, not a controlled benchmark or an exhaustive release history.


## Preview and publish

The homepage is plain HTML/CSS, plus the site’s existing Google Analytics tag. No package installation or build step is needed for the homepage.

```sh
python3 -m http.server 8000
python3 verify.py
```

Run `node stage.mjs /tmp/choplifter-stage` to package the homepage and all seven games for `/projects/choplifter/`. This copies the static games, builds DeepSeek and GPT-6 Sol with relative asset paths, builds Astra, and exports Sol’s existing server build to HTML. Opus is copied as its original static page.

Staging requires installed dependencies in Astra, DeepSeek, GPT-6 Sol, and Sol, plus Sol’s production build. On a fresh checkout, run `npm ci` in those four game directories, then build Sol before staging. No game source is edited by staging. The original Astra `dist/` is not overwritten.

Upload only the staged directory, preserving unrelated remote files. Keep game source, dependencies, caches, hosting metadata, and Git history out of the web deployment. The original game pages are exempt from the parent site’s analytics rule because preserving them is part of this experiment; the homepage includes the existing Google Analytics tag.

## Credits and rights

*Choplifter!* was created by **Dan Gorlin** and originally published by **Brøderbund** for the **Apple II in 1982**. See the [original manual](https://www.gamesdatabase.org/Media/SYSTEM/Apple_II//Manual/formated/Choplifter%21_-_Br%C3%B8derbund_Software.pdf) and [game history](https://en.wikipedia.org/wiki/Choplifter).

The shared video reference is **[Apple II Longplay - Choplifter](https://www.youtube.com/watch?v=2KDxRSeDKy8)** by **[hirudov](https://www.youtube.com/@Hirudov)**. The recording is credited to its creator; underlying game footage remains subject to the original rights holders’ rights. The video is linked, not rehosted.

This is an independent, noncommercial experiment and tribute, not an official release. It is not affiliated with or endorsed by Dan Gorlin, Brøderbund, Apple, OpenAI, the video creator, or the game’s current rights holders. Original game names, trademarks, code, artwork, music, and footage remain the property of their respective owners. No ownership of those materials is claimed; this repository grants no rights to them. No blanket open-source license is asserted for the collection.

The games may contain bugs or differ from the original. They are provided as-is, without a warranty of accuracy, fitness, or non-infringement. Screenshots depict the recreations.
