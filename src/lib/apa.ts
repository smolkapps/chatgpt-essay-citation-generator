// APA 7th edition formatter (American Psychological Association).
//
// Reference list entry:
//   Author, A. A. (Year). Title of work. Source. https://doi...
// Author names use "Family, I. I." Titles of articles/chapters/books/web
// pages are sentence case; journal names and book/website containers are
// title case and italicized (UI italicizes; text here is plain).
// In-text: (Author, Year, p. X). Narrative: Author (Year).

import type { FormattedCitation, Person, Source } from "./types";
import {
  clean,
  ensurePeriod,
  effectiveYear,
  formatDateAPA,
  has,
  initials,
  sentenceCase,
  titleCase,
} from "./util";

/** "Family, I. I." with optional suffix: "King, M. L., Jr." */
function apaName(p: Person): string {
  const fam = clean(p.family);
  const ini = initials(p);
  const suf = has(p.suffix) ? clean(p.suffix) : "";
  const head = has(ini) ? `${fam}, ${ini}` : fam;
  return has(suf) ? `${head}, ${suf}` : head;
}

/**
 * APA author list:
 *  1: "Smith, J."
 *  2: "Smith, J., & Doe, A."
 *  3–20: "A, B., C, D., & E, F." (Oxford-style ampersand before last)
 *  21+: first 19, then "...", then the final author.
 */
export function apaAuthors(s: Source): string {
  const people = s.authors.filter((a) => has(a.family));
  if (people.length === 0) {
    return has(s.organization) ? clean(s.organization) : "";
  }
  const names = people.map(apaName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, & ${names[1]}`;
  if (names.length <= 20) {
    return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
  }
  // 21+ authors: list first 19, ellipsis, final author (no ampersand).
  const first19 = names.slice(0, 19).join(", ");
  return `${first19}, ... ${names[names.length - 1]}`;
}

/** "(2021)." date block; "(n.d.)." when no date; full date for newspapers/web. */
function apaDate(s: Source): string {
  if (s.type === "newspaper" || s.type === "website") {
    const d = formatDateAPA(s.publishedDate);
    if (has(d)) return `(${d}).`;
  }
  const y = effectiveYear(s);
  return has(y) ? `(${y}).` : "(n.d.).";
}

function locationFor(s: Source): string {
  if (has(s.doi)) return `https://doi.org/${clean(s.doi)}`;
  if (has(s.url)) return clean(s.url);
  return "";
}

export function apaReference(s: Source): string {
  const author = apaAuthors(s);
  const parts: string[] = [];
  if (has(author)) parts.push(ensurePeriod(author));
  parts.push(apaDate(s));

  switch (s.type) {
    case "book": {
      // Title in sentence case, italic (book). Publisher.
      parts.push(ensurePeriod(sentenceCase(s.title)));
      if (has(s.publisher)) parts.push(ensurePeriod(clean(s.publisher)));
      break;
    }
    case "journal": {
      parts.push(ensurePeriod(sentenceCase(s.title)));
      // Journal, Volume(Issue), pages.
      let src = has(s.container) ? titleCase(s.container) : "";
      if (has(s.volume)) {
        src += `, ${clean(s.volume)}`;
        if (has(s.issue)) src += `(${clean(s.issue)})`;
      }
      if (has(s.pages)) src += `, ${clean(s.pages)}`;
      if (has(src)) parts.push(ensurePeriod(src));
      const loc = locationFor(s);
      if (has(loc)) parts.push(loc);
      break;
    }
    case "newspaper": {
      parts.push(ensurePeriod(sentenceCase(s.title)));
      let src = has(s.container) ? titleCase(s.container) : "";
      if (has(s.pages)) src += has(src) ? `, ${clean(s.pages)}` : clean(s.pages);
      if (has(src)) parts.push(ensurePeriod(src));
      const loc = locationFor(s);
      if (has(loc)) parts.push(loc);
      break;
    }
    case "website": {
      // Page title sentence case italic; Site name; URL.
      parts.push(ensurePeriod(sentenceCase(s.title)));
      if (has(s.container)) parts.push(ensurePeriod(titleCase(s.container)));
      const loc = locationFor(s);
      if (has(loc)) parts.push(loc);
      break;
    }
  }
  return parts.join(" ");
}

/** Signal (author) component of an in-text citation. */
export function apaSignal(s: Source): string {
  const people = s.authors.filter((a) => has(a.family));
  if (people.length === 1) return clean(people[0].family);
  if (people.length === 2) {
    return `${clean(people[0].family)} & ${clean(people[1].family)}`;
  }
  if (people.length >= 3) return `${clean(people[0].family)} et al.`;
  if (has(s.organization)) return clean(s.organization);
  // No author: italicized title (books/web) or quoted title (articles).
  return titleSignal(s);
}

/** Narrative signal uses "and" instead of "&". */
export function apaSignalNarrative(s: Source): string {
  const people = s.authors.filter((a) => has(a.family));
  if (people.length === 2) {
    return `${clean(people[0].family)} and ${clean(people[1].family)}`;
  }
  return apaSignal(s);
}

function titleSignal(s: Source): string {
  const words = titleCase(s.title).split(" ");
  const short = words.slice(0, Math.min(words.length, 4)).join(" ");
  if (s.type === "book" || s.type === "website") return short;
  return `“${short}”`;
}

export function apaInText(s: Source): string {
  const sig = apaSignal(s);
  const y = effectiveYear(s) ?? "n.d.";
  const page = has(s.pages) ? `, p. ${pageStart(s.pages)}` : "";
  return `(${sig}, ${y}${page})`;
}

export function apaNarrative(s: Source): string {
  const sig = apaSignalNarrative(s);
  const y = effectiveYear(s) ?? "n.d.";
  return `${sig} (${y})`;
}

function pageStart(pages: string): string {
  const m = clean(pages).match(/[A-Za-z]?\d+[A-Za-z]?/);
  return m ? m[0] : clean(pages);
}

export function formatAPA(s: Source): FormattedCitation {
  return {
    bibliography: apaReference(s),
    inText: apaInText(s),
    inTextNarrative: apaNarrative(s),
  };
}
