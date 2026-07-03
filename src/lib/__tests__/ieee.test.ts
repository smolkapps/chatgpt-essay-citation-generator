import { describe, expect, it } from "vitest";
import { formatIEEE, ieeeAuthors, ieeeBody, ieeeReference } from "../ieee";
import type { Source } from "../types";

const src = (over: Partial<Source>): Source => ({
  id: "1",
  type: "book",
  title: "",
  authors: [],
  ...over,
});

describe("IEEE author strings", () => {
  it("single author: initials before surname", () => {
    expect(ieeeAuthors(src({ authors: [{ family: "Gladwell", given: "Malcolm" }] }))).toBe(
      "M. Gladwell",
    );
  });
  it("two authors joined with 'and'", () => {
    expect(
      ieeeAuthors(
        src({
          authors: [
            { family: "Smith", given: "John" },
            { family: "Doe", given: "Jane" },
          ],
        }),
      ),
    ).toBe("J. Smith and J. Doe");
  });
  it("3–6 authors use a serial comma before 'and'", () => {
    expect(
      ieeeAuthors(
        src({
          authors: [
            { family: "Smith", given: "John" },
            { family: "Doe", given: "Jane" },
            { family: "Roe", given: "Rae" },
          ],
        }),
      ),
    ).toBe("J. Smith, J. Doe, and R. Roe");
  });
  it("7+ authors collapse to first author et al.", () => {
    const authors = Array.from({ length: 7 }, (_, i) => ({ family: `L${i}`, given: "F" }));
    expect(ieeeAuthors(src({ authors }))).toBe("F. L0 et al.");
  });
});

describe("IEEE reference list entries", () => {
  it("book: [n] F. Last, Title. Publisher, Year.", () => {
    const out = ieeeReference(
      src({
        type: "book",
        authors: [{ family: "Gladwell", given: "Malcolm" }],
        title: "the tipping point",
        publisher: "Little, Brown",
        year: "2000",
      }),
      1,
    );
    expect(out).toBe("[1] M. Gladwell, The Tipping Point. Little, Brown, 2000.");
  });

  it('article: [n] F. Last, "Title," Journal, vol. X, no. Y, pp. Z–Z, Year.', () => {
    const out = ieeeReference(
      src({
        type: "journal",
        authors: [{ family: "Lee", given: "Amy" }],
        title: "on memory",
        container: "Journal of Cognition",
        volume: "12",
        issue: "3",
        pages: "45-60",
        year: "2019",
      }),
      1,
    );
    // page range uses an en-dash (U+2013), not a hyphen
    expect(out).toBe(
      "[1] A. Lee, “On Memory,” Journal of Cognition, vol. 12, no. 3, pp. 45–60, 2019.",
    );
  });

  it('single-page article uses "p.", not "pp."', () => {
    const out = ieeeReference(
      src({
        type: "journal",
        authors: [{ family: "Lee", given: "Amy" }],
        title: "on memory",
        container: "Journal of Cognition",
        volume: "12",
        issue: "3",
        pages: "B7",
        year: "2019",
      }),
      1,
    );
    expect(out).toBe(
      "[1] A. Lee, “On Memory,” Journal of Cognition, vol. 12, no. 3, p. B7, 2019.",
    );
  });

  it('article with a full date renders the abbreviated month: "Mar. 2021"', () => {
    const out = ieeeReference(
      src({
        type: "journal",
        authors: [{ family: "Lee", given: "Amy" }],
        title: "on memory",
        container: "Journal of Cognition",
        volume: "12",
        issue: "3",
        pages: "45-60",
        publishedDate: "2021-03-05",
      }),
      2,
    );
    expect(out).toBe(
      "[2] A. Lee, “On Memory,” Journal of Cognition, vol. 12, no. 3, pp. 45–60, Mar. 2021.",
    );
  });

  it("the bracketed number reflects the position passed by the assembler", () => {
    const book = src({
      type: "book",
      authors: [{ family: "Gladwell", given: "Malcolm" }],
      title: "the tipping point",
      publisher: "Little, Brown",
      year: "2000",
    });
    // body has no bracket; the number is prepended by ieeeReference
    expect(ieeeBody(book).startsWith("[")).toBe(false);
    expect(ieeeReference(book, 5)).toBe(
      "[5] M. Gladwell, The Tipping Point. Little, Brown, 2000.",
    );
  });
});

describe("formatIEEE bundle", () => {
  it("returns a numbered reference and a bracketed in-text; no narrative", () => {
    const c = formatIEEE(
      src({
        type: "book",
        authors: [{ family: "Gladwell", given: "Malcolm" }],
        title: "the tipping point",
        publisher: "Little, Brown",
        year: "2000",
      }),
    );
    expect(c.bibliography).toBe("[1] M. Gladwell, The Tipping Point. Little, Brown, 2000.");
    expect(c.inText).toBe("[1]");
    expect(c.inTextNarrative).toBeUndefined();
  });
});
