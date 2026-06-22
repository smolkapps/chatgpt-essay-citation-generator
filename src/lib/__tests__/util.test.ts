import { describe, expect, it } from "vitest";
import {
  clean,
  effectiveYear,
  ensurePeriod,
  formatDateAPA,
  formatDateChicago,
  formatDateMLA,
  has,
  initials,
  isCitable,
  joinParts,
  parseISODate,
  sentenceCase,
  titleCase,
  validateSource,
} from "../util";
import type { Source } from "../types";

const base = (over: Partial<Source> = {}): Source => ({
  id: "x",
  type: "book",
  title: "A Title",
  authors: [],
  ...over,
});

describe("string helpers", () => {
  it("has() rejects empty/whitespace", () => {
    expect(has("a")).toBe(true);
    expect(has("  ")).toBe(false);
    expect(has(undefined)).toBe(false);
    expect(has(null)).toBe(false);
  });

  it("clean() collapses whitespace", () => {
    expect(clean("  a   b\tc  ")).toBe("a b c");
  });

  it("joinParts() drops empties and cleans", () => {
    expect(joinParts(["a", undefined, "  b ", ""], ", ")).toBe("a, b");
  });

  it("ensurePeriod() adds a period only when needed", () => {
    expect(ensurePeriod("Smith")).toBe("Smith.");
    expect(ensurePeriod("Smith.")).toBe("Smith.");
    expect(ensurePeriod("Really?")).toBe("Really?");
    expect(ensurePeriod("Wow!")).toBe("Wow!");
    expect(ensurePeriod("")).toBe("");
  });
});

describe("titleCase", () => {
  it("capitalizes major words and lowercases interior small words", () => {
    expect(titleCase("the lord of the rings")).toBe("The Lord of the Rings");
  });
  it("always capitalizes the last word", () => {
    expect(titleCase("a song to sing for")).toBe("A Song to Sing For");
  });
  it("capitalizes the first word after a colon", () => {
    expect(titleCase("hamlet: a tragedy")).toBe("Hamlet: A Tragedy");
  });
  it("preserves intentional internal capitals", () => {
    expect(titleCase("the iPhone era")).toBe("The iPhone Era");
  });
});

describe("sentenceCase", () => {
  it("capitalizes only the first word", () => {
    expect(sentenceCase("the lord of the rings")).toBe("The lord of the rings");
  });
  it("re-capitalizes after a colon", () => {
    expect(sentenceCase("a study: the second part")).toBe("A study: The second part");
  });
  it("preserves all-caps acronyms but lowercases leading-capital-only interior words", () => {
    // The acronym HTML is kept; "Web" (only a leading capital) cannot be told
    // apart from a sentence-initial capital, so it is lowercased — APA sentence
    // case lowercases common nouns anyway.
    expect(sentenceCase("understanding HTML and the Web")).toBe(
      "Understanding HTML and the web",
    );
  });
  it("preserves a multi-capital proper noun (interior capital present)", () => {
    expect(sentenceCase("a study of McKinsey methods")).toBe(
      "A study of McKinsey methods",
    );
  });
});

describe("initials", () => {
  it("reduces given names to initials", () => {
    expect(initials({ family: "X", given: "Gabriel José" })).toBe("G. J.");
  });
  it("keeps hyphens", () => {
    expect(initials({ family: "X", given: "Jean-Paul" })).toBe("J.-P.");
  });
  it("returns empty for no given name", () => {
    expect(initials({ family: "X" })).toBe("");
  });
});

describe("date parsing & formatting", () => {
  it("parses full and partial ISO dates", () => {
    expect(parseISODate("2021-03-05")).toEqual({ year: "2021", month: 3, day: 5 });
    expect(parseISODate("2021-03")).toEqual({ year: "2021", month: 3, day: undefined });
    expect(parseISODate("2021")).toEqual({ year: "2021", month: undefined, day: undefined });
    expect(parseISODate("garbage")).toBeUndefined();
    expect(parseISODate(undefined)).toBeUndefined();
  });
  it("rejects impossible month/day but keeps the year", () => {
    expect(parseISODate("2021-13-05")).toEqual({ year: "2021" });
    expect(parseISODate("2021-03-77")).toEqual({ year: "2021", month: 3 });
  });
  it("formats MLA day-month-year", () => {
    expect(formatDateMLA("2021-03-05")).toBe("5 Mar. 2021");
    expect(formatDateMLA("2021-05-01")).toBe("1 May 2021");
    expect(formatDateMLA("2021-09-01")).toBe("1 Sept. 2021");
  });
  it("formats APA year-comma-month-day", () => {
    expect(formatDateAPA("2021-03-05")).toBe("2021, March 5");
    expect(formatDateAPA("2021-03")).toBe("2021, March");
  });
  it("formats Chicago month-day-year", () => {
    expect(formatDateChicago("2021-03-05")).toBe("March 5, 2021");
  });
});

describe("source helpers", () => {
  it("isCitable() requires a title", () => {
    expect(isCitable(base({ title: "Yes" }))).toBe(true);
    expect(isCitable(base({ title: "" }))).toBe(false);
  });
  it("effectiveYear() prefers explicit year, then publishedDate", () => {
    expect(effectiveYear(base({ year: "2020" }))).toBe("2020");
    expect(effectiveYear(base({ year: "", publishedDate: "2019-06-01" }))).toBe("2019");
    expect(effectiveYear(base({ year: "" }))).toBeUndefined();
  });
});

describe("validateSource", () => {
  it("flags missing title", () => {
    const issues = validateSource(base({ title: "" }));
    expect(issues.some((i) => i.field === "title")).toBe(true);
  });
  it("warns when there is no author or organization", () => {
    const issues = validateSource(base({ authors: [] }));
    expect(issues.some((i) => i.field === "author")).toBe(true);
  });
  it("does not warn about author when an organization is present", () => {
    const issues = validateSource(base({ authors: [], organization: "WHO" }));
    expect(issues.some((i) => i.field === "author")).toBe(false);
  });
  it("flags an author with a first name but no last name", () => {
    const issues = validateSource(base({ authors: [{ family: "", given: "Jane" }] }));
    expect(issues.some((i) => i.field === "author")).toBe(true);
  });
  it("recommends a journal name for journal articles", () => {
    const issues = validateSource(base({ type: "journal", container: "" }));
    expect(issues.some((i) => i.field === "container")).toBe(true);
  });
  it("recommends a URL for websites", () => {
    const issues = validateSource(base({ type: "website", url: "" }));
    expect(issues.some((i) => i.field === "url")).toBe(true);
  });
});
