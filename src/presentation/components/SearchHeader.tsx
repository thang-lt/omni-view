import React, { useState } from 'react';
import { Search, Sparkles, Settings, ShieldCheck } from 'lucide-react';
import { ApiKeyRepository } from '../../infrastructure/config/ApiKeyRepository';

interface SearchHeaderProps {
  onSearch: (query: string) => void;
  onOpenSettings: () => void;
  isLoading: boolean;
}

const PRESET_PILLS = [
  { label: '🤖 AI & Việc làm', query: 'AI có làm mất việc làm của con người trong tương lai?' },
  { label: '🏠 Làm việc Từ xa (Remote)', query: 'Làm việc từ xa hay tại văn phòng hiệu quả hơn?' },
  { label: '⚡ Xe Điện & Môi trường', query: 'Xe điện có thực sự xanh và bảo vệ môi trường hơn xe xăng?' },
  { label: '💰 Crypto & Pháp lý', query: 'Có nên áp dụng khung pháp lý chặt chẽ đối với thị trường Crypto?' },
];

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  onSearch,
  onOpenSettings,
  isLoading,
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
    <header className="header-section" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, right: 0 }}>
        <button
          onClick={onOpenSettings}
          className="pill-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            borderColor: hasKey ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
            backgroundColor: hasKey ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            color: hasKey ? '#34d399' : '#fb7185',
            padding: '0.5rem 0.9rem',
          }}
          title="Cấu hình Gemini API Key"
        >
          {hasKey ? <ShieldCheck size={16} /> : <Settings size={16} />}
          <span>{hasKey ? 'Gemini Key OK' : 'Nhập Gemini Key'}</span>
        </button>
      </div>

      <div className="brand-badge">
        <Sparkles size={14} />
        Perspective Lens — Live Gemini AI
      </div>
      <h1 className="main-title">Lăng Kính Nghiên Cứu Đa Chiều</h1>
      <p className="main-subtitle">
        Tìm kiếm & phân tích trực tiếp với Google Gemini AI. Trích xuất toàn bộ bức tranh 2 mặt (Ủng hộ vs Phản đối) cùng số liệu thực tế.
      </p>

      <form onSubmit={handleSubmit} className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="Nhập bất kỳ chủ đề hoặc câu hỏi tranh cãi nào..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="search-button" disabled={isLoading || !query.trim()}>
          <Search size={18} />
          {isLoading ? 'Đang phân tích...' : 'Phân tích'}
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
