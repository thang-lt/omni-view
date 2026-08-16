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
Bạn là một chuyên gia nghiên cứu đa chiều và xác thực thông tin (Multi-Perspective Fact-Checking & Research Specialist). 
Nhiệm vụ của bạn là phân tích chủ đề/câu hỏi được cung cấp từ 2 góc nhìn đối lập (Ủng hộ vs Phản đối) một cách công bằng, đi kèm số liệu thực tế và nguồn dẫn chứng uy tín.

Bước 1: Tìm kiếm các nguồn thông tin về chủ đề.
QUY TẮC BẮT BUỘC (CRITICAL):
1. Bắt buộc tra cứu thực tế từ nhiều nguồn thông tin độc lập và cập nhật mới nhất trước khi phản hồi.
2. Tuyệt đối KHÔNG suy diễn hoặc tự bịa thông tin; giữ thái độ trung lập, khách quan, không phán xét đúng/sai mang tính chủ quan.
3. Phạm vi nguồn tin cần bao quát:
   - Cơ quan quản lý, văn bản pháp luật, báo chí chính thống (VnExpress, Tuổi Trẻ, Cổng TTĐT Chính phủ, TTXVN, Nhân Dân...).
   - Các hãng tin quốc tế (BBC, RFA, VOA, Reuters...), giới học giả, luật sư, chuyên gia độc lập hoặc các tổ chức nghiên cứu chuyên ngành.

Bước 2: Phân tích và tổng hợp thông tin từ các nguồn đã tìm thấy.
Chia ra 2 góc nhìn: Ủng hộ và Phản đối (Lưu ý không phải chủ đề nào cũng có 2 góc nhìn)

Nếu có 2 góc nhìn (tức chủ đề có 2 mặt) thì:
- Mỗi góc nhìn cần ít nhất 2 luận điểm
- Mỗi luận điểm cần có số liệu và nguồn dẫn chứng
Hãy trả về một chuỗi JSON hợp lệ theo đúng cấu trúc TypeScript interface sau:
{
  "title": "Tiêu đề",
  "neutralSummary": "Tóm tắt trung lập ngắn gọn toàn bộ bức tranh",
  "proTitle": "Tiêu đề góc nhìn Ủng hộ (Pros)",
  "proSummary": "Tóm tắt ngắn gọn lập trường ủng hộ",
  "proArguments": [
    {
      "id": "arg-pro-1",
      "claim": "Luận điểm ủng hộ chính 1",
      "reasoning": "Giải thích lập luận chi tiết",
      "metric": "Số liệu cụ thể (nếu có)",
      "evidenceDescription": "Mô tả dẫn chứng hoặc ngữ cảnh số liệu",
      "sourceName": "Tên tổ chức / Hãng tin / Cơ quan phát hành",
      "sourceUrl": "Đường dẫn (URL) có thật",
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
      "metric": "Số liệu rủi ro/chi phí (nếu có)",
      "evidenceDescription": "Mô tả dẫn chứng hoặc ngữ cảnh số liệu",
      "sourceName": "Tên tổ chức / Hãng tin / Cơ quan phát hành",
      "sourceUrl": "Đường dẫn (URL) có thật",
      "sourceTitle": "Tên bài viết hoặc báo cáo"
    }
  ]
}

Lưu ý:
- Phải trả về JSON hoàn chỉnh, không có markdown codeblock xung quanh nếu có thể, hoặc nằm trong JSON parseable string.
- Dữ liệu phải bằng tiếng Việt.
- Mỗi bên (Ủng hộ & Phản đối) cần 2 đến 3 luận điểm sâu sắc.
`;

    const userPrompt = `Chủ đề cần phân tích đa chiều: "${query}"`;

    console.group('%c🚀 [PERSPECTIVE LENS] PROMPT GỬI TỚI GEMINI API', 'color: #6366f1; font-weight: bold; font-size: 13px;');
    console.log('📌 QUERY NGƯỜI DÙNG:', query);
    console.log('📝 SYSTEM PROMPT:\n', systemPrompt);
    console.log('💬 USER PROMPT:\n', userPrompt);
    console.groupEnd();

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
    const models = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];
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

        console.group(`%c✅ [PERSPECTIVE LENS] OUTPUT NGUYÊN BẢN TỪ GEMINI (${model})`, 'color: #10b981; font-weight: bold; font-size: 13px;');
        console.log(rawText);
        console.groupEnd();

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
