# Citation &amp; Bibliography Generator

A fast, **local-only** web app for formatting the sources you actually used into
correct citations — **MLA 9**, **APA 7**, **Chicago 17** (both notes–bibliography
and author–date), and **IEEE** — with matching in-text citations and footnotes.
You enter the bibliographic details of each source (author, title, publisher,
year, URL, …); the app produces a sorted reference list and the in-text/footnote
forms, and lets you copy, download, or print any of them.

Everything runs in the browser. Your source list is saved in `localStorage` and
is **never uploaded anywhere**. There is no account, no server, and no network
call.

## A note on scope (why this isn't an essay writer)

This project began from a spec for a "ChatGPT essay + citation generator" that
would take a topic and a source list, **write the essay for the student via an
LLM**, and offer a *"write at a fifth-grade level with errors"* toggle.

That part was deliberately **not built.** A tool whose purpose is to generate a
paper a student submits as their own work — and, worse, a toggle whose only
function is to disguise machine-generated text as a struggling student's
authentic writing so it slips past plagiarism / AI detectors — is academic
fraud with a UI. It also violates the usage policies of every major LLM
provider.

What *is* genuinely useful, and what this repo ships, is the **citation engine**:
the same job done by Zotero, EasyBib, or citationmachine. Formatting references
you have read is a legitimate, boring, valuable chore. That's the whole app.

## Features

- **Five styles, switchable instantly:** MLA 9, APA 7, Chicago 17
  (notes–bibliography), Chicago 17 (author–date), IEEE.
- **Four source types:** book, journal article, web page, newspaper article —
  each shows only the fields that matter for that type.
- **In-text citations:** parenthetical and narrative forms for MLA/APA/Chicago
  author–date; numbered footnotes for Chicago NB; position-numbered `[n]`
  markers for IEEE.
- **Correct mechanics, not string-stuffing:**
  - title case (MLA/Chicago) vs. sentence case (APA), preserving acronyms;
  - author-count rules per style (MLA 3+ → *et al.*; APA 21+ → ellipsis;
    Chicago 11+ → first 7 + *et al.*);
  - inverted vs. natural name order, initials, suffixes;
  - DOI preferred over URL; URL scheme dropped for MLA; access dates;
  - per-style date formatting (`5 Mar. 2021` / `2021, March 5` / `March 5, 2021`).
- **Sorted bibliography** with a hanging indent, alphabetized by author/org/title
  (leading "A/An/The" ignored, diacritics folded); IEEE renumbered after sorting.
- **Copy, export, print:** copy a single entry, a single in-text citation, or the
  whole list; download the list as a `.txt` file; print styles that output just
  the reference list with its hanging indent.
- **Example sources** one click away, so you can see every style's output before
  typing anything.
- **Validation hints** (missing title, no author, recommended fields per type).
- **Dark mode** (follows the system preference) and a mobile-friendly layout.
- **Installable:** ships a web app manifest and a full icon set, and works
  offline once loaded — there are no network calls at all.

## Caveat

No citation generator is a substitute for the style manual. Citation styles have
many edge cases (edited volumes, chapters, translators, multiple works by one
author in the same year, e-books, secondary sources, …) that this tool does not
attempt. **Always check generated citations** against an authoritative source —
the Purdue OWL, your style guide, or your instructor — before submitting.

## Tech

Vite + React + TypeScript, no runtime dependencies beyond React. The citation
logic in `src/lib/` is framework-agnostic, pure, and fully unit-tested with
Vitest.

```
src/
  lib/
    types.ts       domain model (Source, FormattedCitation, …)
    util.ts        shared helpers (title/sentence case, dates, validation)
    mla.ts         MLA 9 formatter
    apa.ts         APA 7 formatter
    chicago.ts     Chicago 17 notes–bibliography formatter
    chicago-ad.ts  Chicago 17 author–date formatter
    ieee.ts        IEEE reference-list formatter
    engine.ts      style dispatch + sorted bibliography assembly
    store.ts       localStorage persistence (with an in-memory fallback)
    examples.ts    built-in example sources
    __tests__/     unit tests for every module
  components/
    SourceEditor.tsx   the per-source form
  App.tsx          the page (source list, style toggle, output)
public/            favicons, PWA icons, manifest, OG image, robots, sitemap, 404
scripts/
  generate-assets.mjs  regenerates the raster icons + OG image (needs Chromium)
```

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check (tsc -b) + production build to dist/
npm test             # run the vitest suite once
npm run test:watch   # watch mode
```

The PNG icons and the Open Graph image in `public/` are generated from the SVG
artwork by `scripts/generate-assets.mjs` (requires a local Chromium; see the
script header). They are committed, so this only needs to run when the artwork
changes.

## License

MIT — see [LICENSE](./LICENSE).
