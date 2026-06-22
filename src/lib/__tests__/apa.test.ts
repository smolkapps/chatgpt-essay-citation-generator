import { describe, expect, it } from "vitest";
import { apaAuthors, apaInText, apaNarrative, apaReference, formatAPA } from "../apa";
import type { Source } from "../types";

const src = (over: Partial<Source>): Source => ({
  id: "1",
  type: "book",
  title: "",
  authors: [],
  ...over,
});

describe("APA author strings", () => {
  it("single author: Family, I.", () => {
    expect(apaAuthors(src({ authors: [{ family: "Smith", given: "John" }] }))).toBe(
      "Smith, J.",
    );
  });
  it("two authors joined with ampersand", () => {
    expect(
      apaAuthors(
        src({
          authors: [
            { family: "Smith", given: "John" },
            { family: "Doe", given: "Jane" },
          ],
        }),
      ),
    ).toBe("Smith, J., & Doe, J.");
  });
  it("three authors: serial list with ampersand before last", () => {
    expect(
      apaAuthors(
        src({
          authors: [
            { family: "Smith", given: "John" },
            { family: "Doe", given: "Jane" },
            { family: "Roe", given: "Rae" },
          ],
        }),
      ),
    ).toBe("Smith, J., Doe, J., & Roe, R.");
  });
  it("21+ authors: first 19, ellipsis, final author", () => {
    const authors = Array.from({ length: 22 }, (_, i) => ({
      family: `A${i}`,
      given: "B",
    }));
    const out = apaAuthors(src({ authors }));
    expect(out).toContain("...");
    expect(out.endsWith("A21, B.")).toBe(true);
    // 19 listed + final, but not the 20th/21st by name (those are elided).
    expect(out).not.toContain("A20, B.,");
  });
});

describe("APA reference list entries", () => {
  it("book: Author. (Year). Title. Publisher.", () => {
    const out = apaReference(
      src({
        type: "book",
        authors: [{ family: "Gladwell", given: "Malcolm" }],
        title: "The Tipping Point",
        publisher: "Little, Brown",
        year: "2000",
      }),
    );
    expect(out).toBe("Gladwell, M. (2000). The tipping point. Little, Brown.");
  });

  it("journal: sentence-case title, italic journal, Volume(Issue), pages, DOI", () => {
    const out = apaReference(
      src({
        type: "journal",
        authors: [{ family: "Lee", given: "Amy" }],
        title: "On memory and forgetting",
        container: "journal of cognition",
        volume: "12",
        issue: "3",
        pages: "45-60",
        year: "2019",
        doi: "10.1000/xyz",
      }),
    );
    expect(out).toBe(
      "Lee, A. (2019). On memory and forgetting. Journal of Cognition, 12(3), 45-60. https://doi.org/10.1000/xyz",
    );
  });

  it("missing year becomes (n.d.)", () => {
    const out = apaReference(
      src({ type: "book", authors: [{ family: "X", given: "Y" }], title: "Untitled" }),
    );
    expect(out).toBe("X, Y. (n.d.). Untitled.");
  });

  it("website uses the full publication date when present", () => {
    const out = apaReference(
      src({
        type: "website",
        organization: "CDC",
        title: "Handwashing facts",
        container: "Centers for Disease Control",
        url: "https://cdc.gov/handwashing",
        publishedDate: "2021-03-05",
      }),
    );
    expect(out).toBe(
      "CDC. (2021, March 5). Handwashing facts. Centers for Disease Control. https://cdc.gov/handwashing",
    );
  });
});

describe("APA in-text", () => {
  it("(Author, Year)", () => {
    expect(
      apaInText(src({ authors: [{ family: "Smith", given: "J" }], year: "2020" })),
    ).toBe("(Smith, 2020)");
  });
  it("(Author, Year, p. X) with a page", () => {
    expect(
      apaInText(
        src({ authors: [{ family: "Smith", given: "J" }], year: "2020", pages: "42" }),
      ),
    ).toBe("(Smith, 2020, p. 42)");
  });
  it("two authors use & inside parentheses, and in narrative", () => {
    const s = src({
      authors: [
        { family: "Smith", given: "J" },
        { family: "Doe", given: "J" },
      ],
      year: "2020",
    });
    expect(apaInText(s)).toBe("(Smith & Doe, 2020)");
    expect(apaNarrative(s)).toBe("Smith and Doe (2020)");
  });
  it("3+ authors collapse to et al.", () => {
    const s = src({
      authors: [
        { family: "Smith", given: "J" },
        { family: "Doe", given: "J" },
        { family: "Roe", given: "R" },
      ],
      year: "2020",
    });
    expect(apaInText(s)).toBe("(Smith et al., 2020)");
  });
  it("no date -> n.d. in-text", () => {
    expect(apaInText(src({ authors: [{ family: "Smith", given: "J" }] }))).toBe(
      "(Smith, n.d.)",
    );
  });
});

describe("formatAPA bundle", () => {
  it("returns reference, inText, and narrative", () => {
    const c = formatAPA(
      src({ authors: [{ family: "Smith", given: "J" }], title: "x", year: "2020" }),
    );
    expect(c.bibliography).toContain("Smith, J. (2020).");
    expect(c.inText).toBe("(Smith, 2020)");
    expect(c.inTextNarrative).toBe("Smith (2020)");
  });
});
