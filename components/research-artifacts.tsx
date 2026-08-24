export type ClaimVerdictView = "supported" | "mixed" | "unsupported" | "unresolved";
export type ConfidenceView = "low" | "medium" | "high";

export interface ClaimLedgerItemView {
  readonly id: string;
  readonly text: string;
  readonly type: "empirical" | "causal" | "predictive" | "interpretive" | "normative";
  readonly supportingEvidenceIds: readonly string[];
  readonly contradictingEvidenceIds: readonly string[];
  readonly verdict: ClaimVerdictView;
  readonly confidence: ConfidenceView;
  readonly confidenceReason: string;
}

export interface ClaimLedgerProps {
  readonly claims: readonly ClaimLedgerItemView[];
}

const VERDICT_LABELS: Record<ClaimVerdictView, string> = {
  supported: "Có bằng chứng hỗ trợ",
  mixed: "Bằng chứng hỗn hợp",
  unsupported: "Không được hỗ trợ",
  unresolved: "Chưa thể kết luận",
};

const VERDICT_CLASSES: Record<ClaimVerdictView, string> = {
  supported: "good",
  mixed: "warn",
  unsupported: "bad",
  unresolved: "neutral",
};

const CONFIDENCE_LABELS: Record<ConfidenceView, string> = { low: "Thấp", medium: "Vừa", high: "Cao" };

export function ClaimLedger({ claims }: ClaimLedgerProps) {
  return <section className="content-card claim-ledger" aria-labelledby="claim-ledger-title">
    <div className="section-title">
      <div><span className="eyebrow">CLAIM → EVIDENCE</span><h2 id="claim-ledger-title">Sổ cái luận điểm</h2></div>
      <small>Verdict dựa trên evidence được liên kết, không dựa trên số lượng nguồn biểu quyết.</small>
    </div>
    {claims.length === 0
      ? <div className="empty-state">Chưa có luận điểm có cấu trúc.</div>
      : <div className="claim-list">{claims.map((claim) => <article className="claim-card" key={claim.id}>
        <span className="claim-id">{claim.id}</span>
        <div className="claim-main">
          <b>{claim.text}</b>
          <small>{claim.supportingEvidenceIds.length} bằng chứng ủng hộ · {claim.contradictingEvidenceIds.length} phản chứng · {claim.type}</small>
        </div>
        <span className={`verdict ${VERDICT_CLASSES[claim.verdict]}`}>{VERDICT_LABELS[claim.verdict]}</span>
        <span className="confidence" title={claim.confidenceReason}><b>{CONFIDENCE_LABELS[claim.confidence]}</b><small>Độ chắc claim</small></span>
      </article>)}</div>}
  </section>;
}

export type WarningCategoryView =
  | "conflict-of-interest"
  | "selection-bias"
  | "methodology"
  | "factual-reliability"
  | "misinformation-risk"
  | "propaganda-technique"
  | "hostile-language"
  | "political-framing"
  | "recency"
  | "geographic-scope"
  | "provenance";

export interface SourceWarningView {
  readonly id: string;
  readonly category: WarningCategoryView;
  readonly observableIndicator: string;
  readonly evidenceIds: readonly string[];
  readonly evidenceQuote?: string;
  readonly evidenceProvenance?: "direct" | "grounding-support";
  readonly alternativeExplanation: string | null;
  readonly severity: "info" | "low" | "medium" | "high";
  readonly confidence: ConfidenceView;
  readonly confidenceReason: string;
  readonly status: "machine-only" | "cross-checked" | "human-reviewed";
}

export interface WarningSourceView {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly url?: string;
  readonly fullTextStatus?: "read" | "partial" | "grounded-support" | "metadata-only" | "inaccessible" | "blocked";
  readonly sourceType?: string;
  readonly stance?: string;
  readonly stakeholderGroups?: readonly string[];
}

export interface SourceWarningPanelProps {
  readonly source: WarningSourceView;
  readonly warnings: readonly SourceWarningView[];
}

