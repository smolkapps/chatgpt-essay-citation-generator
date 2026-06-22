import { describe, expect, it } from "vitest";
import {
  STYLES,
  bibliographyToText,
  buildBibliography,
  formatAll,
  formatOne,
  signalFor,
  sortKey,
} from "../engine";
import type { Source } from "../types";

const src = (over: Partial<Source>): Source => ({
  id: Math.random().toString(36).slice(2),
  type: "book",
  title: "",
  authors: [],
  ...over,
});

describe("STYLES metadata", () => {
  it("exposes all three styles with the right list headings", () => {
    expect(STYLES.map((s) => s.id)).toEqual(["mla", "apa", "chicago"]);
    expect(STYLES.find((s) => s.id === "mla")?.listHeading).toBe("Works Cited");
    expect(STYLES.find((s) => s.id === "apa")?.listHeading).toBe("References");
    expect(STYLES.find((s) => s.id === "chicago")?.listHeading).toBe("Bibliography");
  });
});

describe("formatOne / formatAll dispatch", () => {
  const s = src({ authors: [{ family: "Smith", given: "John" }], title: "a book", year: "2020" });
  it("formatOne picks the right style", () => {
    expect(formatOne(s, "apa").inText).toBe("(Smith, 2020)");
    expect(formatOne(s, "mla").inText).toBe("(Smith)");
  });
  it("formatAll returns all three", () => {
    const all = formatAll(s);
    expect(all.mla.inText).toBe("(Smith)");
    expect(all.apa.inText).toBe("(Smith, 2020)");
    expect(all.chicago.footnote).toContain("Smith");
  });
});

describe("sortKey", () => {
  it("uses author family name, lowercased", () => {
    expect(sortKey(src({ authors: [{ family: "Zimmer", given: "A" }], title: "x" }))).toBe(
      "zimmer",
    );
  });
  it("ignores a leading article when sorting by title", () => {
    expect(sortKey(src({ title: "The Wind in the Willows" }))).toBe("wind in the willows");
    expect(sortKey(src({ title: "An Apple" }))).toBe("apple");
  });
  it("folds diacritics", () => {
    expect(sortKey(src({ authors: [{ family: "Élan", given: "A" }], title: "x" }))).toBe("elan");
  });
  it("uses the organization when there are no people", () => {
    expect(sortKey(src({ organization: "World Bank", title: "x" }))).toBe("world bank");
  });
});

describe("buildBibliography", () => {
  it("sorts alphabetically and skips untitled sources", () => {
    const sources = [
      src({ authors: [{ family: "Young", given: "A" }], title: "z", publisher: "P", year: "1" }),
      src({ authors: [{ family: "Adams", given: "B" }], title: "a", publisher: "P", year: "1" }),
      src({ title: "" }), // not citable -> dropped
      src({ authors: [{ family: "Müller", given: "C" }], title: "m", publisher: "P", year: "1" }),
    ];
    const bib = buildBibliography(sources, "mla");
    expect(bib).toHaveLength(3);
    expect(bib[0].text.startsWith("Adams")).toBe(true);
    expect(bib[1].text.startsWith("Müller")).toBe(true);
    expect(bib[2].text.startsWith("Young")).toBe(true);
  });

  it("is stable for entries that share a sort key", () => {
    const a = src({ id: "a", authors: [{ family: "Smith", given: "Ann" }], title: "first", publisher: "P", year: "1" });
    const b = src({ id: "b", authors: [{ family: "Smith", given: "Ben" }], title: "second", publisher: "P", year: "1" });
    const bib = buildBibliography([a, b], "apa");
    // both sort under "smith"; original order preserved
    expect(bib[0].source.id).toBe("a");
    expect(bib[1].source.id).toBe("b");
  });

  it("returns an empty list when nothing is citable", () => {
    expect(buildBibliography([src({ title: "" })], "chicago")).toEqual([]);
    expect(buildBibliography([], "chicago")).toEqual([]);
  });
});

describe("bibliographyToText", () => {
  it("joins entries with newlines", () => {
    const sources = [
      src({ authors: [{ family: "Adams", given: "B" }], title: "a", publisher: "P", year: "1" }),
      src({ authors: [{ family: "Young", given: "A" }], title: "z", publisher: "P", year: "1" }),
    ];
    const text = bibliographyToText(sources, "mla");
    expect(text.split("\n")).toHaveLength(2);
    expect(text.split("\n")[0].startsWith("Adams")).toBe(true);
  });
});

describe("signalFor", () => {
  const s = src({ authors: [{ family: "Smith", given: "J" }], title: "x" });
  it("returns the author signal per style", () => {
    expect(signalFor(s, "mla")).toBe("Smith");
    expect(signalFor(s, "apa")).toBe("Smith");
    expect(signalFor(s, "chicago")).toBe("Smith");
  });
});
