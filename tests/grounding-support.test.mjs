import assert from "node:assert/strict";
import test from "node:test";

import { collectGroundingSupportExcerpts } from "../infrastructure/gemini/grounding-support.ts";

test("maps grounding support segments to their source chunks", () => {
  const excerpts = collectGroundingSupportExcerpts({
    content: { parts: [{ text: "First grounded claim. Second grounded claim." }] },
    groundingMetadata: {
      groundingChunks: [
        { web: { uri: "https://source-one.example", title: "One" } },
        { web: { uri: "https://source-two.example", title: "Two" } },
      ],
      groundingSupports: [
        { segment: { text: "First grounded claim." }, groundingChunkIndices: [0] },
        { segment: { text: "Second grounded claim." }, groundingChunkIndices: [0, 1] },
      ],
    },
  });

  assert.equal(excerpts[0], "First grounded claim.\n\nSecond grounded claim.");
  assert.equal(excerpts[1], "Second grounded claim.");
});

test("uses segment offsets when grounding support omits segment text", () => {
  const text = "Intro. Evidence linked to source. Outro.";
  const startIndex = text.indexOf("Evidence");
  const endIndex = text.indexOf(" Outro");
  const excerpts = collectGroundingSupportExcerpts({
    content: { parts: [{ text }] },
    groundingMetadata: {
      groundingChunks: [{ web: { uri: "https://source.example" } }],
      groundingSupports: [{ segment: { startIndex, endIndex }, groundingChunkIndices: [0] }],
    },
  });

  assert.deepEqual(excerpts, ["Evidence linked to source."]);
});
