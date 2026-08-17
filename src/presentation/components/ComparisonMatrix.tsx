import React from 'react';
import { Perspective } from '../../domain/models/Perspective';
import { RawSource } from '../../domain/models/RawSource';
import { CheckCircle2, AlertTriangle, TrendingUp, Scale, Link as LinkIcon } from 'lucide-react';

interface ComparisonMatrixProps {
  proPerspective: Perspective;
  conPerspective: Perspective;
  rawSources: RawSource[];
  onHoverSource: (sourceId: string | null) => void;
  onSelectSource: (sourceId: string) => void;
}

export const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({
  proPerspective,
  conPerspective,
  rawSources,
  onHoverSource,
  onSelectSource,
}) => {
  const maxRows = Math.max(proPerspective.arguments.length, conPerspective.arguments.length);

  const renderCellSources = (sourceIds: string[]) => {
    const related = rawSources.filter((s) => sourceIds.includes(s.id));
    if (related.length === 0) return null;

    return (
      <div className="linked-sources-bar" style={{ marginTop: '0.4rem' }}>
        <span className="linked-source-label">
          <LinkIcon size={11} /> Nguồn:
        </span>
        {related.map((source) => (
          <button
            key={source.id}
            className="linked-source-pill"
            onMouseEnter={() => onHoverSource(source.id)}
            onMouseLeave={() => onHoverSource(null)}
            onClick={() => onSelectSource(source.id)}
          >
            {source.sourceName}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="glass-card comparison-matrix-card" style={{ marginBottom: '2rem' }}>
      <div className="raw-sources-header" style={{ marginBottom: '1.25rem' }}>
        <Scale size={20} color="var(--accent-primary)" />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-serif)' }}>
          Bảng Đối Chiếu So Sánh Luận Điểm Hai Chiều
        </h3>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="th-pro">
                <span className="stance-badge pro">Ủng hộ (Pros)</span>
                <div className="matrix-title">{proPerspective.title}</div>
              </th>
              <th className="th-con">
                <span className="stance-badge con">Phản đối (Cons)</span>
                <div className="matrix-title">{conPerspective.title}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, idx) => {
              const proArg = proPerspective.arguments[idx];
              const conArg = conPerspective.arguments[idx];

              return (
                <tr key={idx}>
                  {/* Pro Cell */}
                  <td className="td-pro">
                    {proArg ? (
                      <div className="matrix-cell-content">
                        <div className="matrix-claim">{proArg.claim}</div>
                        {proArg.reasoning && <p className="matrix-reasoning">{proArg.reasoning}</p>}
                        
                        {proArg.evidences.length > 0 && (
                          <div className="matrix-metric">
                            <TrendingUp size={13} />
                            <span><strong>{proArg.evidences[0].metric}</strong>: {proArg.evidences[0].description}</span>
                          </div>
                        )}

                        {proArg.validityReasons && proArg.validityReasons.length > 0 && (
                          <div className="matrix-mini-reason">
                            <CheckCircle2 size={13} color="var(--accent-pro-text)" />
                            <span>{proArg.validityReasons[0]}</span>
                          </div>
                        )}

                        {renderCellSources(proArg.sourceIds)}
                      </div>
                    ) : (
                      <div className="matrix-empty">—</div>
                    )}
                  </td>

                  {/* Con Cell */}
                  <td className="td-con">
                    {conArg ? (
                      <div className="matrix-cell-content">
                        <div className="matrix-claim">{conArg.claim}</div>
                        {conArg.reasoning && <p className="matrix-reasoning">{conArg.reasoning}</p>}
                        
                        {conArg.evidences.length > 0 && (
                          <div className="matrix-metric">
                            <TrendingUp size={13} />
                            <span><strong>{conArg.evidences[0].metric}</strong>: {conArg.evidences[0].description}</span>
                          </div>
                        )}

                        {conArg.argumentCaveats && conArg.argumentCaveats.length > 0 && (
                          <div className="matrix-mini-reason">
                            <AlertTriangle size={13} color="#b45309" />
                            <span>{conArg.argumentCaveats[0]}</span>
                          </div>
                        )}

                        {renderCellSources(conArg.sourceIds)}
                      </div>
                    ) : (
                      <div className="matrix-empty">—</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
