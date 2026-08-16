import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiPerspectiveAnalyzer } from '../GeminiPerspectiveAnalyzer';
import { ApiKeyRepository } from '../../config/ApiKeyRepository';
import { Stance } from '../../../domain/models/Stance';

describe('Infrastructure Layer: GeminiPerspectiveAnalyzer', () => {
  let analyzer: GeminiPerspectiveAnalyzer;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    analyzer = new GeminiPerspectiveAnalyzer();
  });

  it('should throw error if API key is not configured', async () => {
    await expect(analyzer.analyzeTopic('Test query')).rejects.toThrow(
      'Chưa cấu hình Google Gemini API Key'
    );
  });

  it('should call Gemini API and return domain Topic model', async () => {
    ApiKeyRepository.saveApiKey('mock-gemini-key');

    const fakeJsonResponse = {
      title: 'Phân tích Trí tuệ Nhân tạo',
      neutralSummary: 'AI mang đến cả cơ hội lẫn thách thức.',
      proTitle: 'Ủng hộ AI',
      proSummary: 'Tăng năng suất',
      proArguments: [
        {
          id: 'p1',
          claim: 'Tăng tốc công việc',
          reasoning: 'AI tự động hóa quy trình',
          metric: '+50% Năng suất',
          evidenceDescription: 'Khảo sát nhân viên',
          sourceName: 'Harvard',
          sourceUrl: 'https://harvard.edu/ai',
          sourceTitle: 'AI Report',
        },
      ],
      conTitle: 'Phản đối AI',
      conSummary: 'Nguy cơ mất việc',
      conArguments: [
        {
          id: 'c1',
          claim: 'Thay thế lao động',
          reasoning: 'Tự động hóa nhân lực',
          metric: '300M Việc làm',
          evidenceDescription: 'Goldman Sachs Report',
          sourceName: 'Goldman Sachs',
          sourceUrl: 'https://goldmansachs.com/ai',
          sourceTitle: 'Job Impact',
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(fakeJsonResponse) }],
            },
          },
        ],
      }),
    } as unknown as Response);

    const topic = await analyzer.analyzeTopic('AI tác động thế nào?');

    expect(topic.title).toBe('Phân tích Trí tuệ Nhân tạo');
    expect(topic.getPerspective(Stance.PRO)?.title).toBe('Ủng hộ AI');
    expect(topic.getPerspective(Stance.CON)?.title).toBe('Phản đối AI');
    expect(topic.getPerspective(Stance.PRO)?.arguments[0].evidences[0].metric).toBe('+50% Năng suất');
  });
});
