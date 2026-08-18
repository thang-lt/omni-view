import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAgentMarkdown } from "../lib/research-format.ts";

test("recovers analysis markdown from a truncated bias JSON response", () => {
  const truncated = `{ "analysisMarkdown": "## Kiểm định luận điểm\\n\\n- Claim cần kiểm tra.\\n\\n## Khoảng trống bằng chứng\\n\\n- Thiếu nguồn sơ cấp.", "sourceBiasNotes": [{ "sourceIndex": 1, "note": "response ends here`;
  const result = normalizeAgentMarkdown(truncated);

  assert.equal(result, "## Kiểm định luận điểm\n\n- Claim cần kiểm tra.\n\n## Khoảng trống bằng chứng\n\n- Thiếu nguồn sơ cấp.");
  assert.doesNotMatch(result, /analysisMarkdown|sourceBiasNotes/);
});

test("unwraps complete structured output and markdown fences", () => {
  const complete = JSON.stringify({ analysisMarkdown: "```markdown\n## Bias của pipeline\n\n- Selection bias.\n```", sourceBiasNotes: [] });
  assert.equal(normalizeAgentMarkdown(complete), "## Bias của pipeline\n\n- Selection bias.");
});
