// Domain model for the citation engine.
//
// A `Source` is the user's raw description of a reference. The citation
// engine turns it into a bibliography entry and an in-text citation in the
// chosen style. Everything here is plain data — no formatting decisions live
// in this file.

export type CitationStyle = "mla" | "apa" | "chicago";

export type SourceType = "book" | "journal" | "website" | "newspaper";

/** A single contributor (author, editor, translator). */
export interface Person {
  /** Family / last name, e.g. "García Márquez". Required for a named person. */
  family: string;
  /** Given / first name(s), e.g. "Gabriel". May be empty for mononyms. */
  given?: string;
  /** Suffix such as "Jr." or "III". Optional. */
  suffix?: string;
}

/**
 * A source can be authored by:
 *  - a list of people, or
 *  - a single organization / corporate author (e.g. "World Health Organization").
 * If both are empty the source is treated as having no author (cited by title).
 */
export interface Source {
  /** Stable id for list management in the UI. */
  id: string;
  type: SourceType;
  /** Individual authors, in the order they appear on the source. */
  authors: Person[];
  /** Corporate / group author, used when `authors` is empty. */
  organization?: string;
  /** Title of the work (book title, article title, page title). */
  title: string;
  /**
   * Title of the larger container the work sits in:
   *  - journal name (for `journal`)
   *  - website / publisher name (for `website`)
   *  - newspaper name (for `newspaper`)
   * Ignored for `book`.
   */
  container?: string;
  /** Four-digit publication year, e.g. "2021". Some styles allow "n.d.". */
  year?: string;
  /** Publisher (books). */
  publisher?: string;
  /** Journal volume. */
  volume?: string;
  /** Journal issue. */
  issue?: string;
  /** Page range, e.g. "12-34" or single page "B7". */
  pages?: string;
  /** URL for online sources. */
  url?: string;
  /** DOI for journal articles, e.g. "10.1000/xyz". Preferred over URL when present. */
  doi?: string;
  /** Access / retrieval date for web sources, ISO `YYYY-MM-DD`. */
  accessed?: string;
  /** Full publication date for newspapers / dated web pages, ISO `YYYY-MM-DD`. */
  publishedDate?: string;
}

/** The result of formatting one source in one style. */
export interface FormattedCitation {
  /** The bibliography / Works Cited / References entry, as plain text. */
  bibliography: string;
  /** Default parenthetical in-text citation, e.g. "(Smith 42)". */
  inText: string;
  /**
   * Narrative / signal-phrase form where the author appears in the sentence,
   * e.g. APA "Smith (2020)" or MLA "Smith". `undefined` for footnote-only styles.
   */
  inTextNarrative?: string;
  /** Chicago footnote text (Chicago only). */
  footnote?: string;
}

/** Validation problem for a single source. */
export interface ValidationIssue {
  field: keyof Source | "author";
  message: string;
}
