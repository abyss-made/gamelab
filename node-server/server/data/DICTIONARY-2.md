# Dictionary 2.0 — sources, policy and regeneration

All data is bundled server-side. No runtime API, new production package or browser dictionary download.

## English

Retain original SCOWL 10–70 and exceptions; add ESDB size ≤80, variant ≤1, neutral/US/British -ise/-ize/Canadian/Australian spellings. Exclude uppercase names, abbreviations, punctuation, possessives and lengths outside 2–24. Approximately 81,000 added words (~196,560 total). Uncommon technical words are deliberately accepted; curated prompts are separate. No speculative inflection generation.

ESDB source: https://github.com/en-wl/wordlist at `1e5b7d3a72f47a71da5d28686c1dd4b397178485`. Permissive MIT-like terms and component notices: `ESDB-COPYRIGHT.txt`; original terms retained in `LEXICON-COPYRIGHT.txt`.

From that checkout:

```
make
./scowl word-list 80 A,B,Z,C,D 1 --deaccent --wo-poses=abbr --categories= > esdb.txt
```

Normalization handles case, compatibility forms, combining accents, invisible formatting, curly apostrophes and Latin ligatures/transliterations. Chain/Scramble still require single alphabetic words. Chain exhaustion now uses the same broad list as acceptance.

## Semantic and geographic data

Princeton **WordNet 3.0** noun hypernyms supply ten concrete category vocabularies; `noun.exc` supplies irregular nouns. Full terms in `WORDNET-LICENSE.txt`. Explicit root synsets and reviewed modern additions live in the generator. Plural candidates must resolve to a listed category member. Reviewed common answers WordNet misses (actor, singer, milkshake, garlic…) live in `category-supplements.json`, merged at load; plural stripping applies only when the submitted spelling is itself a lexicon word or listed irregular (so `fishs`, `foxs`, `sheeps` are rejected). Creative categories retain lexical checks with party-judged meaning. Bluff/drawing invented answers remain unrestricted by this system.

Source https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip
SHA256 `cbda5ea6eef7f36a97a43d4a75f85e07fccbb4f23657d27b4ccbc93e2646ab59`.

City names and Latin-script aliases: **GeoNames**, via `geonamescache 3.0.2` cities15000 data. Attribution: https://www.geonames.org/ under **CC BY 4.0**, https://creativecommons.org/licenses/by/4.0/. Modified by normalization, filtering and deduplication. Short alternate codes are excluded. No GeoNames endorsement. Package code is MIT; geographic data retains its separate attribution terms.

Source https://pypi.org/project/geonamescache/3.0.2/ source archive SHA256 `1cc7007a7a14637f665c7bd7934dc5a04a973daf4d962d789651047aa1a00cb1`.

## Rebuild

```
python node-server/scripts/build-word-data.py esdb.txt /path/wordnet /path/geonamescache-3.0.2
```

Python standard library only; sorted deterministic output. Verify input hashes before regeneration. Add ordinary omissions to `lexicon-extra.txt`; category omissions to the generator supplements; aliases to `wordrules.js`, with a regression case.

Limits: no exhaustive dictionary; WordNet is dated and has polysemous senses. City's population ≥15,000 source misses smaller places; personal-name lists remain finite. Creative category membership is not automatically proven. Proper names do not become valid Chain/Scramble words. User reports do not change scoring or automatically expand vocabulary.

Data adds approximately 3.2MB uncompressed on the server, loaded once into sets/maps. Lookup candidates are bounded; no client size impact. Record measured startup/heap/lookup costs in release evidence.

Players can explicitly open a GitHub omission report from word help or Categories review. The app uploads no telemetry or identity. GitHub login is required to submit; reports are reviewable before submission.
