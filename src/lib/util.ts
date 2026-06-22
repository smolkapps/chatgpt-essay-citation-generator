import type { Person, Source, ValidationIssue } from "./types";

/** True when a string is present and not just whitespace. */
export function has(s: string | undefined | null): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

/** Trim and collapse internal whitespace. */
export function clean(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** Join non-empty pieces with a separator. */
export function joinParts(parts: Array<string | undefined>, sep: string): string {
  return parts.filter((p): p is string => has(p)).map(clean).join(sep);
}

/**
 * Ensure a string ends with a sentence-final period (treating ?/! and a
 * closing period as already-terminal). Used to terminate bibliography entries.
 * Trailing quotes / parens are respected so we don't produce `)..`.
 */
export function ensurePeriod(s: string): string {
  const t = s.trimEnd();
  if (t.length === 0) return t;
  if (/[.?!]$/.test(t)) return t;
  // Allow a closing quote or paren before the period: `... World.”`
  return t + ".";
}

const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "if", "in",
  "into", "nor", "of", "off", "on", "onto", "or", "over", "per", "so",
  "the", "to", "up", "via", "with", "yet",
]);

/**
 * Title Case for English titles (MLA / Chicago headline style):
 * capitalize the first and last word and every "major" word; lowercase
 * short articles/conjunctions/prepositions when interior. Words that already
 * contain an interior capital (e.g. "iPhone", "McKinsey") are left untouched.
 */
export function titleCase(input: string): string {
  const words = clean(input).split(" ");
  return words
    .map((word, i) => {
      if (word.length === 0) return word;
      // Preserve intentional internal capitals / acronyms.
      if (/[A-Z]/.test(word.slice(1))) return word;
      const isEdge = i === 0 || i === words.length - 1;
      const lower = word.toLowerCase();
      const isAfterColon = i > 0 && words[i - 1].endsWith(":");
      if (!isEdge && !isAfterColon && SMALL_WORDS.has(lower)) return lower;
      return capFirst(lower);
    })
    .join(" ");
}

/**
 * Sentence case (APA style for titles of articles, books, web pages):
 * only the first word, the first word after a colon/em dash, and proper
 * nouns are capitalized. We can't detect arbitrary proper nouns, so we
 * preserve words that already carry an interior or leading capital and
 * lowercase the rest.
 */
export function sentenceCase(input: string): string {
  const cleaned = clean(input);
  const words = cleaned.split(" ");
  let capNext = true;
  return words
    .map((word) => {
      if (word.length === 0) return word;
      // Keep proper nouns / acronyms the user already capitalized.
      const looksProper = /[A-Z]/.test(word.slice(1)) || /^[A-Z]{2,}/.test(word);
      let out: string;
      if (capNext) {
        out = capFirst(word.toLowerCase());
      } else if (looksProper) {
        out = word;
      } else {
        out = word.toLowerCase();
      }
      capNext = /[:?!.—–]$/.test(word);
      return out;
    })
    .join(" ");
}

export function capFirst(s: string): string {
  if (s.length === 0) return s;
  // Skip leading punctuation/quotes to capitalize the first letter.
  const m = s.match(/^([^A-Za-z]*)(.*)$/);
  if (!m) return s;
  const [, lead, rest] = m;
  return lead + rest.charAt(0).toUpperCase() + rest.slice(1);
}

/** Full given name(s): "Gabriel" -> "Gabriel". */
export function givenFull(p: Person): string {
  return has(p.given) ? clean(p.given) : "";
}

/**
 * Initials from given names: "Gabriel José" -> "G. J."
 * Hyphenated names keep the hyphen: "Jean-Paul" -> "J.-P."
 */
