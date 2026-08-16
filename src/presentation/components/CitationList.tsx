import React from 'react';
import { Citation } from '../../domain/models/Citation';
import { ExternalLink, ShieldCheck } from 'lucide-react';

interface CitationListProps {
  citations: Citation[];
}

export const CitationList: React.FC<CitationListProps> = ({ citations }) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="citation-list">
      <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <ShieldCheck size={12} color="#10b981" /> Nguồn dẫn chứng kiểm chứng:
      </div>
      {citations.map((c, idx) => (
        <a key={idx} href={c.url} target="_blank" rel="noopener noreferrer" className="citation-link">
          <span>{c.sourceName}:</span> {c.title} <ExternalLink size={11} />
        </a>
      ))}
    </div>
  );
};
