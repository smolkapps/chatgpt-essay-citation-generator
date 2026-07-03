// Chicago 17th edition formatter — Author-Date (AD) style.
//
// Chicago offers two documentation systems; this file implements the
// *author-date* system (common in the sciences and social sciences), a sibling
// to the notes-bibliography (NB) system in `chicago.ts`. The two share author
// formatting and the same title casing, so those helpers are imported from the
// NB module rather than duplicated; only the entry layout and the in-text form
// differ.
//
// Reference-list entry (author-date):
//   book:    Last, First. Year. Title. Publisher.
//   article: Last, First. "Title." Year. Journal Volume (Issue): pages. DOI/URL.
//            (year sits right after the author, the article title is in quotes,
//             the journal is followed by volume, issue in parentheses, then a
//             colon and the page range.)
//
// The task spec writes the article form as
//   Last, First. Year. "Title." Journal Volume (Issue): pages. DOI/URL.
// with the year *before* the title. That is the correct CMoS 17 author-date
// order (§15.9), and it is what this formatter emits.
//
// In-text citation is parenthetical author-date: (Last Year, page), e.g.
//   (Gladwell 2000, 45). Narrative form: Gladwell (2000).
//
// Note on `Place:`: CMoS book references traditionally include the publisher's
// city ("Place: Publisher"). The app's data model has no place/city field
// (see `Source` in types.ts), so — exactly as the existing NB formatter does —
// the place is omitted and the book entry ends "Title. Publisher." This keeps
// author-date consistent with the notes-bibliography output already shipped.

import { chicagoBibAuthors, chicagoSignal } from "./chicago";
import type { FormattedCitation, Source } from "./types";
import {
  clean,
  effectiveYear,
  ensurePeriod,
  formatDateChicago,
  has,
  titleCase,
} from "./util";

/** A quoted, period-terminated title with the period inside the closing quote. */
function quoted(title: string): string {
  return `“${titleCase(title)}.”`;
}

function locationFor(s: Source): string {
  if (has(s.doi)) return `https://doi.org/${clean(s.doi)}`;
  if (has(s.url)) return clean(s.url);
  return "";
}

/** The date block that follows the author: "2000." or "n.d." when undated. */
function adDate(s: Source): string {
  const y = effectiveYear(s);
  return has(y) ? `${y}.` : "n.d.";
}

/**
 * Chicago author-date reference-list entry. Reuses the shared Chicago author
 * list (`chicagoBibAuthors`) and title casing; the layout (year-forward) and
 * punctuation are the author-date system's own.
 */
export function chicagoAdReference(s: Source): string {
  const author = chicagoBibAuthors(s);
  const parts: string[] = [];
  if (has(author)) parts.push(ensurePeriod(author));
  parts.push(adDate(s));

  switch (s.type) {
    case "book": {
      // Year. Title. Publisher.
      parts.push(ensurePeriod(titleCase(s.title)));
      if (has(s.publisher)) parts.push(ensurePeriod(clean(s.publisher)));
      break;
    }
    case "journal": {
      // Year. "Title." Journal Volume (Issue): pages. DOI/URL.
      parts.push(quoted(s.title));
      let src = has(s.container) ? titleCase(s.container) : "";
      if (has(s.volume)) src += ` ${clean(s.volume)}`;
      if (has(s.issue)) src += ` (${clean(s.issue)})`;
      if (has(s.pages)) src += `: ${clean(s.pages)}`;
      if (has(src)) parts.push(ensurePeriod(src));
      const loc = locationFor(s);
      if (has(loc)) parts.push(ensurePeriod(loc));
      break;
    }
    case "newspaper": {
      // Year. "Title." Newspaper, full date. URL.
      parts.push(quoted(s.title));
      let src = has(s.container) ? titleCase(s.container) : "";
      const date = formatDateChicago(s.publishedDate);
      if (has(date)) src += has(src) ? `, ${date}` : date;
      if (has(src)) parts.push(ensurePeriod(src));
      const loc = locationFor(s);
      if (has(loc)) parts.push(ensurePeriod(loc));
      break;
    }
    case "website": {
      // Year. "Title." Site name. URL.
      parts.push(quoted(s.title));
      if (has(s.container)) parts.push(ensurePeriod(titleCase(s.container)));
      const acc = formatDateChicago(s.accessed);
      if (has(acc)) parts.push(ensurePeriod(`Accessed ${acc}`));
      const loc = locationFor(s);
      if (has(loc)) parts.push(ensurePeriod(loc));
      break;
    }
  }
  return parts.join(" ");
}

/** First page number for an in-text citation: "45-60" -> "45". */
function pageStart(pages: string): string {
  const m = clean(pages).match(/[A-Za-z]?\d+[A-Za-z]?/);
  return m ? m[0] : clean(pages);
}

/**
 * Parenthetical in-text citation: (Author Year, page). No comma between the
 * author signal and the year (Chicago author-date style); a comma precedes the
 * page. Falls back to "n.d." when there is no date.
 */
export function chicagoAdInText(s: Source): string {
  const sig = chicagoSignal(s);
  const y = effectiveYear(s) ?? "n.d.";
  const page = has(s.pages) ? `, ${pageStart(s.pages)}` : "";
  return `(${sig} ${y}${page})`;
}

/** Narrative form where the author is named in the sentence: Author (Year). */
export function chicagoAdNarrative(s: Source): string {
  const sig = chicagoSignal(s);
  const y = effectiveYear(s) ?? "n.d.";
  return `${sig} (${y})`;
}

export function formatChicagoAd(s: Source): FormattedCitation {
  return {
    bibliography: chicagoAdReference(s),
    inText: chicagoAdInText(s),
    inTextNarrative: chicagoAdNarrative(s),
  };
}
