import React from 'react';
import { Evidence } from '../../domain/models/Evidence';
import { BarChart3 } from 'lucide-react';

interface EvidenceCardProps {
  evidence: Evidence;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence }) => {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div className="evidence-badge">
        <BarChart3 size={13} />
        {evidence.metric}
      </div>
      <p className="evidence-desc">{evidence.description}</p>
    </div>
  );
};
