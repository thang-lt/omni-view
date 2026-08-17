import { useState, useEffect } from 'react';
import { usePerspectiveLens } from './presentation/hooks/usePerspectiveLens';
import { SearchHeader } from './presentation/components/SearchHeader';
import { TopicOverview } from './presentation/components/TopicOverview';
import { RawSourceSection } from './presentation/components/RawSourceSection';
import { PerspectiveColumn } from './presentation/components/PerspectiveColumn';
import { ComparisonMatrix } from './presentation/components/ComparisonMatrix';
import { SessionHistorySidebar } from './presentation/components/SessionHistorySidebar';
import { SettingsModal } from './presentation/components/SettingsModal';
import { Stance } from './domain/models/Stance';
import { Key, Sparkles, Database, ShieldCheck, CheckCircle2, ThumbsUp, ThumbsDown, Scale, Columns } from 'lucide-react';

import './presentation/styles/theme.css';

type TabViewMode = 'pro' | 'con' | 'matrix' | 'split';

export function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabViewMode>('pro');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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
        theme={theme}
        onToggleTheme={toggleTheme}
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
            borderColor: 'var(--border-con)',
            backgroundColor: 'var(--accent-con-bg)',
            color: 'var(--accent-con-text)',
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
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0', fontFamily: 'var(--font-serif)' }}>
            Hệ thống Multi-Agent đang tiến hành tổng hợp & nghiên cứu...
          </h3>
          <p style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.92rem', margin: '0 0 1.5rem 0' }}>
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
                    {isDone ? <CheckCircle2 size={14} /> : st.num}
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

                {/* Raw Sources Section */}
                <RawSourceSection
                  sources={currentTopic.rawSources}
                  activeSourceId={activeSourceId}
                  onHoverSource={setActiveSourceId}
                  onSelectSource={scrollToSource}
                />

                {/* Segmented Reader Tab Controller */}
                <nav className="reader-tab-bar">
                  <button
                    className={`reader-tab-btn tab-pro ${activeTab === 'pro' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pro')}
                  >
                    <ThumbsUp size={16} color="var(--accent-pro-text)" />
                    <span>Góc nhìn Ủng hộ (Pros)</span>
                  </button>

                  <button
                    className={`reader-tab-btn tab-con ${activeTab === 'con' ? 'active' : ''}`}
                    onClick={() => setActiveTab('con')}
                  >
                    <ThumbsDown size={16} color="var(--accent-con-text)" />
                    <span>Góc nhìn Phản đối (Cons)</span>
                  </button>

                  <button
                    className={`reader-tab-btn tab-matrix ${activeTab === 'matrix' ? 'active' : ''}`}
                    onClick={() => setActiveTab('matrix')}
                  >
                    <Scale size={16} color="var(--accent-primary)" />
                    <span>Bảng Đối Chiếu So Sánh</span>
                  </button>

                  <button
                    className={`reader-tab-btn ${activeTab === 'split' ? 'active' : ''}`}
                    onClick={() => setActiveTab('split')}
                    title="Xem 2 cột song song trên màn hình rộng"
                  >
                    <Columns size={16} />
                    <span>Xem 2 Cột Song Song</span>
                  </button>
                </nav>

                {/* Render Selected View */}
                {activeTab === 'pro' && proPerspective && (
                  <div className="single-column-reader-container">
                    <PerspectiveColumn
                      perspective={proPerspective}
                      rawSources={currentTopic.rawSources}
                      activeSourceId={activeSourceId}
                      onHoverSource={setActiveSourceId}
                      onSelectSource={scrollToSource}
                    />
                  </div>
                )}

                {activeTab === 'con' && conPerspective && (
                  <div className="single-column-reader-container">
                    <PerspectiveColumn
                      perspective={conPerspective}
                      rawSources={currentTopic.rawSources}
                      activeSourceId={activeSourceId}
                      onHoverSource={setActiveSourceId}
                      onSelectSource={scrollToSource}
                    />
                  </div>
                )}

                {activeTab === 'matrix' && proPerspective && conPerspective && (
                  <ComparisonMatrix
                    proPerspective={proPerspective}
                    conPerspective={conPerspective}
                    rawSources={currentTopic.rawSources}
                    onHoverSource={setActiveSourceId}
                    onSelectSource={scrollToSource}
                  />
                )}

                {activeTab === 'split' && (
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
                )}
              </>
            ) : (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.6rem', fontFamily: 'var(--font-serif)' }}>
                  Nền Tảng Nghiên Cứu & Trích Xuất Dữ Liệu Đa Chiều
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
                  Nhập bất kỳ câu hỏi hoặc chủ đề nghiên cứu nào để hệ thống Multi-Agent trích xuất: <strong>Trích dẫn nguồn thật</strong>, <strong>Lý do luận điểm hợp lý</strong>, <strong>Lưu ý bối cảnh hạn chế</strong> và <strong>Đánh giá thiên kiến truyền thông</strong>.
                </p>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="search-button"
                  style={{ margin: '0 auto' }}
                >
                  <Key size={16} /> Cấu hình Gemini API Key
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
