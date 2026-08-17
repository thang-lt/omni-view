import React, { useState } from 'react';
import { Search, Settings, ShieldCheck, Sun, Moon, BookOpen } from 'lucide-react';
import { ApiKeyRepository } from '../../infrastructure/config/ApiKeyRepository';

interface SearchHeaderProps {
  onSearch: (query: string) => void;
  onOpenSettings: () => void;
  isLoading: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const PRESET_PILLS = [
  { label: 'AI & Việc làm', query: 'AI có làm mất việc làm của con người trong tương lai?' },
  { label: 'Làm việc Từ xa (Remote)', query: 'Làm việc từ xa hay tại văn phòng hiệu quả hơn?' },
  { label: 'Xe Điện & Môi trường', query: 'Xe điện có thực sự xanh và bảo vệ môi trường hơn xe xăng?' },
  { label: 'Crypto & Pháp lý', query: 'Có nên áp dụng khung pháp lý chặt chẽ đối với thị trường Crypto?' },
];

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  onSearch,
  onOpenSettings,
  isLoading,
  theme,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');
  const hasKey = Boolean(ApiKeyRepository.getApiKey());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handlePillClick = (presetQuery: string) => {
    setQuery(presetQuery);
    onSearch(presetQuery);
  };

  return (
    <header className="header-section">
      <div className="header-top-bar">
        <div className="brand-badge">
          <BookOpen size={14} />
          <span>Omni-View Research Platform</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={onToggleTheme}
            className="theme-toggle-btn"
            title={`Chuyển sang giao diện ${theme === 'light' ? 'Tối (Dark)' : 'Sáng (Light)'}`}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            <span>{theme === 'light' ? 'Giao diện Tối' : 'Giao diện Sáng'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="pill-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderColor: hasKey ? 'var(--border-pro)' : 'var(--border-con)',
              backgroundColor: hasKey ? 'var(--accent-pro-bg)' : 'var(--accent-con-bg)',
              color: hasKey ? 'var(--accent-pro-text)' : 'var(--accent-con-text)',
              padding: '0.4rem 0.8rem',
              fontWeight: 600,
            }}
            title="Cấu hình Gemini API Key"
          >
            {hasKey ? <ShieldCheck size={15} /> : <Settings size={15} />}
            <span>{hasKey ? 'Gemini Key OK' : 'Nhập Gemini Key'}</span>
          </button>
        </div>
      </div>

      <h1 className="main-title">Nền Tảng Phân Tích Nghiên Cứu Đa Chiều</h1>
      <p className="main-subtitle">
        Trích xuất góc nhìn phản biện khách quan 2 mặt (Ủng hộ vs Phản đối) kèm trích dẫn số liệu & nguồn dữ liệu gốc thời gian thực.
      </p>

      <form onSubmit={handleSubmit} className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="Nhập đề tài hoặc câu hỏi tranh cãi cần nghiên cứu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="search-button" disabled={isLoading || !query.trim()}>
          <Search size={17} />
          {isLoading ? 'Đang truy vết...' : 'Nghiên cứu'}
        </button>
      </form>

      <div className="pills-container">
        {PRESET_PILLS.map((pill, idx) => (
          <button key={idx} className="pill-btn" onClick={() => handlePillClick(pill.query)} disabled={isLoading}>
            {pill.label}
          </button>
        ))}
      </div>
    </header>
  );
};
