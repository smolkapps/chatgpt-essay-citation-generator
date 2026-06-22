import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
});
