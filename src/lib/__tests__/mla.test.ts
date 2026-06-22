import { describe, expect, it } from "vitest";
import { formatMLA, mlaAuthors, mlaBibliography, mlaInText, mlaSignal } from "../mla";
import type { Source } from "../types";

const src = (over: Partial<Source>): Source => ({
  id: "1",
  type: "book",
  title: "",
  authors: [],
  ...over,
});

describe("MLA author strings", () => {
  // mlaAuthors returns the raw author element; the terminating period is added
  // later by the bibliography assembler (ensurePeriod), so it is absent here.
  it("single author is inverted", () => {
    expect(mlaAuthors(src({ authors: [{ family: "Smith", given: "John" }] }))).toBe(
      "Smith, John",
    );
  });
  it("two authors: first inverted, second natural, joined with 'and'", () => {
    expect(
      mlaAuthors(
        src({
          authors: [
            { family: "Smith", given: "John" },
            { family: "Doe", given: "Jane" },
          ],
        }),
      ),
    ).toBe("Smith, John, and Jane Doe");
  });
  it("three or more authors use et al.", () => {
    expect(
      mlaAuthors(
        src({
          authors: [
            { family: "Smith", given: "John" },
            { family: "Doe", given: "Jane" },
            { family: "Roe", given: "Rae" },
          ],
        }),
      ),
    ).toBe("Smith, John, et al.");
  });
  it("falls back to organization when no people", () => {
    expect(mlaAuthors(src({ organization: "World Health Organization" }))).toBe(
      "World Health Organization",
    );
  });
});

describe("MLA bibliography", () => {
  it("formats a book: Author. Title. Publisher, Year.", () => {
    const out = mlaBibliography(
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

  it("formats a journal article with volume/issue/pages and a DOI location", () => {
    const out = mlaBibliography(
      src({
        type: "journal",
        authors: [{ family: "Lee", given: "Amy" }],
        title: "on memory",
        container: "Journal of Cognition",
        volume: "12",
        issue: "3",
        year: "2019",
        pages: "45-60",
        doi: "10.1000/xyz",
      }),
    );
    expect(out).toBe(
      "Lee, Amy. “On Memory.” Journal of Cognition, vol. 12, no. 3, 2019, pp. 45-60. https://doi.org/10.1000/xyz.",
    );
  });

  it("formats a website: location comma-joined to the container, scheme stripped, access date last", () => {
    const out = mlaBibliography(
      src({
        type: "website",
        authors: [],
        organization: "Purdue OWL",
        title: "MLA formatting", // acronym typed in caps is preserved by titleCase
        container: "Purdue Writing Lab",
        url: "https://owl.purdue.edu/mla",
        accessed: "2024-01-15",
      }),
    );
    expect(out).toBe(
      "Purdue OWL. “MLA Formatting.” Purdue Writing Lab, owl.purdue.edu/mla. Accessed 15 Jan. 2024.",
    );
  });

  it("cites by title when there is no author", () => {
    const out = mlaBibliography(
      src({ type: "book", title: "beowulf", publisher: "Penguin", year: "1999" }),
    );
    expect(out).toBe("Beowulf. Penguin, 1999.");
  });
});

describe("MLA in-text", () => {
  it("author + page", () => {
    expect(
      mlaInText(src({ authors: [{ family: "Smith", given: "J" }], pages: "42" })),
    ).toBe("(Smith 42)");
  });
  it("uses the first page of a range", () => {
    expect(
      mlaInText(src({ authors: [{ family: "Smith", given: "J" }], pages: "45-60" })),
    ).toBe("(Smith 45)");
  });
  it("two authors joined with 'and'", () => {
    expect(
      mlaInText(
        src({
          authors: [
            { family: "Smith", given: "J" },
            { family: "Doe", given: "J" },
          ],
          pages: "7",
        }),
      ),
    ).toBe("(Smith and Doe 7)");
  });
  it("no page -> author only", () => {
    expect(mlaInText(src({ authors: [{ family: "Smith", given: "J" }] }))).toBe("(Smith)");
  });
  it("no author -> shortened quoted title for an article", () => {
    expect(
      mlaSignal(src({ type: "journal", title: "the very long article title here indeed" })),
    ).toBe("“The Very Long Article”");
  });
});

describe("formatMLA bundle", () => {
  it("returns bibliography, inText, and a narrative signal", () => {
    const c = formatMLA(src({ authors: [{ family: "Smith", given: "J" }], title: "x", pages: "5" }));
    expect(c.bibliography).toContain("Smith");
    expect(c.inText).toBe("(Smith 5)");
    expect(c.inTextNarrative).toBe("Smith");
  });
});
