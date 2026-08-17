import { useState } from 'react';
import { usePerspectiveLens } from './presentation/hooks/usePerspectiveLens';
import { SearchHeader } from './presentation/components/SearchHeader';
import { TopicOverview } from './presentation/components/TopicOverview';
import { RawSourceSection } from './presentation/components/RawSourceSection';
import { PerspectiveColumn } from './presentation/components/PerspectiveColumn';
import { SessionHistorySidebar } from './presentation/components/SessionHistorySidebar';
import { SettingsModal } from './presentation/components/SettingsModal';
import { Stance } from './domain/models/Stance';
import { Key, Sparkles, Database, ShieldCheck, CheckCircle2 } from 'lucide-react';

import './presentation/styles/theme.css';

export function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    currentTopic,
    history,
    isLoading,
    error,
    currentStep,
    stepMessage,
    activeSourceId,
    setActiveSourceId,
    scrollToSource,
    searchTopic,
    selectTopicFromHistory,
    clearSession,
  } = usePerspectiveLens();

  const proPerspective = currentTopic?.getPerspective(Stance.PRO);
  const conPerspective = currentTopic?.getPerspective(Stance.CON);

  const stepsList = [
    { num: 1, label: 'Truy vết Nguồn dữ liệu', icon: Database },
    { num: 2, label: 'Phân tích Ủng hộ & Lý do', icon: Sparkles },
    { num: 3, label: 'Phân tích Phản đối & Cảnh báo', icon: Sparkles },
    { num: 4, label: 'Kiểm định Thiên kiến Nguồn', icon: ShieldCheck },
  ];

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
          <div className="spinner" style={{ marginBottom: '1rem' }}></div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
            Hệ thống Multi-Agent đang phân tích chuyên sâu...
          </h3>
          <p style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '0.95rem', margin: '0 0 1.5rem 0' }}>
            {stepMessage || 'Đang thực thi các Agent phân tích dữ liệu đa chiều...'}
          </p>

          <div className="multi-agent-steps-bar">
            {stepsList.map((st) => {
              const isDone = currentStep > st.num;
              const isCurrent = currentStep === st.num;
              return (
                <div
                  key={st.num}
                  className={`agent-step-item ${isDone ? 'step-done' : ''} ${isCurrent ? 'step-current' : ''}`}
                >
                  <div className="step-badge">
                    {isDone ? <CheckCircle2 size={16} /> : st.num}
                  </div>
                  <span className="step-label">{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`layout-grid ${history.length > 0 ? 'layout-grid-has-sidebar' : ''}`}>
          <div>
            {currentTopic ? (
              <>
                <TopicOverview topic={currentTopic} />

                {/* Step 1: Raw Sources Discovery */}
                <RawSourceSection
                  sources={currentTopic.rawSources}
                  activeSourceId={activeSourceId}
                  onHoverSource={setActiveSourceId}
                  onSelectSource={scrollToSource}
                />

                {/* Step 2: Split-Screen Deep Arguments */}
                <div className="perspective-split">
                  {proPerspective && (
                    <PerspectiveColumn
                      perspective={proPerspective}
                      rawSources={currentTopic.rawSources}
                      activeSourceId={activeSourceId}
                      onHoverSource={setActiveSourceId}
                      onSelectSource={scrollToSource}
                    />
                  )}
                  {conPerspective && (
                    <PerspectiveColumn
                      perspective={conPerspective}
                      rawSources={currentTopic.rawSources}
                      activeSourceId={activeSourceId}
                      onHoverSource={setActiveSourceId}
                      onSelectSource={scrollToSource}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Hệ thống Nghiên cứu Đa chiều Multi-Agent với Gemini AI
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '560px', margin: '0 auto 1.5rem auto' }}>
                  Nhập bất kỳ câu hỏi tranh cãi nào để xem kết quả phân tích sâu 4 tầng: <strong>Trích xuất URL nguồn thật</strong>, <strong>Lý do luận điểm đúng</strong>, <strong>Lưu ý bối cảnh</strong> và <strong>Đánh giá thiên kiến nguồn tin</strong>.
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
