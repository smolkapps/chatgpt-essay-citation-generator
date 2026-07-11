// Built-in example sources — one per source type — so a first-time visitor can
// see real output in every style before typing anything. All four are real,
// well-known works whose bibliographic details are stable and easy to verify.

import { newId } from "./store";
import type { Source } from "./types";

/** The example data, without ids (ids are minted fresh on each load). */
const EXAMPLES: ReadonlyArray<Omit<Source, "id">> = [
  {
    type: "book",
    authors: [{ family: "Carson", given: "Rachel" }],
    title: "Silent Spring",
    publisher: "Houghton Mifflin",
    year: "1962",
  },
  {
    type: "journal",
    authors: [
      { family: "Watson", given: "James D." },
      { family: "Crick", given: "Francis H. C." },
    ],
    title: "Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid",
    container: "Nature",
    volume: "171",
    issue: "4356",
    pages: "737-738",
    year: "1953",
    doi: "10.1038/171737a0",
  },
  {
    type: "newspaper",
    authors: [{ family: "Wilford", given: "John Noble" }],
    title: "Men walk on moon",
    container: "The New York Times",
    publishedDate: "1969-07-21",
    pages: "1",
  },
  {
    type: "website",
    authors: [],
    organization: "Purdue Online Writing Lab",
    title: "MLA formatting and style guide",
    container: "Purdue OWL",
    url: "https://owl.purdue.edu/owl/research_and_citation/mla_style/mla_formatting_and_style_guide.html",
  },
];

/** Fresh copies of the example sources, each with a new id. */
export function exampleSources(): Source[] {
  return EXAMPLES.map((e) => ({ ...e, authors: e.authors.map((a) => ({ ...a })), id: newId() }));
}
