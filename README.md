# Choplifter, one-shotted

One Choplifter prompt, four OpenAI models: a personal collection of browser-game experiments from February 5 to September 5, 2026.

[Explore the experiments](https://www.danielpradilla.info/projects/choplifter/) · [Original prompt](PROMPT.md)

The homepage follows Daniel Pradilla’s house style. Each game has a screenshot and opens in a new tab. The original game directories are preserved; the homepage adds no code to them.

| Attempt | Month | Thinking effort | Play |
| --- | --- | --- | --- |
| GPT-5.3 Codex | February 2026 | High | [Choplifter 5.3](https://www.danielpradilla.info/projects/choplifter/choplifter-5.3/) |
| GPT-5.4 | March 2026 | High | [Choplifter 5.4](https://www.danielpradilla.info/projects/choplifter/choplifter-5.4/) |
| GPT-5.6 Sol | July 2026 | Extra-high | [Lifeline ’82](https://www.danielpradilla.info/projects/choplifter/choplifter-5.6-sol/) |
| GPT-6 Astra | September 2026 | Extra-high | [Rescue Operations](https://www.danielpradilla.info/projects/choplifter/choplifter-6-astra/) |

Months place the launch-week experiments in time. Model release references: [OpenAI ChatGPT & Codex changelog](https://learn.chatgpt.com/docs/changelog) (5.3) and [OpenAI API changelog](https://developers.openai.com/api/docs/changelog) (5.4, 5.6, 6). The collection records launch-week experiments as described by Daniel; these files represent the versions collected on September 5. This is not a controlled benchmark or an exhaustive release history.

Each attempt used the next-to-highest thinking effort. Daniel confirmed Extra-high for GPT-5.6 Sol and GPT-6 Astra. High for GPT-5.3 Codex and GPT-5.4 is inferred from that rule and their [documented](https://developers.openai.com/api/docs/models/gpt-5.3-codex) [effort options](https://developers.openai.com/api/docs/models/gpt-5.4), rather than recovered execution logs.

## Preview and publish

The homepage is plain HTML/CSS, plus the site’s existing Google Analytics tag. No package installation or build step is needed for the homepage.

```sh
python3 -m http.server 8000
python3 verify.py
```

Run `node stage.mjs /tmp/choplifter-stage` to package the homepage and all four games for `/projects/choplifter/`. This copies the two static games, builds Astra with relative asset paths outside the source directory, and exports Sol’s existing server build to HTML. Sol’s client bundles are copied byte-for-byte; only asset URLs in the exported HTML are relocated. Its original hosted version remains at [lifeline-82.depr001.chatgpt.site](https://lifeline-82.depr001.chatgpt.site) and requires ChatGPT sign-in.

Staging requires Astra’s installed dependencies and Sol’s existing production build. On a fresh checkout, run `npm ci` in each of those two game directories and `npm run build` in Sol before staging. No game source is edited by staging. The original Astra `dist/` is not overwritten.

Upload only the staged directory, preserving unrelated remote files. Keep game source, dependencies, caches, hosting metadata, and Git history out of the web deployment. The original game pages are exempt from the parent site’s analytics rule because preserving them is part of this experiment; the homepage includes the existing Google Analytics tag.

## Credits and rights

*Choplifter!* was created by **Dan Gorlin** and originally published by **Brøderbund** for the **Apple II in 1982**. See the [original manual](https://www.gamesdatabase.org/Media/SYSTEM/Apple_II//Manual/formated/Choplifter%21_-_Br%C3%B8derbund_Software.pdf) and [game history](https://en.wikipedia.org/wiki/Choplifter).

The shared video reference is **[Apple II Longplay - Choplifter](https://www.youtube.com/watch?v=2KDxRSeDKy8)** by **[hirudov](https://www.youtube.com/@Hirudov)**. The recording is credited to its creator; underlying game footage remains subject to the original rights holders’ rights. The video is linked, not rehosted.

This is an independent, noncommercial experiment and tribute, not an official release. It is not affiliated with or endorsed by Dan Gorlin, Brøderbund, Apple, OpenAI, the video creator, or the game’s current rights holders. Original game names, trademarks, code, artwork, music, and footage remain the property of their respective owners. No ownership of those materials is claimed; this repository grants no rights to them. No blanket open-source license is asserted for the collection.

The games may contain bugs or differ from the original. They are provided as-is, without a warranty of accuracy, fitness, or non-infringement. Screenshots depict the recreations.