export function initials(p: Person): string {
  if (!has(p.given)) return "";
  return clean(p.given)
    .split(/\s+/)
    .map((part) =>
      part
        .split("-")
        .map((seg) => (seg[0] ? seg[0].toUpperCase() + "." : ""))
        .join("-"),
    )
    .join(" ");
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_MLA = [
  "Jan.", "Feb.", "Mar.", "Apr.", "May", "June",
  "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec.",
];

interface ParsedDate {
  year: string;
  month?: number; // 1-12
  day?: number;
}

/** Parse an ISO `YYYY-MM-DD` (month/day optional) into parts. */
export function parseISODate(iso: string | undefined): ParsedDate | undefined {
  if (!has(iso)) return undefined;
  const m = iso.trim().match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (!m) return undefined;
  const year = m[1];
  const month = m[2] ? Number(m[2]) : undefined;
  const day = m[3] ? Number(m[3]) : undefined;
  if (month !== undefined && (month < 1 || month > 12)) return { year };
  if (day !== undefined && (day < 1 || day > 31)) return { year, month };
  return { year, month, day };
}

/** MLA day-month-year, e.g. "5 Mar. 2021" or "Mar. 2021" or "2021". */
export function formatDateMLA(iso: string | undefined): string {
  const d = parseISODate(iso);
  if (!d) return "";
  if (d.month && d.day) return `${d.day} ${MONTHS_MLA[d.month - 1]} ${d.year}`;
  if (d.month) return `${MONTHS_MLA[d.month - 1]} ${d.year}`;
  return d.year;
}

/** APA "(2021, March 5)" inner part: "2021, March 5" / "2021, March" / "2021". */
export function formatDateAPA(iso: string | undefined): string {
  const d = parseISODate(iso);
  if (!d) return "";
  if (d.month && d.day) return `${d.year}, ${MONTHS[d.month - 1]} ${d.day}`;
  if (d.month) return `${d.year}, ${MONTHS[d.month - 1]}`;
  return d.year;
}

/** Chicago month-day-year, e.g. "March 5, 2021". */
export function formatDateChicago(iso: string | undefined): string {
  const d = parseISODate(iso);
  if (!d) return "";
  if (d.month && d.day) return `${MONTHS[d.month - 1]} ${d.day}, ${d.year}`;
  if (d.month) return `${MONTHS[d.month - 1]} ${d.year}`;
  return d.year;
}

/** Today's date as a human "5 March 2021"-ish access date for MLA. */
export function isoToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Validate a source for the minimum fields needed to produce a usable
 * citation. We are deliberately lenient (a title is the only hard
 * requirement) and warn about commonly-needed fields per type.
 */
export function validateSource(s: Source): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!has(s.title)) {
    issues.push({ field: "title", message: "Title is required." });
  }
  const hasAuthor = s.authors.some((a) => has(a.family)) || has(s.organization);
  if (!hasAuthor) {
    issues.push({
      field: "author",
      message: "No author or organization — the work will be cited by title.",
    });
  }
  // Author entries that have a given name but no family name are malformed.
  for (const a of s.authors) {
    if (has(a.given) && !has(a.family)) {
      issues.push({ field: "author", message: "An author has a first name but no last name." });
      break;
    }
  }
  if (!has(s.year) && !has(s.publishedDate)) {
    issues.push({ field: "year", message: "No year — APA will use “n.d.”." });
  }
  switch (s.type) {
    case "journal":
      if (!has(s.container)) {
        issues.push({ field: "container", message: "Journal name is recommended." });
      }
      break;
    case "website":
      if (!has(s.url)) {
        issues.push({ field: "url", message: "A URL is recommended for a website." });
      }
      break;
    case "newspaper":
      if (!has(s.container)) {
        issues.push({ field: "container", message: "Newspaper name is recommended." });
      }
      break;
    case "book":
      if (!has(s.publisher)) {
        issues.push({ field: "publisher", message: "Publisher is recommended for a book." });
      }
      break;
  }
  return issues;
}

/** True if a source has at least the hard-required fields to cite. */
export function isCitable(s: Source): boolean {
  return has(s.title);
}

/** Effective year for a source: explicit `year`, else year of publishedDate. */
export function effectiveYear(s: Source): string | undefined {
  if (has(s.year)) return clean(s.year);
  const d = parseISODate(s.publishedDate);
  return d?.year;
}
