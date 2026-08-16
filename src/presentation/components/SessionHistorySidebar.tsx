import React from 'react';
import { Topic } from '../../domain/models/Topic';
import { History, Trash2 } from 'lucide-react';

interface SessionHistorySidebarProps {
  history: Topic[];
  activeTopicId?: string;
  onSelectTopic: (topic: Topic) => void;
  onClearSession: () => void;
}

export const SessionHistorySidebar: React.FC<SessionHistorySidebarProps> = ({
  history,
  activeTopicId,
  onSelectTopic,
  onClearSession,
}) => {
  if (!history || history.length === 0) {
    return (
      <aside className="glass-card sidebar-card">
        <div className="sidebar-header">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <History size={16} /> Phiên tra cứu
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', textAlign: 'center', padding: '1rem 0' }}>
          Chưa có lịch sử trong phiên này.
        </p>
      </aside>
    );
  }

  return (
    <aside className="glass-card sidebar-card">
      <div className="sidebar-header">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <History size={16} /> Lịch sử Phiên ({history.length})
        </h3>
        <button
          onClick={onClearSession}
          title="Xóa phiên"
          style={{ background: 'none', border: 'none', color: 'var(--accent-con-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div>
        {history.map((t) => (
          <button
            key={t.id}
            className={`history-item ${t.id === activeTopicId ? 'active' : ''}`}
            onClick={() => onSelectTopic(t)}
          >
            <div className="history-title">{t.title}</div>
            <div className="history-time">{new Date(t.createdAt).toLocaleTimeString()}</div>
          </button>
        ))}
      </div>
    </aside>
  );
};
