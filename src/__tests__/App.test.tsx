import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
});

describe("App", () => {
  it("renders the heading and the honesty notice", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /Citation & Bibliography Generator/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/not an essay writer/i);
  });

  it("starts empty and shows the empty state", () => {
    render(<App />);
    expect(screen.getByText(/No sources yet/i)).toBeInTheDocument();
  });

  it("adds a source, fills it in, and formats it in MLA", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Add source/i }));

    const editor = screen.getByTestId("source-editor");
    fireEvent.change(within(editor).getByLabelText("Author 1 last name"), {
      target: { value: "Gladwell" },
    });
    fireEvent.change(within(editor).getByLabelText("Author 1 first name"), {
      target: { value: "Malcolm" },
    });
    fireEvent.change(within(editor).getByLabelText("Title"), {
      target: { value: "the tipping point" },
    });
    fireEvent.change(within(editor).getByLabelText("Publisher"), {
      target: { value: "Little, Brown" },
    });
    fireEvent.change(within(editor).getByLabelText("Year"), {
      target: { value: "2000" },
    });

    expect(
      screen.getByText("Gladwell, Malcolm. The Tipping Point. Little, Brown, 2000."),
    ).toBeInTheDocument();
  });

  it("reformats when the style switches to APA", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Add source/i }));
    const editor = screen.getByTestId("source-editor");
    fireEvent.change(within(editor).getByLabelText("Author 1 last name"), {
      target: { value: "Gladwell" },
    });
    fireEvent.change(within(editor).getByLabelText("Author 1 first name"), {
      target: { value: "Malcolm" },
    });
    fireEvent.change(within(editor).getByLabelText("Title"), {
      target: { value: "The Tipping Point" },
    });
    fireEvent.change(within(editor).getByLabelText("Year"), {
      target: { value: "2000" },
    });

    fireEvent.click(screen.getByRole("radio", { name: /APA/i }));
    expect(screen.getByText(/Gladwell, M\. \(2000\)\./)).toBeInTheDocument();
    expect(screen.getByText("References")).toBeInTheDocument();
  });

  it("persists sources across remounts via localStorage", () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Add source/i }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Persisted Title" },
    });
    unmount();

    render(<App />);
    expect(screen.getByDisplayValue("Persisted Title")).toBeInTheDocument();
  });

  it("loads example sources from the empty state", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /example sources/i }));

    expect(screen.getAllByTestId("source-editor").length).toBeGreaterThanOrEqual(4);
    expect(
      screen.getByText("Carson, Rachel. Silent Spring. Houghton Mifflin, 1962."),
    ).toBeInTheDocument();
    // The whole-list actions appear once there is something to export.
    expect(screen.getByRole("button", { name: /Copy all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download \.txt/i })).toBeInTheDocument();
  });

  it("clears all sources after confirmation", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /example sources/i }));
    fireEvent.click(screen.getByRole("button", { name: /Clear all/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.queryAllByTestId("source-editor")).toHaveLength(0);
    expect(screen.getByText(/No sources yet/i)).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("keeps sources when clearing is cancelled", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /example sources/i }));
    fireEvent.click(screen.getByRole("button", { name: /Clear all/i }));

    expect(screen.getAllByTestId("source-editor").length).toBeGreaterThanOrEqual(4);
    confirmSpy.mockRestore();
  });

  it("labels Chicago NB citations as footnotes", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /example sources/i }));
    fireEvent.click(screen.getByRole("radio", { name: /^Chicago 17th ed\. \(notes/i }));

    expect(screen.getAllByText("Footnote:").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /Copy footnote/i }).length,
    ).toBeGreaterThan(0);
  });

  it("numbers IEEE in-text citations by sorted list position", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /example sources/i }));
    fireEvent.click(screen.getByRole("radio", { name: /IEEE/i }));

    // Four example sources → in-text markers [1]..[4], not four copies of [1].
    expect(screen.getByText("[1]")).toBeInTheDocument();
    expect(screen.getByText("[4]")).toBeInTheDocument();
  });

  it("has a share button", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /Share this tool/i })).toBeInTheDocument();
  });
});
