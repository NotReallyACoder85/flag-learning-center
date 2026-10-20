# Flag Learning Center

Phone-first web app that teaches our 5th-grade flag football offense: formations, routes, play calls, and how plays beat Cover 3, Cover 2 and Man. Built for the Lake Nona Rams.

Requirements: [docs/BRD.md](docs/BRD.md). Visual/behavior reference: [docs/reference/prototype-v2.html](docs/reference/prototype-v2.html).

## Run it

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run build    # production build into dist/
```

## Folder map

| Path | What lives there |
|---|---|
| `src/data/` | Coach-editable JSON: formations, routes, plays, settings. No code changes needed to edit these. |
| `src/engine/` | Pure logic with no DOM: call parsing, scene building, defenses, result evaluation. |
| `src/ui/` | Rendering and interaction. |
| `src/styles/` | CSS and bundled fonts. |
| `tests/` | Unit tests and the formation x defense x motion sweep. |
| `public/` | Icons, manifest, files copied as-is. |
| `docs/` | BRD and reference prototype. |

## Editing the playbook

- Add a play: add an entry to `src/data/plays.json`.
- Tune a route: edit its `points` in `src/data/routes.json` (lateral yards, depth yards).
- Move a formation: edit `src/data/formations.json`.
- Quiz length and app name: `src/data/settings.json`.
- How far zone defenses lean toward the strong side (Trips, Quads, or motion that makes trips): `overload` in `src/data/settings.json` (`pxPerReceiver`, `maxPx`). Set both to 0 to turn it off.
- Wording of the tell and result callouts: `src/data/copy.json`.

## Notes

- `node_modules` is stored as `node_modules.nosync` (symlinked) so iCloud does not sync thousands of files.
