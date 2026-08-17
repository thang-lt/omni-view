import React, { useState, useEffect } from 'react';
import { ApiKeyRepository } from '../../infrastructure/config/ApiKeyRepository';
import { Key, X, CheckCircle2, ShieldAlert } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(ApiKeyRepository.getApiKey());
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    ApiKeyRepository.saveApiKey(apiKey);
    setIsSaved(true);
    onKeySaved();
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-modal)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.2rem',
            right: '1.2rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-subtle)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Key size={22} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>Cấu hình Google Gemini API Key</h2>
        </div>

        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
          Omni-View sẽ trực tiếp gửi truy vấn nghiên cứu tới Google Gemini API để tổng hợp góc nhìn 2 chiều và bằng chứng số liệu thời gian thực.
        </p>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.4rem',
              }}
            >
              Gemini API Key của bạn:
            </label>

            <div
              style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.2rem',
              }}
            >
              <input
                type="password"
                className="search-input"
                style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.95rem' }}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              fontSize: '0.82rem',
              color: 'var(--text-subtle)',
              marginBottom: '1.5rem',
              background: 'var(--accent-primary-bg)',
              border: '1px solid rgba(37, 99, 235, 0.15)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <ShieldAlert size={16} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Key của bạn được bảo mật tuyệt đối và chỉ lưu trực tiếp tại bộ nhớ trình duyệt (localStorage) trên máy của bạn.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="pill-btn"
              onClick={onClose}
              style={{ padding: '0.5rem 1.2rem' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="search-button"
              style={{ padding: '0.5rem 1.4rem' }}
              disabled={!apiKey.trim()}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 size={16} /> Đã lưu Key!
                </>
              ) : (
                'Lưu Key'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
