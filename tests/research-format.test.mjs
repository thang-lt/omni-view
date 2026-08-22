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

test("recovers report markdown from a truncated judge JSON response", () => {
  const truncated = `{ "reportMarkdown": "## Tóm tắt điều hành\\n\\n- Kết quả chính.\\n\\n## Kết luận có điều kiện\\n\\n- Cần thêm dữ liệu.", "claims": [{ "id": "C1"`;

  assert.equal(
    normalizeAgentMarkdown(truncated),
    "## Tóm tắt điều hành\n\n- Kết quả chính.\n\n## Kết luận có điều kiện\n\n- Cần thêm dữ liệu.",
  );
});

test("repairs escaped line breaks and compact heading syntax in a report", () => {
  const malformed = "```markdown\n#Kết luận\\n\\n##Điều biết chắc\\n\\n- Dữ kiện đã kiểm tra.\n```";
  assert.equal(
    normalizeAgentMarkdown(malformed),
    "# Kết luận\n\n## Điều biết chắc\n\n- Dữ kiện đã kiểm tra.",
  );
});
