import { useState } from 'react';
import { usePerspectiveLens } from './presentation/hooks/usePerspectiveLens';
import { SearchHeader } from './presentation/components/SearchHeader';
import { TopicOverview } from './presentation/components/TopicOverview';
import { PerspectiveColumn } from './presentation/components/PerspectiveColumn';
import { SessionHistorySidebar } from './presentation/components/SessionHistorySidebar';
import { SettingsModal } from './presentation/components/SettingsModal';
import { Stance } from './domain/models/Stance';
import { Key } from 'lucide-react';

import './presentation/styles/theme.css';

export function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    currentTopic,
    history,
    isLoading,
    error,
    searchTopic,
    selectTopicFromHistory,
    clearSession,
  } = usePerspectiveLens();

  const proPerspective = currentTopic?.getPerspective(Stance.PRO);
  const conPerspective = currentTopic?.getPerspective(Stance.CON);

  return (
    <div className="app-container">
      <SearchHeader
        onSearch={searchTopic}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isLoading={isLoading}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onKeySaved={() => {}}
      />

      {error && (
        <div
          className="glass-card"
          style={{
            borderColor: 'rgba(244, 63, 94, 0.4)',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            color: '#fb7185',
            marginBottom: '1.5rem',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <span>{error}</span>
          {error.includes('Gemini API Key') && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="search-button"
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            >
              <Key size={14} /> Nhập Key Ngay
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="glass-card loading-box">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            Đang gọi Google Gemini API để phân tích dữ liệu đa chiều thời gian thực...
          </p>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
            Đang tổng hợp luận điểm, số liệu kiểm chứng và trích dẫn bài viết uy tín
          </span>
        </div>
      ) : (
        <div className={`layout-grid ${history.length > 0 ? 'layout-grid-has-sidebar' : ''}`}>
          <div>
            {currentTopic ? (
              <>
                <TopicOverview topic={currentTopic} />

                <div className="perspective-split">
                  {proPerspective && <PerspectiveColumn perspective={proPerspective} />}
                  {conPerspective && <PerspectiveColumn perspective={conPerspective} />}
                </div>
              </>
            ) : (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Tìm kiếm & Nghiên cứu Đa chiều với Gemini AI
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '540px', margin: '0 auto 1.5rem auto' }}>
                  Nhấn vào góc trên bên phải để nhập <strong>Google Gemini API Key</strong> của bạn, sau đó tìm kiếm bất kỳ chủ đề tranh cãi nào để xem kết quả phân tích 2 mặt thực tế.
                </p>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="search-button"
                  style={{ margin: '0 auto' }}
                >
                  <Key size={18} /> Cấu hình Gemini API Key
                </button>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <SessionHistorySidebar
              history={history}
              activeTopicId={currentTopic?.id}
              onSelectTopic={selectTopicFromHistory}
              onClearSession={clearSession}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
