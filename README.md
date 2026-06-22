# Citation &amp; Bibliography Generator

A fast, **local-only** web app for formatting the sources you actually used into
correct citations — **MLA 9**, **APA 7**, and **Chicago 17** (notes–bibliography),
with matching in-text citations. You enter the bibliographic details of each
source (author, title, publisher, year, URL, …); the app produces a sorted
reference list and the in-text/footnote forms, and lets you copy any of them.

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

- **Three styles, switchable instantly:** MLA 9, APA 7, Chicago 17 (NB).
- **Four source types:** book, journal article, web page, newspaper article —
  each shows only the fields that matter for that type.
- **In-text citations:** parenthetical and narrative forms for MLA/APA; numbered
  footnotes for Chicago NB.
- **Correct mechanics, not string-stuffing:**
  - title case (MLA/Chicago) vs. sentence case (APA), preserving acronyms;
  - author-count rules per style (MLA 3+ → *et al.*; APA 21+ → ellipsis;
    Chicago 11+ → first 7 + *et al.*);
  - inverted vs. natural name order, initials, suffixes;
  - DOI preferred over URL; URL scheme dropped for MLA; access dates;
  - per-style date formatting (`5 Mar. 2021` / `2021, March 5` / `March 5, 2021`).
- **Sorted bibliography** with a hanging indent, alphabetized by author/org/title
  (leading "A/An/The" ignored, diacritics folded).
- **Copy** a single entry, a single in-text citation, or the whole list.
- **Validation hints** (missing title, no author, recommended fields per type).

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
    engine.ts      style dispatch + sorted bibliography assembly
    store.ts       localStorage persistence (with an in-memory fallback)
    __tests__/     unit tests for every module
  components/
    SourceEditor.tsx   the per-source form
  App.tsx          the page (source list, style toggle, output)
```

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check (tsc -b) + production build to dist/
npm test             # run the vitest suite once
npm run test:watch   # watch mode
```

## License

MIT — see [LICENSE](./LICENSE).
