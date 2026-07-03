import { describe, expect, it } from "vitest";
import {
  chicagoAdInText,
  chicagoAdNarrative,
  chicagoAdReference,
  formatChicagoAd,
} from "../chicago-ad";
import type { Source } from "../types";

const src = (over: Partial<Source>): Source => ({
  id: "1",
  type: "book",
  title: "",
  authors: [],
  ...over,
});

describe("Chicago author-date reference list", () => {
  it("book: Last, First. Year. Title. Publisher.", () => {
    const out = chicagoAdReference(
      src({
        type: "book",
        authors: [{ family: "Gladwell", given: "Malcolm" }],
        title: "the tipping point",
        publisher: "Little, Brown",
        year: "2000",
      }),
    );
    expect(out).toBe("Gladwell, Malcolm. 2000. The Tipping Point. Little, Brown.");
  });

  it('article: Last, First. Year. "Title." Journal Volume (Issue): pages. DOI.', () => {
    const out = chicagoAdReference(
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
      "Lee, Amy. 2019. “On Memory.” Journal of Cognition 12 (3): 45-60. https://doi.org/10.1000/xyz.",
    );
  });

  it("uses the shared Chicago author list (two authors: Last, First, and First Last)", () => {
    const out = chicagoAdReference(
      src({
        type: "book",
        authors: [
          { family: "Smith", given: "John" },
          { family: "Doe", given: "Jane" },
        ],
        title: "a study",
        publisher: "Pub",
        year: "2021",
      }),
    );
    expect(out).toBe("Smith, John, and Jane Doe. 2021. A Study. Pub.");
  });

  it("missing year becomes n.d.", () => {
    const out = chicagoAdReference(
      src({
        type: "book",
        authors: [{ family: "X", given: "Y" }],
        title: "untitled",
        publisher: "Pub",
      }),
    );
    expect(out).toBe("X, Y. n.d. Untitled. Pub.");
  });
});

describe("Chicago author-date in-text", () => {
  it("(Author Year) with no comma before the year", () => {
    expect(
      chicagoAdInText(
        src({ authors: [{ family: "Gladwell", given: "Malcolm" }], year: "2000" }),
      ),
    ).toBe("(Gladwell 2000)");
  });
  it("(Author Year, page) uses the first page of a range", () => {
    expect(
      chicagoAdInText(
        src({
          authors: [{ family: "Lee", given: "Amy" }],
          year: "2019",
          pages: "45-60",
        }),
      ),
    ).toBe("(Lee 2019, 45)");
  });
  it("narrative form: Author (Year)", () => {
    expect(
      chicagoAdNarrative(
        src({ authors: [{ family: "Gladwell", given: "Malcolm" }], year: "2000" }),
      ),
    ).toBe("Gladwell (2000)");
  });
});

describe("formatChicagoAd bundle", () => {
  it("returns reference, parenthetical in-text, and narrative", () => {
    const c = formatChicagoAd(
      src({
        type: "book",
        authors: [{ family: "Gladwell", given: "Malcolm" }],
        title: "the tipping point",
        publisher: "Little, Brown",
        year: "2000",
      }),
    );
    expect(c.bibliography).toBe(
      "Gladwell, Malcolm. 2000. The Tipping Point. Little, Brown.",
    );
    expect(c.inText).toBe("(Gladwell 2000)");
    expect(c.inTextNarrative).toBe("Gladwell (2000)");
  });
});
