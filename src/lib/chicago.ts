// Chicago 17th edition formatter — Notes-Bibliography (NB) style.
//
// Bibliography:
//   Last, First. Title of Book. Place: Publisher, Year.
//   Last, First. "Article Title." Journal Name vol, no. n (Year): pages.
// Footnote (first, full):
//   1. First Last, Title of Book (Place: Publisher, Year), page.
//   1. First Last, "Article Title," Journal Name vol, no. n (Year): page.
//
// NB uses title case for titles, books italic, articles in quotes.

import type { FormattedCitation, Person, Source } from "./types";
import {
  clean,
  ensurePeriod,
  effectiveYear,
  formatDateChicago,
  givenFull,
  has,
  joinParts,
  titleCase,
} from "./util";

/** Bibliography name (first author inverted): "Last, First." */
function bibNameFirst(p: Person): string {
  const fam = clean(p.family);
  const giv = givenFull(p);
  const suf = has(p.suffix) ? clean(p.suffix) : "";
  if (!has(giv)) return fam;
  const head = `${fam}, ${giv}`;
  return has(suf) ? `${head}, ${suf}` : head;
}

/** Non-first / footnote name (natural order): "First Last." */
function natName(p: Person): string {
  const fam = clean(p.family);
  const giv = givenFull(p);
  const suf = has(p.suffix) ? clean(p.suffix) : "";
  const core = has(giv) ? `${giv} ${fam}` : fam;
  return has(suf) ? `${core}, ${suf}` : core;
}

/**
 * Chicago bibliography authors:
 *  1: "Last, First"
 *  2: "Last, First, and First Last"
 *  3: "Last, First, First Last, and First Last"
 *  4–10: list all; 11+: first 7 then "et al." (Chicago 17 rule).
 */
export function chicagoBibAuthors(s: Source): string {
  const people = s.authors.filter((a) => has(a.family));
  if (people.length === 0) {
    return has(s.organization) ? clean(s.organization) : "";
  }
  if (people.length === 1) return bibNameFirst(people[0]);
  const first = bibNameFirst(people[0]);
  const rest = people.slice(1).map(natName);
  if (people.length <= 10) {
    if (rest.length === 1) return `${first}, and ${rest[0]}`;
    return `${first}, ${rest.slice(0, -1).join(", ")}, and ${rest[rest.length - 1]}`;
  }
  // 11+ authors: list first 7, then "et al."
  const first7 = [first, ...people.slice(1, 7).map(natName)];
  return `${first7.join(", ")}, et al.`;
}

