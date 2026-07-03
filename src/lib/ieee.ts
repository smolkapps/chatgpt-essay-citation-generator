// IEEE citation style formatter (Institute of Electrical and Electronics
// Engineers), as used across IEEE journals and conferences.
//
// Reference-list entry (numbered, the number matching the bracketed in-text
// citation):
//   article: [n] F. Last, "Title," Journal, vol. X, no. Y, pp. Z–Z, Mon. Year.
//   book:    [n] F. Last, Title. Place: Publisher, Year.
//
// IEEE names are "F. M. Last" (given-name initials *before* the surname) — the
// opposite order from MLA/APA/Chicago — so this formatter reuses the shared
// `initials()` helper for the initials and assembles them in IEEE order. Page
// ranges use an en-dash (`pageRangeEnDash`) and months are abbreviated
// (`formatDateIEEE`).
//
// In-text citations are bracketed reference numbers, e.g. "[1]"; there is no
// author-name narrative form, so `inTextNarrative` is left undefined.
//
// Note on `Place:`: the IEEE book form includes the publisher's city
// ("Place: Publisher, Year"). The app's `Source` model has no place/city field
// (see types.ts), so — consistent with the existing Chicago/APA formatters,
// which also omit it — the book entry is "Title. Publisher, Year." The colon
// form is used only when a place is available (it never is, given the model).

import type { FormattedCitation, Person, Source } from "./types";
import {
  clean,
  effectiveYear,
  ensurePeriod,
  formatDateIEEE,
  has,
  initials,
  isPageRange,
  pageRangeEnDash,
  titleCase,
} from "./util";

/** IEEE name: initials before surname, e.g. "F. M. Last" (with optional suffix). */
function ieeeName(p: Person): string {
  const fam = clean(p.family);
  const ini = initials(p); // "Gabriel José" -> "G. J."
  const suf = has(p.suffix) ? clean(p.suffix) : "";
  const core = has(ini) ? `${ini} ${fam}` : fam;
  return has(suf) ? `${core}, ${suf}` : core;
}

/**
 * IEEE author list:
 *  1:    "F. Last"
 *  2:    "F. Last and G. Other"
 *  3–6:  "A. One, B. Two, and C. Three" (serial comma before "and")
 *  7+:   "A. One et al." (first author only, per the IEEE ≥7 rule)
 * With no people, falls back to the organization; with neither, empty.
 */
export function ieeeAuthors(s: Source): string {
  const people = s.authors.filter((a) => has(a.family));
  if (people.length === 0) {
    return has(s.organization) ? clean(s.organization) : "";
  }
  const names = people.map(ieeeName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length <= 6) {
    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  }
  // 7+ authors: first author then "et al."
  return `${names[0]} et al.`;
}

function locationFor(s: Source): string {
  if (has(s.doi)) return `doi: ${clean(s.doi)}`;
  if (has(s.url)) return clean(s.url);
  return "";
}

/**
 * The IEEE reference body (everything after the "[n] " label). Kept separate so
 * the number can be supplied by the caller / bibliography assembler.
 */
export function ieeeBody(s: Source): string {
  const author = ieeeAuthors(s);
  const lead = has(author) ? `${author}, ` : "";

  switch (s.type) {
    case "book": {
      // Title. Publisher, Year.
      let body = `${lead}${titleCase(s.title)}.`;
      const tail: string[] = [];
      if (has(s.publisher)) tail.push(clean(s.publisher));
      const y = effectiveYear(s);
      if (has(y)) tail.push(y);
      if (tail.length > 0) body += ` ${tail.join(", ")}`;
      return ensurePeriod(body);
    }
    case "journal": {
      // "Title," Journal, vol. X, no. Y, pp. Z–Z, Mon. Year.
      const segs: string[] = [`“${titleCase(s.title)},”`];
      if (has(s.container)) segs.push(`${clean(s.container)},`);
      const meta: string[] = [];
      if (has(s.volume)) meta.push(`vol. ${clean(s.volume)}`);
      if (has(s.issue)) meta.push(`no. ${clean(s.issue)}`);
      if (has(s.pages)) {
        meta.push(
          isPageRange(s.pages)
            ? `pp. ${pageRangeEnDash(s.pages)}`
            : `p. ${clean(s.pages)}`,
        );
      }
      const date = formatDateIEEE(s.publishedDate) || effectiveYear(s) || "";
      if (has(date)) meta.push(date);
      const loc = locationFor(s);
      if (has(loc)) meta.push(loc);
      const tail = meta.join(", ");
      const body = `${lead}${segs.join(" ")}${has(tail) ? ` ${tail}` : ""}`;
      return ensurePeriod(body);
    }
    case "newspaper": {
      // "Title," Newspaper, Mon. Year, pp. Z. URL.
      const segs: string[] = [`“${titleCase(s.title)},”`];
      if (has(s.container)) segs.push(`${clean(s.container)},`);
      const meta: string[] = [];
      const date = formatDateIEEE(s.publishedDate) || effectiveYear(s) || "";
      if (has(date)) meta.push(date);
      if (has(s.pages)) meta.push(`p. ${clean(s.pages)}`);
      const loc = locationFor(s);
      if (has(loc)) meta.push(loc);
      const tail = meta.join(", ");
      const body = `${lead}${segs.join(" ")}${has(tail) ? ` ${tail}` : ""}`;
      return ensurePeriod(body);
    }
    case "website": {
      // "Title," Site name. Accessed: Date. [Online]. Available: URL
      const segs: string[] = [`“${titleCase(s.title)},”`];
      if (has(s.container)) segs.push(`${clean(s.container)}.`);
      const meta: string[] = [];
      const date = formatDateIEEE(s.publishedDate) || effectiveYear(s) || "";
      if (has(date)) meta.push(date);
      const tail = meta.join(", ");
      let body = `${lead}${segs.join(" ")}${has(tail) ? ` ${tail}` : ""}`;
      body = ensurePeriod(body);
      if (has(s.url)) body += ` [Online]. Available: ${clean(s.url)}`;
      return body;
    }
  }
}

/** Full numbered reference: "[n] <body>". `n` defaults to 1. */
export function ieeeReference(s: Source, n = 1): string {
  return `[${n}] ${ieeeBody(s)}`;
}

/** IEEE in-text citation is the bracketed reference number, e.g. "[1]". */
export function ieeeInText(n = 1): string {
  return `[${n}]`;
}

export function formatIEEE(s: Source, n = 1): FormattedCitation {
  return {
    bibliography: ieeeReference(s, n),
    inText: ieeeInText(n),
  };
}
