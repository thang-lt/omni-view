import React from 'react';
import { Argument } from '../../domain/models/Argument';
import { RawSource } from '../../domain/models/RawSource';
import { CitationList } from './CitationList';
import { CheckCircle2, AlertTriangle, ShieldAlert, Link as LinkIcon, TrendingUp } from 'lucide-react';

interface DeepArgumentCardProps {
  argument: Argument;
  rawSources: RawSource[];
  activeSourceId: string | null;
  onHoverSource: (sourceId: string | null) => void;
  onSelectSource: (sourceId: string) => void;
}

export const DeepArgumentCard: React.FC<DeepArgumentCardProps> = ({
  argument,
  rawSources,
  activeSourceId,
  onHoverSource,
  onSelectSource,
}) => {
  // Check if any source tied to this argument is currently active
  const isSourceActive = argument.sourceIds.some((id) => id === activeSourceId);

  // Map sourceIds to rawSource objects
  const relatedSources = rawSources.filter((s) => argument.sourceIds.includes(s.id));

  return (
    <div
      className={`glass-card deep-argument-card ${isSourceActive ? 'argument-card-active' : ''}`}
      style={{ marginBottom: '1.5rem' }}
    >
      {/* Tầng 1: Claim Header & Source Badges */}
      <div className="argument-header">
        <h4 className="argument-claim">{argument.claim}</h4>

        {argument.reasoning && (
          <p className="argument-reasoning">{argument.reasoning}</p>
        )}

        {/* Metrics Badges */}
        {argument.evidences.length > 0 && (
          <div className="evidence-badge-list" style={{ marginTop: '0.75rem' }}>
            {argument.evidences.map((ev, idx) => (
              <span key={idx} className="evidence-badge">
                <TrendingUp size={14} />
                <strong>{ev.metric}</strong> — {ev.description}
              </span>
            ))}
          </div>
        )}

        {/* Linked Source Badges */}
        {relatedSources.length > 0 && (
          <div className="linked-sources-bar" style={{ marginTop: '0.75rem' }}>
            <span className="linked-source-label">
              <LinkIcon size={12} /> Nguồn liên kết:
            </span>
            {relatedSources.map((source) => (
              <button
                key={source.id}
                className={`linked-source-pill ${activeSourceId === source.id ? 'pill-active' : ''}`}
                onMouseEnter={() => onHoverSource(source.id)}
                onMouseLeave={() => onHoverSource(null)}
                onClick={() => onSelectSource(source.id)}
              >
                {source.sourceName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tầng 2: Lý do Luận điểm ĐÚNG / HỢP LÝ */}
      {argument.validityReasons && argument.validityReasons.length > 0 && (
        <div className="analysis-block validity-block">
          <div className="analysis-block-title validity-title">
            <CheckCircle2 size={16} /> Lý do luận điểm này ĐÚNG / HỢP LÝ
          </div>
          <ul className="analysis-list">
            {argument.validityReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tầng 3: Lưu ý & Điểm hạn chế */}
      {argument.argumentCaveats && argument.argumentCaveats.length > 0 && (
        <div className="analysis-block caveat-block">
          <div className="analysis-block-title caveat-title">
            <AlertTriangle size={16} /> Lưu ý & Điểm hạn chế của Luận điểm
          </div>
          <ul className="analysis-list">
            {argument.argumentCaveats.map((caveat, idx) => (
              <li key={idx}>{caveat}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tầng 4: Đánh giá Thiên kiến & Độ tin cậy Nguồn dữ liệu */}
      {argument.sourceBiasNotes && (
        <div className="analysis-block bias-block">
          <div className="analysis-block-title bias-title">
            <ShieldAlert size={16} /> Lưu ý & Thiên kiến Nguồn Dữ liệu
          </div>
          <p className="bias-text">{argument.sourceBiasNotes}</p>
        </div>
      )}

      {/* Citations List (if explicitly provided) */}
      {argument.citations.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <CitationList citations={argument.citations} />
        </div>
      )}
    </div>
  );
};
