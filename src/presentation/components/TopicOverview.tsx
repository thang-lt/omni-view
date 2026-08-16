import React from 'react';
import { Topic } from '../../domain/models/Topic';
import { Scale } from 'lucide-react';

interface TopicOverviewProps {
  topic: Topic;
}

export const TopicOverview: React.FC<TopicOverviewProps> = ({ topic }) => {
  return (
    <div className="glass-card overview-card">
      <div className="overview-header">
        <h2 className="overview-title">
          <Scale size={20} color="#3b82f6" />
          {topic.title}
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
          {new Date(topic.createdAt).toLocaleTimeString()}
        </span>
      </div>
      <p className="summary-text">{topic.neutralSummary}</p>
    </div>
  );
};
