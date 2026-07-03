import { useEffect, useMemo, useState } from "react";
import { SourceEditor } from "./components/SourceEditor";
import {
  STYLES,
  bibliographyToText,
  buildBibliography,
  formatOne,
} from "./lib/engine";
import {
  emptySource,
  loadSources,
  loadStyle,
  saveSources,
  saveStyle,
} from "./lib/store";
import type { CitationStyle, Source } from "./lib/types";
import { validateSource } from "./lib/util";

export default function App() {
  const [sources, setSources] = useState<Source[]>(() => loadSources());
  const [style, setStyle] = useState<CitationStyle>(() => loadStyle());
  const [copied, setCopied] = useState<string | null>(null);

  // Persist on change.
  useEffect(() => {
    saveSources(sources);
  }, [sources]);
  useEffect(() => {
    saveStyle(style);
  }, [style]);

  const styleMeta = STYLES.find((s) => s.id === style)!;

  const bibliography = useMemo(
    () => buildBibliography(sources, style),
    [sources, style],
  );

  const updateSource = (id: string, next: Source) =>
    setSources((prev) => prev.map((s) => (s.id === id ? next : s)));
  const removeSource = (id: string) =>
    setSources((prev) => prev.filter((s) => s.id !== id));
  const addSource = () => setSources((prev) => [...prev, emptySource()]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      setCopied(null);
    }
  };

  const fullList = bibliographyToText(sources, style);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Citation &amp; Bibliography Generator</h1>
        <p className="tagline">
          Format <strong>your own</strong> sources in MLA, APA, Chicago, and IEEE — with
          in-text citations. Everything runs in your browser; nothing is uploaded.
        </p>
      </header>

      <aside className="notice" role="note">
        <strong>This is a citation tool, not an essay writer.</strong> It helps you cite the
        sources you have actually read. It does not write papers for you, and writing tools
        designed to produce work you submit as your own and to evade plagiarism detection are
        not part of this project.
      </aside>

      <section className="style-bar" aria-label="Citation style">
        <span className="style-bar__label">Style:</span>
        <div className="segmented" role="radiogroup" aria-label="Citation style">
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
            <button type="button" className="btn btn--primary" onClick={addSource}>
              + Add source
            </button>
          </div>

          {sources.length === 0 && (
            <p className="empty">
              No sources yet. Click <em>Add source</em> to enter the first reference you used.
            </p>
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
              <button
                type="button"
                className="btn"
                onClick={() => copy(fullList, "__all__")}
              >
                {copied === "__all__" ? "Copied!" : "Copy all"}
              </button>
            )}
          </div>

          {bibliography.length === 0 ? (
            <p className="empty">
              Add a source with at least a title to see it formatted here.
            </p>
          ) : (
            <ul className="bib-list">
              {bibliography.map(({ source, text }) => {
                const formatted = formatOne(source, style);
                return (
                  <li className="bib-item" key={source.id}>
                    <p className="bib-item__entry">{text}</p>
                    <div className="bib-item__intext">
                      <span className="bib-item__intext-label">In-text:</span>
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
                        {copied === `${source.id}-it` ? "Copied!" : "Copy in-text"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

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
