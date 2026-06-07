# Podcast migration (PowerPress -> DigitalOcean Spaces)

One-time staging of all existing podcast audio so the new platform's podcast experience
is testable immediately. Source: the live WordPress site uses the PowerPress plugin; 951
episodes across 12 show-categories, with audio scattered across multiple hosts
(Transistor, Blubrry, iaccessibility.net, Pinecast, Podbean, Libsyn, Captivate).

## Artifacts

- `manifest.json` — every episode: id, post GUID (preserve for feed continuity),
  permalink, title, date_gmt, categories, show, enclosure url, bytes, mime, show notes
  (content). Generated from PowerPress `enclosure` post meta.
- `stage_audio.py` — streams each enclosure from its origin host straight to Spaces (no
  local disk), organized as `iAccessibility/podcast/<show-slug>/episodes/<id>-<file>`,
  public-read. Resumable (skips objects that already exist). Reads DO creds from
  `../../.env.local`.
- `staged.json` — output: per-episode result with final Spaces key + public URL (and any
  failures). Consumed by the platform's podcast importer to build the DB while preserving
  GUIDs.

## Notes

- Show slugs are normalized (lowercase, alphanumeric), which merges casing duplicates
  (e.g. "Hands On Safety" / "Hands on Safety"). The iACast-family variants
  (iA Cast / iCast / ACast / iA Cast Weekly) are kept as separate folders for now and can
  be consolidated later.
- Re-run `python3 stage_audio.py` to retry failures; completed uploads are skipped.
