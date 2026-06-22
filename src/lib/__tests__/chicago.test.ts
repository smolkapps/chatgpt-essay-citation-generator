import { describe, expect, it } from "vitest";
import {
  chicagoBibAuthors,
  chicagoBibliography,
  chicagoFootnote,
  chicagoNoteAuthors,
  formatChicago,
} from "../chicago";
import type { Source } from "../types";

const src = (over: Partial<Source>): Source => ({
  id: "1",
  type: "book",
  title: "",
  authors: [],
  ...over,
});

describe("Chicago bibliography authors", () => {
  it("single: Last, First", () => {
    expect(chicagoBibAuthors(src({ authors: [{ family: "Smith", given: "John" }] }))).toBe(
      "Smith, John",
    );
  });
  it("two: Last, First, and First Last", () => {
    expect(
      chicagoBibAuthors(
        src({
          authors: [
            { family: "Smith", given: "John" },
            { family: "Doe", given: "Jane" },
          ],
        }),
      ),
    ).toBe("Smith, John, and Jane Doe");
  });
  it("three: full serial list", () => {
    expect(
      chicagoBibAuthors(
        src({
          authors: [
            { family: "Smith", given: "John" },
            { family: "Doe", given: "Jane" },
            { family: "Roe", given: "Rae" },
          ],
        }),
      ),
    ).toBe("Smith, John, Jane Doe, and Rae Roe");
  });
  it("11+ authors: first 7 then et al.", () => {
    // family="A{i}", given="B": first author inverted ("A0, B"),
    // the rest in natural order ("B A1", "B A2", …).
    const authors = Array.from({ length: 12 }, (_, i) => ({ family: `A${i}`, given: "B" }));
    const out = chicagoBibAuthors(src({ authors }));
    expect(out.startsWith("A0, B")).toBe(true);
    expect(out.endsWith("et al.")).toBe(true);
    expect(out).toContain("B A6"); // 7th author present (natural order)
    expect(out).not.toContain("B A7"); // 8th elided
  });
});

describe("Chicago footnote authors", () => {
  it("4+ authors: First Last et al.", () => {
    expect(
      chicagoNoteAuthors(
        src({
          authors: [
            { family: "Smith", given: "John" },
            { family: "Doe", given: "Jane" },
            { family: "Roe", given: "Rae" },
            { family: "Poe", given: "Pat" },
          ],
        }),
      ),
    ).toBe("John Smith et al.");
  });
});

describe("Chicago bibliography (notes-bibliography)", () => {
  it("book: Last, First. Title. Publisher, Year.", () => {
    const out = chicagoBibliography(
      src({
        type: "book",
        authors: [{ family: "Gladwell", given: "Malcolm" }],
        title: "the tipping point",
        publisher: "Little, Brown",
        year: "2000",
      }),
    );
    expect(out).toBe("Gladwell, Malcolm. The Tipping Point. Little, Brown, 2000.");
  });

  it("journal: title in quotes, journal vol, no. n (Year): pages.", () => {
    const out = chicagoBibliography(
      src({
        type: "journal",
        authors: [{ family: "Lee", given: "Amy" }],
        title: "on memory",
        container: "Journal of Cognition",
        volume: "12",
        issue: "3",
        year: "2019",
        pages: "45-60",
      }),
    );
    expect(out).toBe(
      "Lee, Amy. “On Memory.” Journal of Cognition 12, no. 3 (2019): 45-60.",
    );
  });
});

describe("Chicago footnotes", () => {
  it("book footnote: n. First Last, Title (Publisher, Year), page.", () => {
    const out = chicagoFootnote(
      src({
        type: "book",
        authors: [{ family: "Gladwell", given: "Malcolm" }],
        title: "the tipping point",
        publisher: "Little, Brown",
        year: "2000",
        pages: "12-15",
      }),
      1,
    );
    expect(out).toBe("1. Malcolm Gladwell, The Tipping Point (Little, Brown, 2000), 12.");
  });

  it("journal footnote uses the single cited page, not the range", () => {
    const out = chicagoFootnote(
      src({
        type: "journal",
        authors: [{ family: "Lee", given: "Amy" }],
        title: "on memory",
        container: "Journal of Cognition",
        volume: "12",
        issue: "3",
        year: "2019",
        pages: "45-60",
      }),
      3,
    );
    expect(out).toBe(
      "3. Amy Lee, “On Memory,” Journal of Cognition 12, no. 3 (2019): 45.",
    );
  });
});

describe("formatChicago bundle", () => {
  it("exposes the footnote as both inText and footnote (NB has no parenthetical)", () => {
    const c = formatChicago(
      src({
        type: "book",
        authors: [{ family: "Smith", given: "Jane" }],
        title: "a book",
        publisher: "Pub",
        year: "2020",
      }),
    );
    expect(c.footnote).toBe(c.inText);
    expect(c.footnote).toBe("1. Jane Smith, A Book (Pub, 2020).");
    expect(c.inTextNarrative).toBeUndefined();
  });
});