const WARNING_CATEGORY_LABELS: Record<WarningCategoryView, string> = {
  "conflict-of-interest": "Xung đột lợi ích",
  "selection-bias": "Thiên lệch lựa chọn",
  methodology: "Phương pháp",
  "factual-reliability": "Độ tin cậy dữ kiện",
  "misinformation-risk": "Nguy cơ thông tin sai",
  "propaganda-technique": "Kỹ thuật tuyên truyền",
  "hostile-language": "Ngôn ngữ thù địch",
  "political-framing": "Đóng khung chính trị",
  recency: "Độ mới dữ liệu",
  "geographic-scope": "Phạm vi địa lý",
  provenance: "Nguồn gốc dữ liệu",
};

const AUDIT_STATUS_LABELS: Record<SourceWarningView["status"], string> = {
  "machine-only": "Máy phát hiện · chưa kiểm tra chéo",
  "cross-checked": "Đã kiểm tra chéo",
  "human-reviewed": "Đã có người duyệt",
};

export function SourceAuditNotice() {
  return <aside className="audit-disclaimer" aria-label="Cách đọc cảnh báo nguồn">
    <b>Cách đọc cảnh báo nguồn</b>
    <p>Warning phản ánh một tín hiệu cụ thể có evidence, không phải phán quyết cho cả tờ báo. Đánh giá provider là kiểm tra máy có Google Search grounding; thiên hướng chính trị không đồng nghĩa thông tin sai, và vẫn cần người duyệt khi dùng cho quyết định quan trọng.</p>
  </aside>;
}

export function SourceWarningPanel({ source, warnings }: SourceWarningPanelProps) {
  return <section className="source-warning-panel" aria-labelledby={`source-warning-${source.id}`}>
    <div className="section-title">
      <div><span className="eyebrow">SOURCE AUDIT</span><h2 id={`source-warning-${source.id}`}>{source.title}</h2><small>{source.publisher}</small></div>
      <small>{source.fullTextStatus ? `Mức đọc nội dung: ${source.fullTextStatus}` : "Chưa rõ mức đọc toàn văn"}</small>
    </div>
    {source.url && <p className="source-warning-link"><a href={source.url} target="_blank" rel="noreferrer">Mở nguồn gốc ↗</a></p>}
    {(source.sourceType || source.stance || source.stakeholderGroups?.length) && <div className="source-audit-metadata">
      {source.sourceType && <span><b>Loại nguồn</b>{source.sourceType}</span>}
      {source.stance && <span><b>Lập trường</b>{source.stance}</span>}
      {source.stakeholderGroups?.length ? <span><b>Stakeholder</b>{source.stakeholderGroups.join(", ")}</span> : null}
    </div>}
    {warnings.length === 0
      ? <div className="source-audit-clear"><b>Không ghi nhận warning có evidence</b><span>Trong phần nội dung hệ thống đọc được của phiên này.</span></div>
      : <div className="audit-grid">{warnings.map((warning) => <article className={`audit-card ${warning.severity}`} key={warning.id}>
        <div><b>{WARNING_CATEGORY_LABELS[warning.category]}</b><span>{AUDIT_STATUS_LABELS[warning.status]}</span></div>
        <p>{warning.observableIndicator}</p>
        {warning.evidenceQuote && <blockquote><p>“{warning.evidenceQuote}”</p></blockquote>}
        {warning.evidenceProvenance && <small>{warning.evidenceProvenance === "direct" ? "Quote khớp nội dung đọc trực tiếp" : "Quote khớp grounding-support model-generated, không phải nguyên văn trang nguồn"}</small>}
        <small>{warning.evidenceIds.length} đoạn evidence · Độ chắc của cảnh báo: {CONFIDENCE_LABELS[warning.confidence]}</small>
        {warning.alternativeExplanation && <div className="note-box"><b>Giải thích thay thế</b><p>{warning.alternativeExplanation}</p></div>}
        <p className="confidence-note"><b>Lý do mức chắc:</b> {warning.confidenceReason}</p>
      </article>)}</div>}
  </section>;
}
