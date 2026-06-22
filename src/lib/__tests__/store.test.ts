import { describe, expect, it } from "vitest";
import {
  MemoryStore,
  emptySource,
  loadSources,
  loadStyle,
  newId,
  parseSources,
  saveSources,
  saveStyle,
} from "../store";
import type { Source } from "../types";

const sample = (over: Partial<Source> = {}): Source => ({
  id: "abc",
  type: "book",
  title: "A Book",
  authors: [{ family: "Smith", given: "Jane" }],
  publisher: "Pub",
  year: "2020",
  ...over,
});

describe("newId", () => {
  it("produces unique non-empty ids", () => {
    const a = newId();
    const b = newId();
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});

describe("emptySource", () => {
  it("creates a fresh source with an id and one blank author", () => {
    const s = emptySource("journal");
    expect(s.id.length).toBeGreaterThan(0);
    expect(s.type).toBe("journal");
    expect(s.title).toBe("");
    expect(s.authors).toEqual([{ family: "", given: "" }]);
  });
});

describe("parseSources error paths", () => {
  it("returns [] for null / empty", () => {
    expect(parseSources(null)).toEqual([]);
    expect(parseSources("")).toEqual([]);
  });
  it("returns [] for invalid JSON", () => {
    expect(parseSources("{not json")).toEqual([]);
  });
  it("returns [] when the top level is not an array", () => {
    expect(parseSources(JSON.stringify({ id: "x" }))).toEqual([]);
  });
  it("drops items missing required fields", () => {
    const raw = JSON.stringify([
      { id: "ok", type: "book", title: "Fine", authors: [] },
      { type: "book", title: "No id" },
      { id: "x", type: "magazine", title: "Bad type" },
      { id: "y", type: "book" }, // no title
      "a string",
      null,
      42,
    ]);
    const out = parseSources(raw);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("ok");
  });
  it("coerces partial author objects and ignores non-objects", () => {
    const raw = JSON.stringify([
      {
        id: "z",
        type: "journal",
        title: "T",
        authors: [{ family: "Doe" }, "nope", { given: "OnlyFirst" }, null],
        volume: "1",
        garbageField: { nested: true },
      },
    ]);
    const out = parseSources(raw);
    expect(out).toHaveLength(1);
    expect(out[0].authors).toEqual([
      { family: "Doe", given: undefined, suffix: undefined },
      { family: "", given: "OnlyFirst", suffix: undefined },
    ]);
    expect(out[0].volume).toBe("1");
    // unknown fields are not carried over
    expect((out[0] as unknown as Record<string, unknown>).garbageField).toBeUndefined();
  });
  it("ignores non-string optional fields", () => {
    const raw = JSON.stringify([
      { id: "n", type: "book", title: "T", authors: [], year: 2020, pages: ["a"] },
    ]);
    const out = parseSources(raw);
    expect(out[0].year).toBeUndefined();
    expect(out[0].pages).toBeUndefined();
  });
});

describe("round-trip with an injected store", () => {
  it("saves and loads sources", () => {
    const store = new MemoryStore();
    const sources = [sample(), sample({ id: "def", title: "Second" })];
    saveSources(sources, store);
    const loaded = loadSources(store);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].title).toBe("A Book");
    expect(loaded[1].id).toBe("def");
  });

  it("defaults the style to mla and round-trips a valid style", () => {
    const store = new MemoryStore();
    expect(loadStyle(store)).toBe("mla");
    saveStyle("chicago", store);
    expect(loadStyle(store)).toBe("chicago");
  });

  it("falls back to mla for a corrupt stored style", () => {
    const store = new MemoryStore();
    store.setItem("citegen.style.v1", "harvard");
    expect(loadStyle(store)).toBe("mla");
  });
});

describe("MemoryStore", () => {
  it("behaves like a key-value store", () => {
    const s = new MemoryStore();
    expect(s.getItem("k")).toBeNull();
    s.setItem("k", "v");
    expect(s.getItem("k")).toBe("v");
    s.removeItem("k");
    expect(s.getItem("k")).toBeNull();
  });
});
