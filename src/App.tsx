import { useEffect, useMemo, useRef, useState } from "react";
import { SourceEditor } from "./components/SourceEditor";
import {
  STYLES,
  bibliographyToText,
  buildBibliography,
  formatOneAt,
} from "./lib/engine";
import { exampleSources } from "./lib/examples";
import {
  emptySource,
  loadSources,
  loadStyle,
  saveSources,
  saveStyle,
} from "./lib/store";
import type { CitationStyle, Source } from "./lib/types";
import { validateSource } from "./lib/util";

/** Copy text to the clipboard, with a fallback for older/insecure contexts. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function App() {
  const [sources, setSources] = useState<Source[]>(() => loadSources());
  const [style, setStyle] = useState<CitationStyle>(() => loadStyle());
  const [copied, setCopied] = useState<string | null>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  // Persist on change.
  useEffect(() => {
    saveSources(sources);
  }, [sources]);
  useEffect(() => {
    saveStyle(style);
  }, [style]);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const styleMeta = STYLES.find((s) => s.id === style)!;
  // Chicago notes-bibliography cites with footnotes, not parentheticals.
  const usesFootnotes = style === "chicago";

  const bibliography = useMemo(
    () => buildBibliography(sources, style),
    [sources, style],
  );

  const updateSource = (id: string, next: Source) =>
    setSources((prev) => prev.map((s) => (s.id === id ? next : s)));
  const removeSource = (id: string) =>
    setSources((prev) => prev.filter((s) => s.id !== id));
  const addSource = () => setSources((prev) => [...prev, emptySource()]);
  const loadExamples = () => setSources((prev) => [...prev, ...exampleSources()]);
  const clearAll = () => {
    const n = sources.length;
    if (
      window.confirm(
        `Remove ${n === 1 ? "your source" : `all ${n} sources`}? This cannot be undone.`,
      )
    ) {
      setSources([]);
    }
  };

  const flash = (key: string) => {
    setCopied(key);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(
      () => setCopied((c) => (c === key ? null : c)),
      1800,
    );
  };

  const copy = async (text: string, key: string) => {
    if (await copyToClipboard(text)) flash(key);
  };

  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: document.title,
          text: "Free citation & bibliography generator — MLA, APA, Chicago, and IEEE, entirely in your browser.",
          url,
        });
        return;
      } catch {
        // user dismissed the share sheet, or sharing failed — fall back
      }
    }
    await copy(url, "__share__");
  };

  const fullList = bibliographyToText(sources, style);

  const downloadList = () => {
    const heading = styleMeta.listHeading.toLowerCase().replace(/\s+/g, "-");
    const blob = new Blob([`${styleMeta.listHeading}\n\n${fullList}\n`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${heading}-${style}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Citation &amp; Bibliography Generator</h1>
          <p className="tagline">
            Format <strong>your own</strong> sources in MLA, APA, Chicago, and IEEE — with
            in-text citations. Everything runs in your browser; nothing is uploaded.
          </p>
        </div>
        <button type="button" className="btn" onClick={share}>
          {copied === "__share__" ? "Link copied!" : "Share this tool"}
        </button>
      </header>

      <aside className="notice" role="note">
        <strong>This is a citation tool, not an essay writer.</strong> It helps you cite the
        sources you have actually read. It does not write papers for you, and writing tools
        designed to produce work you submit as your own and to evade plagiarism detection are
        not part of this project.
      </aside>

      <section className="style-bar" aria-label="Citation style">
        <span className="style-bar__label" id="style-label">
          Style:
        </span>
        <div className="segmented" role="radiogroup" aria-labelledby="style-label">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={style === s.id}
              className={style === s.id ? "segmented__btn is-active" : "segmented__btn"}
              onClick={() => setStyle(s.id)}
            >
              {s.label}
              <small>{s.edition}</small>
            </button>
          ))}
        </div>
      </section>

      <main className="columns">
        <section className="col col--sources" aria-label="Your sources">
          <div className="col__head">
            <h2>Your sources ({sources.length})</h2>
            <div className="col__actions">
              {sources.length > 0 && (
                <button type="button" className="btn btn--danger" onClick={clearAll}>
                  Clear all
                </button>
              )}
              <button type="button" className="btn btn--primary" onClick={addSource}>
                + Add source
              </button>
            </div>
          </div>

          {sources.length === 0 && (
            <div className="empty-state">
              <p className="empty">
                No sources yet. Add the first reference you used — a book, journal article,
                web page, or newspaper article — and the formatted citation appears instantly.
              </p>
              <button type="button" className="btn" onClick={loadExamples}>
                Try it with example sources
              </button>
            </div>
          )}

          <ol className="source-list">
            {sources.map((s) => (
              <li key={s.id}>
                <SourceEditor
                  source={s}
                  issues={validateSource(s)}
                  onChange={(next) => updateSource(s.id, next)}
                  onRemove={() => removeSource(s.id)}
                />
              </li>
            ))}
          </ol>
        </section>

        <section className="col col--output" aria-label="Formatted citations">
          <div className="col__head">
            <h2>{styleMeta.listHeading}</h2>
            {bibliography.length > 0 && (
              <div className="col__actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => copy(fullList, "__all__")}
                >
                  {copied === "__all__" ? "Copied!" : "Copy all"}
                </button>
                <button type="button" className="btn" onClick={downloadList}>
                  Download .txt
                </button>
              </div>
            )}
          </div>

          {bibliography.length === 0 ? (
            <p className="empty">
              Add a source with at least a title to see it formatted here — as a
              sorted {styleMeta.listHeading} entry plus its{" "}
              {usesFootnotes ? "footnote" : "in-text citation"}.
            </p>
          ) : (
            <ul className="bib-list">
              {bibliography.map(({ source, text }, i) => {
                const formatted = formatOneAt(source, style, i + 1);
                return (
                  <li className="bib-item" key={source.id}>
                    <p className="bib-item__entry">{text}</p>
                    <div className="bib-item__intext">
                      <span className="bib-item__intext-label">
                        {usesFootnotes ? "Footnote:" : "In-text:"}
                      </span>
                      <code>{formatted.inText}</code>
                      {formatted.inTextNarrative && (
                        <>
                          <span className="bib-item__intext-label">Narrative:</span>
                          <code>
                            {style === "apa"
                              ? formatted.inTextNarrative
                              : `${formatted.inTextNarrative} (…)`}
                          </code>
                        </>
                      )}
                    </div>
                    <div className="bib-item__actions">
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={() => copy(text, `${source.id}-bib`)}
                      >
                        {copied === `${source.id}-bib` ? "Copied!" : "Copy entry"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={() => copy(formatted.inText, `${source.id}-it`)}
                      >
                        {copied === `${source.id}-it`
                          ? "Copied!"
                          : usesFootnotes
                            ? "Copy footnote"
                            : "Copy in-text"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {/* Announce copy feedback to screen readers without moving focus. */}
      <div role="status" aria-live="polite" className="visually-hidden">
        {copied === "__share__" ? "Link copied to clipboard" : copied ? "Copied to clipboard" : ""}
      </div>

      <footer className="app__footer">
        <p>
          Always check formatted citations against an authoritative guide
          (Purdue OWL, your style manual, your instructor). Citation styles have edge cases this
          tool does not cover. MIT-licensed; runs entirely offline.
        </p>
      </footer>
    </div>
  );
}
