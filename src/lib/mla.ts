// MLA 9th edition formatter (Modern Language Association).
//
// Bibliography entries follow the MLA "core elements" container model:
//   Author. "Title of Source." Title of Container, Other contributors,
//   Version, Number, Publisher, Publication date, Location.
// In-text citations are author-page: (Smith 42); by title when no author.

import type { FormattedCitation, Person, Source } from "./types";
import {
  clean,
  ensurePeriod,
  formatDateMLA,
  givenFull,
  has,
  joinParts,
  titleCase,
} from "./util";

/** "Last, First Middle" for the first author; "First Last" thereafter. */
function nameFirst(p: Person): string {
  const fam = clean(p.family);
  const giv = givenFull(p);
  const suf = has(p.suffix) ? clean(p.suffix) : "";
  if (!has(giv)) return fam; // mononym
  // MLA puts the suffix after the given name: "King, Martin Luther, Jr."
  const head = `${fam}, ${giv}`;
  return has(suf) ? `${head}, ${suf}` : head;
}

function nameRest(p: Person): string {
  const fam = clean(p.family);
  const giv = givenFull(p);
  const suf = has(p.suffix) ? clean(p.suffix) : "";
  const core = has(giv) ? `${giv} ${fam}` : fam;
  return has(suf) ? `${core}, ${suf}` : core;
}

/**
 * MLA author string. 1 author: "Last, First." 2 authors: "Last, First, and
 * First Last." 3+ authors: "Last, First, et al."
 */
export function mlaAuthors(s: Source): string {
  const people = s.authors.filter((a) => has(a.family));
  if (people.length === 0) {
    return has(s.organization) ? clean(s.organization) : "";
  }
  if (people.length === 1) return nameFirst(people[0]);
  if (people.length === 2) {
    return `${nameFirst(people[0])}, and ${nameRest(people[1])}`;
  }
  return `${nameFirst(people[0])}, et al.`;
}

/** Wrap a title in MLA quotation marks (curly), terminating with a period. */
function quotedTitle(title: string): string {
  // Period goes inside the closing quote in MLA.
  return `“${titleCase(title)}.”`;
}

/** Italic titles are rendered as plain text here; the UI italicizes container. */
function italicTitle(title: string): string {
  return titleCase(title);
}

function locationFor(s: Source): string {
  // Prefer DOI, then URL (MLA 9 drops the http:// for DOIs, keeps URL bare).
  if (has(s.doi)) return `https://doi.org/${clean(s.doi)}`;
  if (has(s.url)) return clean(s.url).replace(/^https?:\/\//, "");
  return "";
}

export function mlaBibliography(s: Source): string {
  const author = mlaAuthors(s);
  const parts: string[] = [];
  if (has(author)) parts.push(ensurePeriod(author));

  switch (s.type) {
    case "book": {
      parts.push(ensurePeriod(italicTitle(s.title)));
      // Publisher, Year.
      const pub = joinParts([s.publisher, s.year], ", ");
      if (has(pub)) parts.push(ensurePeriod(pub));
      break;
    }
    case "journal": {
      parts.push(quotedTitle(s.title));
      // Container, vol. X, no. Y, Year, pp. Z. Location.
      const tail = joinParts(
        [
          has(s.container) ? italicTitle(s.container) : undefined,
          has(s.volume) ? `vol. ${clean(s.volume)}` : undefined,
          has(s.issue) ? `no. ${clean(s.issue)}` : undefined,
          s.year,
          has(s.pages) ? `pp. ${clean(s.pages)}` : undefined,
        ],
        ", ",
      );
      if (has(tail)) parts.push(ensurePeriod(tail));
      const loc = locationFor(s);
      if (has(loc)) parts.push(ensurePeriod(loc));
      break;
    }
    case "newspaper": {
      parts.push(quotedTitle(s.title));
      const date = formatDateMLA(s.publishedDate) || s.year || "";
      // In MLA 9 the location (URL/DOI) is the final element of the container
      // unit, joined with commas — not a separate period-terminated sentence.
      const tail = joinParts(
        [
          has(s.container) ? italicTitle(s.container) : undefined,
          date,
          has(s.pages) ? `p. ${clean(s.pages)}` : undefined,
          locationFor(s) || undefined,
        ],
        ", ",
      );
      if (has(tail)) parts.push(ensurePeriod(tail));
      break;
    }
    case "website": {
      parts.push(quotedTitle(s.title));
      const date = formatDateMLA(s.publishedDate) || s.year || "";
      const tail = joinParts(
        [
          has(s.container) ? italicTitle(s.container) : undefined,
          date,
          locationFor(s) || undefined,
        ],
        ", ",
      );
      if (has(tail)) parts.push(ensurePeriod(tail));
      // Accessed date (recommended for undated / changeable web content).
      const acc = formatDateMLA(s.accessed);
      if (has(acc)) parts.push(ensurePeriod(`Accessed ${acc}`));
      break;
    }
  }
  return parts.join(" ");
}

/** The "signal" name used in in-text citations: family name or org or title. */
export function mlaSignal(s: Source): string {
  const people = s.authors.filter((a) => has(a.family));
  if (people.length === 1) return clean(people[0].family);
  if (people.length === 2) {
    return `${clean(people[0].family)} and ${clean(people[1].family)}`;
  }
  if (people.length >= 3) return `${clean(people[0].family)} et al.`;
  if (has(s.organization)) return clean(s.organization);
  // No author: shortened title in quotes (articles) or italics (books).
  return shortTitle(s);
}

function shortTitle(s: Source): string {
  const words = titleCase(s.title).split(" ");
  const short = words.slice(0, Math.min(words.length, 4)).join(" ");
  if (s.type === "book") return short;
  return `“${short}”`;
}

export function mlaInText(s: Source): string {
  const sig = mlaSignal(s);
  const page = has(s.pages) ? ` ${pageStart(s.pages)}` : "";
  return `(${sig}${page})`;
}

/** Narrative form: author named in sentence, page in parentheses. */
export function mlaNarrative(s: Source): string {
  return mlaSignal(s);
}

/** First page number for an in-text citation: "12-34" -> "12". */
function pageStart(pages: string): string {
  const m = clean(pages).match(/[A-Za-z]?\d+[A-Za-z]?/);
  return m ? m[0] : clean(pages);
}

export function formatMLA(s: Source): FormattedCitation {
  return {
    bibliography: mlaBibliography(s),
    inText: mlaInText(s),
    inTextNarrative: mlaNarrative(s),
  };
}
