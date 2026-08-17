import React from 'react';
import { RawSource } from '../../domain/models/RawSource';
import { ExternalLink, Database, Tag } from 'lucide-react';

interface RawSourceSectionProps {
  sources: RawSource[];
  activeSourceId: string | null;
  onHoverSource: (sourceId: string | null) => void;
  onSelectSource: (sourceId: string) => void;
}

export const RawSourceSection: React.FC<RawSourceSectionProps> = ({
  sources,
  activeSourceId,
  onHoverSource,
  onSelectSource,
}) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="glass-card raw-sources-section" style={{ marginBottom: '2rem' }}>
      <div className="raw-sources-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
        <Database size={20} style={{ color: 'var(--accent-cyan)' }} />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
          Nguồn Dữ liệu & Ý kiến Ban đầu (Raw Sources Discovery)
        </h3>
        <span className="sources-count-badge">
          {sources.length} Nguồn thực tế
        </span>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Dưới đây là các bài viết, báo cáo nghiên cứu và URL nguồn thật được hệ thống trích xuất ban đầu. Rê chuột hoặc nhấp vào từng nguồn để xem các luận điểm liên quan ở hai cột bên dưới.
      </p>

      <div className="raw-sources-grid">
        {sources.map((source, index) => {
          const isHighlighted = activeSourceId === source.id;
          return (
            <div
              key={source.id}
              id={`raw-source-${source.id}`}
              className={`raw-source-card ${isHighlighted ? 'source-card-active' : ''}`}
              onMouseEnter={() => onHoverSource(source.id)}
              onMouseLeave={() => onHoverSource(null)}
              onClick={() => onSelectSource(source.id)}
            >
              <div className="source-card-top">
                <span className="source-id-badge">Nguồn #{index + 1}</span>
                <span className="publisher-type-tag">
                  <Tag size={12} /> {source.publisherType}
                </span>
              </div>

              <h4 className="source-title">{source.title}</h4>

              <div className="source-publisher">
                <span className="publisher-name">{source.sourceName}</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-url-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={13} /> Link thật
                </a>
              </div>

              {source.rawExcerpt ? (
                <div className="source-excerpt-box">
                  <span className="excerpt-label">Trích đoạn gốc nguyên bản:</span>
                  <p className="source-summary-text">"{source.rawExcerpt}"</p>
                </div>
              ) : source.summary ? (
                <p className="source-summary-text">"{source.summary}"</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
