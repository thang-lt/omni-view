import React from 'react';
import { Perspective } from '../../domain/models/Perspective';
import { Stance } from '../../domain/models/Stance';
import { EvidenceCard } from './EvidenceCard';
import { CitationList } from './CitationList';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface PerspectiveColumnProps {
  perspective: Perspective;
}

export const PerspectiveColumn: React.FC<PerspectiveColumnProps> = ({ perspective }) => {
  const isPro = perspective.stance === Stance.PRO;

  return (
    <div className={`glass-card ${isPro ? 'column-pro' : 'column-con'}`}>
      <div className="column-header">
        {isPro ? <ThumbsUp size={22} color="#34d399" /> : <ThumbsDown size={22} color="#fb7185" />}
        <div>
          <span className={`stance-badge ${isPro ? 'pro' : 'con'}`}>
            {isPro ? 'Ủng hộ (Pros)' : 'Phản đối (Cons)'}
          </span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem' }}>{perspective.title}</h3>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
        {perspective.summary}
      </p>

      <div>
        {perspective.arguments.map((arg) => (
          <div key={arg.id} className="argument-card">
            <h4 className="argument-claim">{arg.claim}</h4>
            <p className="argument-reasoning">{arg.reasoning}</p>

            {arg.evidences.map((e, idx) => (
              <EvidenceCard key={idx} evidence={e} />
            ))}

            <CitationList citations={arg.citations} />
          </div>
        ))}
      </div>
    </div>
  );
};
