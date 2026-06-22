// The citation engine: the single entry point the UI calls.
//
// It dispatches a `Source` to the right style formatter, and assembles a full
// sorted bibliography (Works Cited / References / Bibliography) for a list of
// sources. Sorting follows the convention shared by MLA, APA, and Chicago:
// alphabetical by the first element of the entry (author family name, else
// organization, else title), ignoring a leading article ("A/An/The").

import { formatAPA, apaSignal } from "./apa";
import { formatChicago, chicagoSignal } from "./chicago";
import { formatMLA, mlaSignal } from "./mla";
import type { CitationStyle, FormattedCitation, Source } from "./types";
import { clean, has, isCitable } from "./util";

/** Style metadata for the UI (labels for headings and toggles). */
export const STYLES: ReadonlyArray<{
  id: CitationStyle;
  label: string;
  /** Heading used for the reference list in this style. */
  listHeading: string;
  /** Edition note shown in the UI. */
  edition: string;
}> = [
  { id: "mla", label: "MLA", listHeading: "Works Cited", edition: "9th edition" },
  { id: "apa", label: "APA", listHeading: "References", edition: "7th edition" },
  {
    id: "chicago",
    label: "Chicago",
    listHeading: "Bibliography",
    edition: "17th ed. (notes-bibliography)",
  },
];

/** Format a single source in a single style. */
export function formatOne(source: Source, style: CitationStyle): FormattedCitation {
  switch (style) {
    case "mla":
      return formatMLA(source);
    case "apa":
      return formatAPA(source);
    case "chicago":
      return formatChicago(source);
  }
}

/** Format a single source in all three styles at once. */
export function formatAll(source: Source): Record<CitationStyle, FormattedCitation> {
  return {
    mla: formatMLA(source),
    apa: formatAPA(source),
    chicago: formatChicago(source),
  };
}

const LEADING_ARTICLE = /^(?:a|an|the)\s+/i;

/**
 * The string a bibliography entry alphabetizes on. By convention this is the
 * author's family name, then organization, then the title — with any leading
 * English article stripped and case/diacritics folded so "Élan" sorts near
 * "Elan" and "The Wind" sorts under "W"... no, under "W" is wrong: articles are
 * ignored, so "The Wind" sorts under "Wind".
 */
export function sortKey(s: Source): string {
  const people = s.authors.filter((a) => has(a.family));
  let base: string;
  if (people.length > 0) {
    base = clean(people[0].family);
  } else if (has(s.organization)) {
    base = clean(s.organization);
  } else {
    base = clean(s.title).replace(LEADING_ARTICLE, "");
  }
  return foldForSort(base);
}

/** Lowercase + strip diacritics + drop leading non-alphanumerics for sorting. */
function foldForSort(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining marks
    .toLowerCase()
    .replace(/^[^a-z0-9]+/, "")
    .trim();
}

/** One row of a rendered bibliography. */
export interface BibliographyEntry {
  source: Source;
  text: string;
}

/**
 * Build a sorted reference list for the given style. Non-citable sources
 * (missing a title) are skipped. Sorting is locale-aware and stable for ties.
 */
export function buildBibliography(
  sources: Source[],
  style: CitationStyle,
): BibliographyEntry[] {
  const citable = sources.filter(isCitable);
  const decorated = citable.map((source, index) => ({
    source,
    index,
    key: sortKey(source),
    text: formatOne(source, style).bibliography,
  }));
  decorated.sort((a, b) => {
    const c = a.key.localeCompare(b.key, "en", { sensitivity: "base" });
    return c !== 0 ? c : a.index - b.index;
  });
  return decorated.map(({ source, text }) => ({ source, text }));
}

/** Plain-text export of a whole bibliography, one entry per line. */
export function bibliographyToText(
  sources: Source[],
  style: CitationStyle,
): string {
  return buildBibliography(sources, style)
    .map((e) => e.text)
    .join("\n");
}

/**
 * The author "signal" used for in-text citations, by style. Exposed so the UI
 * can preview how a source will appear inside a sentence.
 */
export function signalFor(s: Source, style: CitationStyle): string {
  switch (style) {
    case "mla":
      return mlaSignal(s);
    case "apa":
      return apaSignal(s);
    case "chicago":
      return chicagoSignal(s);
  }
}
