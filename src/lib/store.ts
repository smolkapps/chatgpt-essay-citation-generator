// Local persistence for the user's source list and chosen style.
//
// This app is deliberately local-only: a student's working bibliography lives
// in their browser's localStorage, never on a server. The store is a thin,
// well-tested wrapper so the React layer never touches localStorage directly
// and so the logic can be unit-tested against an in-memory storage shim.

import type { CitationStyle, Source } from "./types";

const SOURCES_KEY = "citegen.sources.v1";
const STYLE_KEY = "citegen.style.v1";

/** The minimal storage surface we depend on (a subset of the Web Storage API). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** An in-memory store, used as a fallback and in tests. */
export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/**
 * Resolve a usable storage backend. Returns `window.localStorage` when it is
 * available AND writable (private-mode Safari throws on write), else an
 * in-memory store so the app still runs without persistence.
 */
export function resolveStore(): KeyValueStore {
  try {
    if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
      const ls = (globalThis as { localStorage: KeyValueStore }).localStorage;
      const probe = "__citegen_probe__";
      ls.setItem(probe, "1");
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    // fall through to memory
  }
  return new MemoryStore();
}

/** Generate a reasonably unique id without pulling in a uuid dependency. */
export function newId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const VALID_STYLES: ReadonlySet<string> = new Set<CitationStyle>([
  "mla",
  "apa",
  "chicago",
  "chicago-ad",
  "ieee",
]);
const VALID_TYPES: ReadonlySet<string> = new Set(["book", "journal", "website", "newspaper"]);

/**
 * Parse and re-validate sources loaded from storage. Anything malformed is
 * dropped rather than allowed to crash the app — persisted data can be stale
 * or hand-edited.
 */
export function parseSources(raw: string | null): Source[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: Source[] = [];
  for (const item of data) {
    const s = coerceSource(item);
    if (s) out.push(s);
  }
  return out;
}

function coerceSource(item: unknown): Source | null {
  if (typeof item !== "object" || item === null) return null;
  const o = item as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0) return null;
  if (typeof o.type !== "string" || !VALID_TYPES.has(o.type)) return null;
  if (typeof o.title !== "string") return null;
  const authors = Array.isArray(o.authors)
    ? o.authors
        .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
        .map((a) => ({
          family: typeof a.family === "string" ? a.family : "",
          given: typeof a.given === "string" ? a.given : undefined,
          suffix: typeof a.suffix === "string" ? a.suffix : undefined,
        }))
    : [];
  const str = (k: string): string | undefined =>
    typeof o[k] === "string" ? (o[k] as string) : undefined;
  return {
    id: o.id,
    type: o.type as Source["type"],
    title: o.title,
    authors,
    organization: str("organization"),
    container: str("container"),
    year: str("year"),
    publisher: str("publisher"),
    volume: str("volume"),
    issue: str("issue"),
    pages: str("pages"),
    url: str("url"),
    doi: str("doi"),
    accessed: str("accessed"),
    publishedDate: str("publishedDate"),
  };
}

export function loadSources(store: KeyValueStore = resolveStore()): Source[] {
  return parseSources(store.getItem(SOURCES_KEY));
}

export function saveSources(sources: Source[], store: KeyValueStore = resolveStore()): void {
  store.setItem(SOURCES_KEY, JSON.stringify(sources));
}

export function loadStyle(store: KeyValueStore = resolveStore()): CitationStyle {
  const v = store.getItem(STYLE_KEY);
  return v && VALID_STYLES.has(v) ? (v as CitationStyle) : "mla";
}

export function saveStyle(style: CitationStyle, store: KeyValueStore = resolveStore()): void {
  store.setItem(STYLE_KEY, style);
}

/** A fresh, empty source with a new id — the default for "add source". */
export function emptySource(type: Source["type"] = "book"): Source {
  return { id: newId(), type, title: "", authors: [{ family: "", given: "" }] };
}
