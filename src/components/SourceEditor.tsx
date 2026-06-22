import { useId } from "react";
import type { Person, Source, SourceType, ValidationIssue } from "../lib/types";

interface Props {
  source: Source;
  issues: ValidationIssue[];
  onChange: (next: Source) => void;
  onRemove: () => void;
}

const TYPE_OPTIONS: ReadonlyArray<{ value: SourceType; label: string }> = [
  { value: "book", label: "Book" },
  { value: "journal", label: "Journal article" },
  { value: "website", label: "Web page" },
  { value: "newspaper", label: "Newspaper article" },
];

/** Which optional fields make sense for each source type. */
function fieldsFor(type: SourceType): ReadonlySet<keyof Source> {
  const common = new Set<keyof Source>(["title", "year"]);
  switch (type) {
    case "book":
      return new Set([...common, "publisher"]);
    case "journal":
      return new Set([...common, "container", "volume", "issue", "pages", "doi", "url"]);
    case "newspaper":
      return new Set([...common, "container", "pages", "publishedDate", "url"]);
    case "website":
      return new Set([...common, "container", "url", "publishedDate", "accessed"]);
  }
}

export function SourceEditor({ source, issues, onChange, onRemove }: Props) {
  const baseId = useId();
  const show = fieldsFor(source.type);

  const set = <K extends keyof Source>(key: K, value: Source[K]) =>
    onChange({ ...source, [key]: value });

  const setAuthor = (i: number, patch: Partial<Person>) => {
    const authors = source.authors.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    onChange({ ...source, authors });
  };
  const addAuthor = () =>
    onChange({ ...source, authors: [...source.authors, { family: "", given: "" }] });
  const removeAuthor = (i: number) =>
    onChange({ ...source, authors: source.authors.filter((_, idx) => idx !== i) });

  const issueFor = (field: ValidationIssue["field"]) =>
    issues.find((x) => x.field === field)?.message;

  return (
    <fieldset className="source-editor" data-testid="source-editor">
      <div className="source-editor__head">
        <label className="field field--type">
          <span>Source type</span>
          <select
            aria-label="Source type"
            value={source.type}
            onChange={(e) => set("type", e.target.value as SourceType)}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--danger"
          aria-label="Remove this source"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>

      <fieldset className="authors">
        <legend>Authors</legend>
        {source.authors.map((a, i) => (
          <div className="author-row" key={`${baseId}-author-${i}`}>
            <input
              aria-label={`Author ${i + 1} last name`}
              placeholder="Last name"
              value={a.family}
              onChange={(e) => setAuthor(i, { family: e.target.value })}
            />
            <input
              aria-label={`Author ${i + 1} first name`}
              placeholder="First name(s)"
              value={a.given ?? ""}
              onChange={(e) => setAuthor(i, { given: e.target.value })}
            />
            <input
              aria-label={`Author ${i + 1} suffix`}
              className="input--suffix"
              placeholder="Suffix"
              value={a.suffix ?? ""}
              onChange={(e) => setAuthor(i, { suffix: e.target.value })}
            />
            {source.authors.length > 1 && (
              <button
                type="button"
                className="btn btn--small"
                aria-label={`Remove author ${i + 1}`}
                onClick={() => removeAuthor(i)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn--small" onClick={addAuthor}>
          + Add author
        </button>
        <label className="field">
          <span>Organization (group author, optional)</span>
          <input
            aria-label="Organization"
            placeholder="e.g. World Health Organization"
            value={source.organization ?? ""}
            onChange={(e) => set("organization", e.target.value)}
          />
        </label>
        {issueFor("author") && <p className="hint">{issueFor("author")}</p>}
      </fieldset>

      <label className="field">
        <span>Title{source.type === "book" ? " (book)" : ""}</span>
        <input
          aria-label="Title"
          placeholder="Title of the work"
          value={source.title}
          onChange={(e) => set("title", e.target.value)}
        />
        {issueFor("title") && <p className="hint hint--error">{issueFor("title")}</p>}
      </label>

      {show.has("container") && (
        <label className="field">
          <span>
            {source.type === "journal"
              ? "Journal name"
              : source.type === "newspaper"
                ? "Newspaper name"
                : "Website / publisher name"}
          </span>
          <input
            aria-label="Container"
            value={source.container ?? ""}
            onChange={(e) => set("container", e.target.value)}
          />
          {issueFor("container") && <p className="hint">{issueFor("container")}</p>}
        </label>
      )}

      <div className="field-grid">
        {show.has("year") && (
          <label className="field">
            <span>Year</span>
            <input
              aria-label="Year"
              placeholder="2024"
              inputMode="numeric"
              value={source.year ?? ""}
              onChange={(e) => set("year", e.target.value)}
            />
            {issueFor("year") && <p className="hint">{issueFor("year")}</p>}
          </label>
        )}
        {show.has("publisher") && (
          <label className="field">
            <span>Publisher</span>
            <input
              aria-label="Publisher"
              value={source.publisher ?? ""}
              onChange={(e) => set("publisher", e.target.value)}
            />
            {issueFor("publisher") && <p className="hint">{issueFor("publisher")}</p>}
          </label>
        )}
        {show.has("volume") && (
          <label className="field">
            <span>Volume</span>
            <input
              aria-label="Volume"
              value={source.volume ?? ""}
              onChange={(e) => set("volume", e.target.value)}
            />
          </label>
        )}
        {show.has("issue") && (
          <label className="field">
            <span>Issue</span>
            <input
              aria-label="Issue"
              value={source.issue ?? ""}
              onChange={(e) => set("issue", e.target.value)}
            />
          </label>
        )}
        {show.has("pages") && (
          <label className="field">
            <span>Pages</span>
            <input
              aria-label="Pages"
              placeholder="12-34"
              value={source.pages ?? ""}
              onChange={(e) => set("pages", e.target.value)}
            />
          </label>
        )}
        {show.has("publishedDate") && (
          <label className="field">
            <span>Publication date</span>
            <input
              aria-label="Publication date"
              type="date"
              value={source.publishedDate ?? ""}
              onChange={(e) => set("publishedDate", e.target.value)}
            />
          </label>
        )}
        {show.has("accessed") && (
          <label className="field">
            <span>Date accessed</span>
            <input
              aria-label="Date accessed"
              type="date"
              value={source.accessed ?? ""}
              onChange={(e) => set("accessed", e.target.value)}
            />
          </label>
        )}
        {show.has("doi") && (
          <label className="field">
            <span>DOI</span>
            <input
              aria-label="DOI"
              placeholder="10.1000/xyz123"
              value={source.doi ?? ""}
              onChange={(e) => set("doi", e.target.value)}
            />
          </label>
        )}
        {show.has("url") && (
          <label className="field field--wide">
            <span>URL</span>
            <input
              aria-label="URL"
              placeholder="https://example.com/article"
              value={source.url ?? ""}
              onChange={(e) => set("url", e.target.value)}
            />
            {issueFor("url") && <p className="hint">{issueFor("url")}</p>}
          </label>
        )}
      </div>
    </fieldset>
  );
}