/** Footnote authors (all natural order). 4+: "First Last et al." */
export function chicagoNoteAuthors(s: Source): string {
  const people = s.authors.filter((a) => has(a.family));
  if (people.length === 0) {
    return has(s.organization) ? clean(s.organization) : "";
  }
  const names = people.map(natName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
  return `${names[0]} et al.`;
}

function locationFor(s: Source): string {
  if (has(s.doi)) return `https://doi.org/${clean(s.doi)}`;
  if (has(s.url)) return clean(s.url);
  return "";
}

export function chicagoBibliography(s: Source): string {
  const author = chicagoBibAuthors(s);
  const parts: string[] = [];
  if (has(author)) parts.push(ensurePeriod(author));

  switch (s.type) {
    case "book": {
      parts.push(ensurePeriod(titleCase(s.title)));
      // Place: Publisher, Year.
      const pub = joinParts([s.publisher, effectiveYear(s)], ", ");
      if (has(pub)) parts.push(ensurePeriod(pub));
      break;
    }
    case "journal": {
      parts.push(quoted(s.title));
      // Journal vol, no. n (Year): pages.
      let src = has(s.container) ? titleCase(s.container) : "";
      if (has(s.volume)) src += ` ${clean(s.volume)}`;
      if (has(s.issue)) src += `, no. ${clean(s.issue)}`;
      const y = effectiveYear(s);
      if (has(y)) src += ` (${y})`;
      if (has(s.pages)) src += `: ${clean(s.pages)}`;
      if (has(src)) parts.push(ensurePeriod(src));
      const loc = locationFor(s);
      if (has(loc)) parts.push(ensurePeriod(loc));
      break;
    }
    case "newspaper": {
      parts.push(quoted(s.title));
      let src = has(s.container) ? titleCase(s.container) : "";
      const date = formatDateChicago(s.publishedDate) || effectiveYear(s) || "";
      if (has(date)) src += has(src) ? `, ${date}` : date;
      if (has(src)) parts.push(ensurePeriod(src));
      const loc = locationFor(s);
      if (has(loc)) parts.push(ensurePeriod(loc));
      break;
    }
    case "website": {
      parts.push(quoted(s.title));
      let src = has(s.container) ? titleCase(s.container) : "";
      const date = formatDateChicago(s.publishedDate) || effectiveYear(s) || "";
      if (has(date)) src += has(src) ? `, ${date}` : date;
      if (has(src)) parts.push(ensurePeriod(src));
      const acc = formatDateChicago(s.accessed);
      if (has(acc)) parts.push(ensurePeriod(`Accessed ${acc}`));
      const loc = locationFor(s);
      if (has(loc)) parts.push(ensurePeriod(loc));
      break;
    }
  }
  return parts.join(" ");
}

/** A quoted, period-terminated title with the period inside the quote. */
function quoted(title: string): string {
  return `“${titleCase(title)}.”`;
}

/**
 * Chicago footnote (first full reference). `n` is the note number.
 * Page (if present) is the specific cited page, not a range.
 */
export function chicagoFootnote(s: Source, n = 1): string {
  const author = chicagoNoteAuthors(s);
  const lead = has(author) ? `${author}, ` : "";
  let body = "";
  switch (s.type) {
    case "book": {
      const inner = joinParts([s.publisher, effectiveYear(s)], ", ");
      body = `${titleCase(s.title)}`;
      if (has(inner)) body += ` (${inner})`;
      if (has(s.pages)) body += `, ${pageStart(s.pages)}`;
      break;
    }
    case "journal": {
      let src = has(s.container) ? titleCase(s.container) : "";
      if (has(s.volume)) src += ` ${clean(s.volume)}`;
      if (has(s.issue)) src += `, no. ${clean(s.issue)}`;
      const y = effectiveYear(s);
      if (has(y)) src += ` (${y})`;
      if (has(s.pages)) src += `: ${pageStart(s.pages)}`;
      body = `“${titleCase(s.title)},” ${src}`.trimEnd();
      break;
    }
    case "newspaper": {
      const date = formatDateChicago(s.publishedDate) || effectiveYear(s) || "";
      let src = has(s.container) ? titleCase(s.container) : "";
      if (has(date)) src += has(src) ? `, ${date}` : date;
      body = `“${titleCase(s.title)},” ${src}`.trimEnd();
      break;
    }
    case "website": {
      const date = formatDateChicago(s.publishedDate) || effectiveYear(s) || "";
      let src = has(s.container) ? titleCase(s.container) : "";
      if (has(date)) src += has(src) ? `, ${date}` : date;
      const loc = locationFor(s);
      body = `“${titleCase(s.title)},” ${src}`.trimEnd();
      if (has(loc)) body += `, ${loc}`;
      break;
    }
  }
  return `${n}. ${lead}${ensurePeriod(body)}`;
}

/** Author-date is NOT used in NB; we expose an author signal for convenience. */
export function chicagoSignal(s: Source): string {
  const people = s.authors.filter((a) => has(a.family));
  if (people.length === 1) return clean(people[0].family);
  if (people.length === 2) {
    return `${clean(people[0].family)} and ${clean(people[1].family)}`;
  }
  if (people.length >= 3) return `${clean(people[0].family)} et al.`;
  if (has(s.organization)) return clean(s.organization);
  return titleCase(s.title);
}

function pageStart(pages: string): string {
  const m = clean(pages).match(/[A-Za-z]?\d+[A-Za-z]?/);
  return m ? m[0] : clean(pages);
}

export function formatChicago(s: Source): FormattedCitation {
  return {
    bibliography: chicagoBibliography(s),
    inText: chicagoFootnote(s, 1),
    footnote: chicagoFootnote(s, 1),
  };
}
