# Mini Golf: aiming, recaps and recovery

Follow-up to [Party Play](../minigolf-party-play/README.md), on the same draft PR [#79](https://github.com/abyss-made/gamelab/pull/79). The angled courses, artwork and authoritative physics are retained.

- Tap the course to aim; adjust power and Putt, or pull back from your ball and release.
- Open **Scores & last hole** to revisit actual finishes and standings after moving to the next hole. **Back to course** returns keyboard focus to the canvas. Friends can keep playing while you read.
- Shots and tee placement wait for a rendered course. A stalled graphics request or lost WebGL context recovers into the existing playable 2D view, preserving the room and score and cancelling a held pull safely.

[Actual screenshots](SCREENSHOTS.md) · [Implementation handoff](HANDOFF.md) · [Validation and limits](VALIDATION.md)

For the interactive review, serve the repository root with `python -m http.server 45440 --bind 127.0.0.1`, then open `http://127.0.0.1:45440/docs/minigolf-round-flow/`. GitHub displays HTML source rather than running it.

The gallery includes original 1440×900 desktop, 390×844 phone and 932×430 landscape captures, plus full real-time desktop/phone recordings and short excerpts. Compatibility-view captures are explicitly labelled fault tests. These are automated browser checks, not human playtest feedback. Nothing merged or deployed.
