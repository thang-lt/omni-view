export type CoverageRequirementView =
  | "primary-source"
  | "claimant"
  | "counterparty"
  | "affected-group"
  | "independent-expert"
  | "local-perspective"
  | "direct-counterevidence";

export interface CoverageEntryView {
  readonly requirement: CoverageRequirementView;
  readonly sourceIds: readonly string[];
}

export interface CoverageMatrixProps {
  readonly entries: readonly CoverageEntryView[];
  readonly coverageRatio: number;
  readonly complete: boolean;
  readonly auditComplete?: boolean;
}

const COVERAGE_LABELS: Record<CoverageRequirementView, string> = {
  "primary-source": "Nguồn sơ cấp",
  claimant: "Bên đưa ra luận điểm",
  counterparty: "Bên phản biện/đối lập",
  "affected-group": "Nhóm chịu tác động",
  "independent-expert": "Chuyên gia độc lập",
  "local-perspective": "Góc nhìn địa phương",
  "direct-counterevidence": "Phản chứng trực tiếp",
};

export function CoverageMatrix({ entries, coverageRatio, complete, auditComplete = true }: CoverageMatrixProps) {
  const safeRatio = Math.min(1, Math.max(0, coverageRatio));
  const percentage = Math.round(safeRatio * 100);
  const coveredCount = entries.filter((entry) => entry.sourceIds.length > 0).length;

  return <section className="content-card coverage-matrix" aria-labelledby="coverage-matrix-title">
    <div className="section-title">
      <div><span className="eyebrow">COVERAGE GATE</span><h2 id="coverage-matrix-title">Ma trận độ phủ góc nhìn</h2></div>
      <small>{!auditComplete ? "Audit nguồn chưa đầy đủ; số liệu bên dưới chỉ là phần đã xác nhận" : complete ? "Đã có đại diện cho mọi nhóm bắt buộc" : "Còn khoảng trống; kết quả không nên được xem là đầy đủ"}</small>
    </div>
    <div className="coverage-overview"><b>{percentage}%</b><span>{coveredCount}/{entries.length || 7} nhóm có nguồn đã xác nhận</span></div>
    <div className="meter" role="progressbar" aria-label="Tỷ lệ nhóm góc nhìn đã có nguồn" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
      <i style={{ width: `${safeRatio * 100}%` }} />
    </div>
    {!auditComplete && <div className="coverage-data-warning">Đây không phải lỗi chart: Source Auditor chưa trả đủ dữ liệu hợp lệ. Nhóm chưa xác nhận được giữ ở trạng thái “Thiếu”, không được tự suy đoán.</div>}
    {entries.length === 0
      ? <div className="empty-state">Chưa có dữ liệu coverage.</div>
      : entries.map((entry) => {
        const covered = entry.sourceIds.length > 0;
        return <div className="coverage-row" key={entry.requirement}>
          <span>{COVERAGE_LABELS[entry.requirement]}</span>
          <span className="meter" aria-hidden="true"><i style={{ width: covered ? "100%" : "0%" }} /></span>
          <b>{covered ? entry.sourceIds.length : "Thiếu"}</b>
        </div>;
      })}
  </section>;
}

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
  readonly fullTextStatus?: "read" | "partial" | "metadata-only" | "inaccessible" | "blocked";
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
    <p>Warning phản ánh một tín hiệu cụ thể có evidence, không phải điểm uy tín của cả tờ báo. Không có warning cũng không phải chứng nhận rằng toàn bộ nội dung luôn trung lập hoặc chính xác.</p>
  </aside>;
}

export function SourceWarningPanel({ source, warnings }: SourceWarningPanelProps) {
  return <section className="content-card source-warning-panel" aria-labelledby={`source-warning-${source.id}`}>
    <div className="section-title">
      <div><span className="eyebrow">SOURCE AUDIT</span><h2 id={`source-warning-${source.id}`}>{source.title}</h2><small>{source.publisher}</small></div>
      <small>{source.fullTextStatus ? `Mức đọc nội dung: ${source.fullTextStatus}` : "Chưa rõ mức đọc toàn văn"}</small>
    </div>
    {source.url && <p className="source-warning-link"><a href={source.url} target="_blank" rel="noreferrer">Mở nguồn gốc ↗</a></p>}
    {warnings.length === 0
      ? <div className="source-audit-clear"><b>Không ghi nhận warning có evidence</b><span>Trong phần nội dung hệ thống đọc được của phiên này.</span></div>
      : <div className="audit-grid">{warnings.map((warning) => <article className={`audit-card ${warning.severity}`} key={warning.id}>
        <div><b>{WARNING_CATEGORY_LABELS[warning.category]}</b><span>{AUDIT_STATUS_LABELS[warning.status]}</span></div>
        <p>{warning.observableIndicator}</p>
        {warning.evidenceQuote && <blockquote><p>“{warning.evidenceQuote}”</p></blockquote>}
        <small>{warning.evidenceIds.length} đoạn evidence · Độ chắc của cảnh báo: {CONFIDENCE_LABELS[warning.confidence]}</small>
        {warning.alternativeExplanation && <div className="note-box"><b>Giải thích thay thế</b><p>{warning.alternativeExplanation}</p></div>}
        <p className="confidence-note"><b>Lý do mức chắc:</b> {warning.confidenceReason}</p>
      </article>)}</div>}
  </section>;
}
