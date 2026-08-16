import type { IPerspectiveAnalyzer } from '../../domain/repositories/IPerspectiveAnalyzer';
import { Topic } from '../../domain/models/Topic';
import { Perspective } from '../../domain/models/Perspective';
import { Argument } from '../../domain/models/Argument';
import { Evidence } from '../../domain/models/Evidence';
import { Citation } from '../../domain/models/Citation';
import { Stance } from '../../domain/models/Stance';
import { ApiKeyRepository } from '../config/ApiKeyRepository';

interface GeminiResponseJson {
  title: string;
  neutralSummary: string;
  proTitle: string;
  proSummary: string;
  proArguments: Array<{
    id: string;
    claim: string;
    reasoning: string;
    metric?: string;
    evidenceDescription?: string;
    sourceName?: string;
    sourceUrl?: string;
    sourceTitle?: string;
  }>;
  conTitle: string;
  conSummary: string;
  conArguments: Array<{
    id: string;
    claim: string;
    reasoning: string;
    metric?: string;
    evidenceDescription?: string;
    sourceName?: string;
    sourceUrl?: string;
    sourceTitle?: string;
  }>;
}

export class GeminiPerspectiveAnalyzer implements IPerspectiveAnalyzer {
  public async analyzeTopic(query: string): Promise<Topic> {
    const apiKey = ApiKeyRepository.getApiKey();
    if (!apiKey) {
      throw new Error('Chưa cấu hình Google Gemini API Key. Vui lòng nhấn vào biểu tượng Đặt Key (Gear) để nhập Gemini API Key.');
    }

    const systemPrompt = `
Bạn là "Perspective Lens" — hệ thống nghiên cứu đa chiều khách quan. 
Nhiệm vụ của bạn là phân tích chủ đề/câu hỏi được cung cấp từ 2 góc nhìn đối lập (Ủng hộ vs Phản đối) một cách công bằng, trung lập, đi kèm số liệu thực tế và nguồn dẫn chứng uy tín.

Hãy trả về duy nhất một chuỗi JSON hợp lệ theo đúng cấu trúc TypeScript interface sau:
{
  "title": "Tên chủ đề được chuẩn hóa",
  "neutralSummary": "Tóm tắt trung lập 2-3 câu ngắn gọn toàn bộ bức tranh",
  "proTitle": "Tiêu đề góc nhìn Ủng hộ (Pros)",
  "proSummary": "Tóm tắt ngắn gọn lập trường ủng hộ",
  "proArguments": [
    {
      "id": "arg-pro-1",
      "claim": "Luận điểm ủng hộ chính 1",
      "reasoning": "Giải thích lập luận chi tiết",
      "metric": "Số liệu cụ thể (VD: +40% Năng suất, 97M Việc làm...)",
      "evidenceDescription": "Mô tả dẫn chứng hoặc ngữ cảnh số liệu",
      "sourceName": "Tên tổ chức/nguồn uy tín (VD: World Economic Forum, MIT)",
      "sourceUrl": "https://url-nguon-tham-khao.com",
      "sourceTitle": "Tên bài viết hoặc báo cáo"
    }
  ],
  "conTitle": "Tiêu đề góc nhìn Phản biện (Cons)",
  "conSummary": "Tóm tắt ngắn gọn lập trường phản biện",
  "conArguments": [
    {
      "id": "arg-con-1",
      "claim": "Luận điểm phản biện chính 1",
      "reasoning": "Giải thích lập luận chi tiết",
      "metric": "Số liệu rủi ro/chi phí (VD: -18% Kết nối, $11k Chi phí...)",
      "evidenceDescription": "Mô tả dẫn chứng hoặc ngữ cảnh số liệu",
      "sourceName": "Tên tổ chức/nguồn uy tín (VD: Goldman Sachs, Harvard)",
      "sourceUrl": "https://url-nguon-tham-khao.com",
      "sourceTitle": "Tên bài viết hoặc báo cáo"
    }
  ]
}

Lưu ý:
- Phải trả về JSON hoàn chỉnh, không có markdown codeblock xung quanh nếu có thể, hoặc nằm trong JSON parseable string.
- Dữ liệu phải bằng tiếng Việt.
- Nguồn sourceUrl phải là đường dẫn URL hợp lệ bắt đầu bằng https://.
- Mỗi bên (Ủng hộ & Phản đối) cần 2 đến 3 luận điểm sâu sắc.
`;

    const userPrompt = `Chủ đề cần phân tích đa chiều: "${query}"`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            { text: userPrompt },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };

    // Models to try in order of preference
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const message = errData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
          throw new Error(`Gemini API (${model}) lỗi: ${message}`);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new Error('Gemini API không trả về kết quả nội dung.');
        }

        const parsedJson = this.parseJsonFromText(rawText);
        return this.mapJsonToTopic(query, parsedJson);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // If it's an API Key error (400/403), stop retrying other models
        if (lastError.message.includes('API key') || lastError.message.includes('INVALID_ARGUMENT')) {
          break;
        }
      }
    }

    throw lastError || new Error('Không thể gọi Gemini API.');
  }

  private parseJsonFromText(rawText: string): GeminiResponseJson {
    let cleanText = rawText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      return JSON.parse(cleanText);
    } catch {
      throw new Error('Dữ liệu phản hồi từ Gemini API không đúng định dạng JSON.');
    }
  }

  private mapJsonToTopic(query: string, json: GeminiResponseJson): Topic {
    const proArguments = (json.proArguments || []).map((arg, idx) => {
      const evidences = arg.metric
        ? [
            new Evidence({
              metric: arg.metric,
              description: arg.evidenceDescription || arg.claim,
            }),
          ]
        : [];

      const citations = arg.sourceUrl && arg.sourceName
        ? [
            new Citation({
              url: arg.sourceUrl.startsWith('http') ? arg.sourceUrl : `https://${arg.sourceUrl}`,
              title: arg.sourceTitle || arg.sourceName,
              sourceName: arg.sourceName,
            }),
          ]
        : [];

      return new Argument({
        id: arg.id || `arg-pro-${idx}`,
        claim: arg.claim,
        reasoning: arg.reasoning,
        evidences,
        citations,
      });
    });

    const conArguments = (json.conArguments || []).map((arg, idx) => {
      const evidences = arg.metric
        ? [
            new Evidence({
              metric: arg.metric,
              description: arg.evidenceDescription || arg.claim,
            }),
          ]
        : [];

      const citations = arg.sourceUrl && arg.sourceName
        ? [
            new Citation({
              url: arg.sourceUrl.startsWith('http') ? arg.sourceUrl : `https://${arg.sourceUrl}`,
              title: arg.sourceTitle || arg.sourceName,
              sourceName: arg.sourceName,
            }),
          ]
        : [];

      return new Argument({
        id: arg.id || `arg-con-${idx}`,
        claim: arg.claim,
        reasoning: arg.reasoning,
        evidences,
        citations,
      });
    });

    const perspectives = [
      new Perspective({
        stance: Stance.PRO,
        title: json.proTitle || 'Góc nhìn Ủng hộ',
        summary: json.proSummary || '',
        arguments: proArguments,
      }),
      new Perspective({
        stance: Stance.CON,
        title: json.conTitle || 'Góc nhìn Phản biện',
        summary: json.conSummary || '',
        arguments: conArguments,
      }),
    ];

    return Topic.create({
      title: json.title || query,
      query: query,
      neutralSummary: json.neutralSummary || '',
      perspectives: perspectives,
    });
  }
}
