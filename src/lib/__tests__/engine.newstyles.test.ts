// Integration tests proving the two new styles are wired into the SAME
// engine pipeline (STYLES metadata, formatOne/formatAll dispatch,
// buildBibliography, signalFor) as MLA/APA/Chicago — not a parallel path.
import { describe, expect, it } from "vitest";
import {
  STYLES,
  buildBibliography,
  bibliographyToText,
  formatAll,
  formatOne,
  signalFor,
} from "../engine";
import { loadStyle, saveStyle, MemoryStore } from "../store";
import type { Source } from "../types";

const src = (over: Partial<Source>): Source => ({
  id: Math.random().toString(36).slice(2),
  type: "book",
  title: "",
  authors: [],
  ...over,
});

const book = (over: Partial<Source> = {}): Source =>
  src({
    type: "book",
    authors: [{ family: "Gladwell", given: "Malcolm" }],
    title: "the tipping point",
    publisher: "Little, Brown",
    year: "2000",
    ...over,
  });

describe("STYLES metadata includes the new styles", () => {
  it("exposes all five styles in order", () => {
    expect(STYLES.map((s) => s.id)).toEqual([
      "mla",
      "apa",
      "chicago",
      "chicago-ad",
      "ieee",
    ]);
  });
  it("gives the new styles the right reference-list headings", () => {
    expect(STYLES.find((s) => s.id === "chicago-ad")?.listHeading).toBe("References");
    expect(STYLES.find((s) => s.id === "ieee")?.listHeading).toBe("References");
  });
});

describe("formatOne / formatAll dispatch to the new styles", () => {
  it("formatOne routes chicago-ad and ieee through the shared entry point", () => {
    expect(formatOne(book(), "chicago-ad").bibliography).toBe(
      "Gladwell, Malcolm. 2000. The Tipping Point. Little, Brown.",
    );
    expect(formatOne(book(), "ieee").bibliography).toBe(
      "[1] M. Gladwell, The Tipping Point. Little, Brown, 2000.",
    );
  });
  it("formatAll returns entries for all five styles", () => {
    const all = formatAll(book());
    expect(Object.keys(all).sort()).toEqual(
      ["apa", "chicago", "chicago-ad", "ieee", "mla"].sort(),
    );
    expect(all["chicago-ad"].inText).toBe("(Gladwell 2000)");
    expect(all.ieee.inText).toBe("[1]");
  });
});

describe("buildBibliography numbers IEEE by sorted position", () => {
  it("assigns [1], [2], … in alphabetical (list) order", () => {
    const sources = [
      book({ authors: [{ family: "Young", given: "Ada" }], title: "the zebra papers" }),
      book({ authors: [{ family: "Adams", given: "Ben" }], title: "an aardvark study" }),
    ];
    const text = bibliographyToText(sources, "ieee");
    const lines = text.split("\n");
    // Adams sorts first -> [1]; Young second -> [2]. The bracket number is the
    // list position, assigned after the alphabetical sort.
    expect(lines[0]).toBe("[1] B. Adams, An Aardvark Study. Little, Brown, 2000.");
    expect(lines[1]).toBe("[2] A. Young, The Zebra Papers. Little, Brown, 2000.");
  });

  it("chicago-ad flows through buildBibliography and sorts like the others", () => {
    const bib = buildBibliography(
      [
        book({ authors: [{ family: "Young", given: "A" }], title: "z" }),
        book({ authors: [{ family: "Adams", given: "B" }], title: "a" }),
      ],
      "chicago-ad",
    );
    expect(bib[0].text.startsWith("Adams, B. 2000.")).toBe(true);
    expect(bib[1].text.startsWith("Young, A. 2000.")).toBe(true);
  });
});

describe("signalFor and store support the new styles", () => {
  it("signalFor returns a per-style signal without throwing", () => {
    const s = book();
    expect(signalFor(s, "chicago-ad")).toBe("(Gladwell 2000)");
    expect(signalFor(s, "ieee")).toBe("[n]");
  });
  it("store round-trips the new styles instead of falling back to mla", () => {
    const store = new MemoryStore();
    saveStyle("chicago-ad", store);
    expect(loadStyle(store)).toBe("chicago-ad");
    saveStyle("ieee", store);
    expect(loadStyle(store)).toBe("ieee");
  });
});
