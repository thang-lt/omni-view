import type { IPerspectiveAnalyzer } from '../../domain/repositories/IPerspectiveAnalyzer';
import { Topic } from '../../domain/models/Topic';
import { Perspective } from '../../domain/models/Perspective';
import { Argument } from '../../domain/models/Argument';
import { Evidence } from '../../domain/models/Evidence';
import { Citation } from '../../domain/models/Citation';
import { Stance } from '../../domain/models/Stance';
import { RawSource } from '../../domain/models/RawSource';
import { ApiKeyRepository } from '../config/ApiKeyRepository';

export interface MultiAgentStageModels {
  sourceAgentModel?: string;
  proAgentModel?: string;
  conAgentModel?: string;
  synthesisAgentModel?: string;
}

interface Stage1RawSourcesOutput {
  rawSources: Array<{
    id: string;
    sourceName: string;
    title: string;
    url: string;
    summary: string;
    rawExcerpt?: string;
    publisherType?: string;
  }>;
}

interface Stage2ProArgumentsOutput {
  proTitle: string;
  proSummary: string;
  proArguments: Array<{
    id: string;
    claim: string;
    reasoning: string;
    sourceIds?: string[];
    validityReasons?: string[];
    argumentCaveats?: string[];
    sourceBiasNotes?: string;
    metric?: string;
    evidenceDescription?: string;
    sourceName?: string;
    sourceUrl?: string;
    sourceTitle?: string;
  }>;
}

interface Stage3ConArgumentsOutput {
  conTitle: string;
  conSummary: string;
  conArguments: Array<{
    id: string;
    claim: string;
    reasoning: string;
    sourceIds?: string[];
    validityReasons?: string[];
    argumentCaveats?: string[];
    sourceBiasNotes?: string;
    metric?: string;
    evidenceDescription?: string;
    sourceName?: string;
    sourceUrl?: string;
    sourceTitle?: string;
  }>;
}

interface Stage4SynthesisOutput {
  title: string;
  neutralSummary: string;
}

export class GeminiPerspectiveAnalyzer implements IPerspectiveAnalyzer {
  private stageModels: MultiAgentStageModels;

  constructor(stageModels?: MultiAgentStageModels) {
    this.stageModels = stageModels || {
      sourceAgentModel: 'gemini-flash-latest',
      proAgentModel: 'gemini-flash-latest',
      conAgentModel: 'gemini-flash-latest',
      synthesisAgentModel: 'gemini-flash-latest',
    };
  }

  public async analyzeTopic(query: string, onProgress?: (step: number, stepName: string) => void): Promise<Topic> {
    const apiKey = ApiKeyRepository.getApiKey();
    if (!apiKey) {
      throw new Error('Chưa cấu hình Google Gemini API Key. Vui lòng nhấn vào biểu tượng Đặt Key (Gear) để nhập Gemini API Key.');
    }

    console.group('%c🚀 [URL-FIRST MULTI-AGENT PIPELINE] BẮT ĐẦU CHUỖI 4 PROMPT ĐỌC NỘI DUNG GỐC', 'color: #6366f1; font-weight: bold; font-size: 14px;');
    console.log('📌 QUERY:', query);

    // =========================================================================
    // STAGE 1: AGENT TRUY VẾT URL THẬT & TRÍCH ĐOẠN VĂN BẢN GỐC (RAW EXCERPT)
    // =========================================================================
    onProgress?.(1, 'Agent 1: Tra cứu & trích xuất danh sách URL thật + Trích đoạn thô nguyên bản...');

    const systemPromptStage1 = `
Bạn là Agent Chuyên gia Tra cứu URL & Nội dung Thô Nguyên bản (URL & Raw Content Discovery Specialist).
BỐI CẢNH & PHẠM VI QUÉT:
- Bạn chịu trách nhiệm tra cứu thực tế từ các nguồn thông tin độc lập và cập nhật mới nhất trước khi phản hồi.
- Phạm vi nguồn tin bao quát:
  1. Cơ quan quản lý, văn bản pháp luật, báo chí chính thống (VnExpress, Tuổi Trẻ, Cổng TTĐT Chính phủ, TTXVN, Nhân Dân...).
  2. Các hãng tin quốc tế (BBC, RFA, VOA, Reuters...), giới học giả, luật sư, chuyên gia độc lập hoặc các tổ chức nghiên cứu chuyên ngành (Nature, MIT, Harvard, WEF...).
- Trích xuất ÍT NHẤT 6 NGUỒN TIN THỰC TẾ kèm URL THẬT VÀ TRỰC TIẾP (ví dụ: https://domain.com/path-to-article.html), đánh mã id dạng "src-1", "src-2", "src-3", "src-4", "src-5", "src-6".
- QUY TẮC NGUYÊN BẢN: Cung cấp trường "rawExcerpt" chứa trích đoạn văn bản gốc nguyên bản từ bài viết tại URL đó (từ 2 đến 4 câu nguyên bản, KHÔNG ĐƯỢC tóm tắt hay bóp méo suy diễn) để làm dữ liệu gốc cho các Agent phân tích sau.

Trả về duy nhất chuỗi JSON hợp lệ theo định dạng:
{
  "rawSources": [
    {
      "id": "src-1",
      "sourceName": "Tên báo / Tổ chức phát hành",
      "title": "Tiêu đề bài viết hoặc báo cáo gốc",
      "url": "https://domain.com/path-to-article.html",
      "summary": "Tóm tắt ngắn gọn lập trường của nguồn này",
      "rawExcerpt": "Trích đoạn văn bản thô nguyên bản trích từ URL bài viết gốc",
      "publisherType": "Báo chí chính thống / Cơ quan quản lý / Hãng tin quốc tế / Viện nghiên cứu / Chuyên gia độc lập"
    }
  ]
}
`;
    const userPromptStage1 = `Chủ đề tra cứu danh sách URL thật và trích đoạn thô nguyên bản: "${query}"`;
    const preferredModelsStage1 = [this.stageModels.sourceAgentModel || 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];

    const rawTextStage1 = await this.callGeminiApi(apiKey, systemPromptStage1, userPromptStage1, preferredModelsStage1, 'AGENT 1 - DISCOVER URLS & RAW EXCERPTS');
    const stage1Data = this.parseJson<Stage1RawSourcesOutput>(rawTextStage1);

    const rawSources = (stage1Data.rawSources || []).map(
      (s, idx) =>
        new RawSource({
          id: s.id || `src-${idx + 1}`,
          url: s.url || 'https://google.com',
          title: s.title || s.sourceName || `Nguồn tin ${idx + 1}`,
          sourceName: s.sourceName || 'Nguồn tin',
          summary: s.summary || '',
          rawExcerpt: s.rawExcerpt || s.summary || '',
          publisherType: s.publisherType || 'Chưa phân loại',
        })
    );

    // =========================================================================
    // STAGE 2: AGENT PHÂN TÍCH LẬP TRƯỜNG ỦNG HỘ (ĐỌC TRỰC TIẾP TỪ URL & RAW EXCERPTS)
    // =========================================================================
    onProgress?.(2, 'Agent 2: Đọc trực tiếp từ URL nguồn thô & phân tích sâu luận điểm ủng hộ...');

    const systemPromptStage2 = `
Bạn là Agent Chuyên gia Phân tích Lập trường Ủng hộ (Pro Perspective Deep Analyst - Direct Content Reader).
BỐI CẢNH & PHẠM VI:
- Bạn nhận danh sách các URL THẬT và TRÍCH ĐOẠN VĂN BẢN GỐC (rawExcerpt) từ Bước 1.
- NGUYÊN TẮC CHỐNG BÓP MÉO THÔNG TIN: Đọc và phân tích trực tiếp trên nội dung trích đoạn thô và URL gốc được cung cấp. Tuyệt đối KHÔNG suy diễn hay dùng bản tóm tắt qua trung gian.
- Trích xuất 2 đến 3 luận điểm ủng hộ chính.
- Với MỖI luận điểm:
  1. Gán "sourceIds" liên kết (ví dụ ["src-1", "src-3"]) tương ứng với URL nguồn thô đã đọc.
  2. "validityReasons": Phân tích các lý do giải thích vì sao luận điểm này ĐÚNG / HỢP LÝ dựa trên đúng bằng chứng nguyên bản trong URL/trích đoạn gốc.
  3. "argumentCaveats": Nêu các lưu ý & hạn chế của luận điểm (bối cảnh áp dụng, điều kiện biên, rủi ro).
  4. "sourceBiasNotes": Đánh giá thiên kiến & độ độc lập của nguồn tin sở hữu URL này (xu hướng truyền thông, lợi ích tài chính hay góc nhìn riêng).

Trả về duy nhất chuỗi JSON hợp lệ theo định dạng:
{
  "proTitle": "Tiêu đề góc nhìn Ủng hộ (Pros)",
  "proSummary": "Tóm tắt ngắn gọn lập trường ủng hộ",
  "proArguments": [
    {
      "id": "arg-pro-1",
      "claim": "Luận điểm ủng hộ chính 1",
      "reasoning": "Giải thích lập luận chi tiết dựa trên nội dung gốc",
      "sourceIds": ["src-1"],
      "validityReasons": ["Lý do 1 giải thích vì sao luận điểm đúng dựa trên URL gốc", "Lý do 2"],
      "argumentCaveats": ["Lưu ý 1 về điều kiện áp dụng hoặc rủi ro"],
      "sourceBiasNotes": "Đánh giá thiên kiến & độ uy tín của nhà xuất bản sở hữu URL này",
      "metric": "Số liệu (+35% Năng suất)",
      "evidenceDescription": "Mô tả số liệu từ URL gốc",
      "sourceName": "Tên nguồn tin",
      "sourceUrl": "https://domain.com/path-to-article.html",
      "sourceTitle": "Tiêu đề bài viết"
    }
  ]
}
`;
    const userPromptStage2 = `Chủ đề: "${query}"\n\nDanh sách URL Thật & Trích đoạn Văn bản Gốc (Raw Excerpts) từ Bước 1:\n${JSON.stringify(rawSources, null, 2)}`;
    const preferredModelsStage2 = [this.stageModels.proAgentModel || 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];

    const rawTextStage2 = await this.callGeminiApi(apiKey, systemPromptStage2, userPromptStage2, preferredModelsStage2, 'AGENT 2 - READ RAW URLS & PRO ANALYSIS');
    const stage2Data = this.parseJson<Stage2ProArgumentsOutput>(rawTextStage2);

    // =========================================================================
    // STAGE 3: AGENT PHÂN TÍCH LẬP TRƯỜNG PHẢN ĐỐI (ĐỌC TRỰC TIẾP TỪ URL & RAW EXCERPTS)
    // =========================================================================
    onProgress?.(3, 'Agent 3: Đọc trực tiếp từ URL nguồn thô & phân tích sâu luận điểm phản đối...');

    const systemPromptStage3 = `
Bạn là Agent Chuyên gia Phân tích Lập trường Phản đối & Rủi ro (Con Perspective & Risk Analyst - Direct Content Reader).
BỐI CẢNH & PHẠM VI:
- Bạn nhận danh sách các URL THẬT và TRÍCH ĐOẠN VĂN BẢN GỐC (rawExcerpt) từ Bước 1.
- NGUYÊN TẮC CHỐNG BÓP MÉO THÔNG TIN: Đọc và phân tích phản biện trực tiếp trên nội dung thô và URL gốc. KHÔNG suy diễn hay đọc bản tóm tắt trung gian.
- Trích xuất 2 đến 3 luận điểm phản đối/phản biện chính.
- Với MỖI luận điểm:
  1. Gán "sourceIds" liên kết (ví dụ ["src-2", "src-5"]) tương ứng với URL nguồn thô đã đọc.
  2. "validityReasons": Các lý do vì sao góc nhìn phản biện này HỢP LÝ / ĐÚNG dựa trên bằng chứng nguyên bản.
  3. "argumentCaveats": Các lưu ý & giới hạn của góc nhìn phản đối.
  4. "sourceBiasNotes": Đánh giá thiên kiến & độ độc lập của nhà xuất bản sở hữu URL phản biện này.

Trả về duy nhất chuỗi JSON hợp lệ theo định dạng:
{
  "conTitle": "Tiêu đề góc nhìn Phản biện (Cons)",
  "conSummary": "Tóm tắt ngắn gọn lập trường phản biện",
  "conArguments": [
    {
      "id": "arg-con-1",
      "claim": "Luận điểm phản biện chính 1",
      "reasoning": "Giải thích lập luận phản biện dựa trên nội dung gốc",
      "sourceIds": ["src-2"],
      "validityReasons": ["Lý do 1 vì sao phản biện này hợp lý dựa trên URL gốc"],
      "argumentCaveats": ["Lưu ý giới hạn của lập trường phản đối"],
      "sourceBiasNotes": "Đánh giá thiên kiến & độ độc lập của nhà xuất bản sở hữu URL này",
      "metric": "Số liệu chi phí/rủi ro",
      "evidenceDescription": "Mô tả số liệu từ URL gốc",
      "sourceName": "Tên nguồn tin",
      "sourceUrl": "https://domain.com/path-to-article.html",
      "sourceTitle": "Tiêu đề bài viết"
    }
  ]
}
`;
    const userPromptStage3 = `Chủ đề: "${query}"\n\nDanh sách URL Thật & Trích đoạn Văn bản Gốc (Raw Excerpts) từ Bước 1:\n${JSON.stringify(rawSources, null, 2)}`;
    const preferredModelsStage3 = [this.stageModels.conAgentModel || 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];

    const rawTextStage3 = await this.callGeminiApi(apiKey, systemPromptStage3, userPromptStage3, preferredModelsStage3, 'AGENT 3 - READ RAW URLS & CON ANALYSIS');
    const stage3Data = this.parseJson<Stage3ConArgumentsOutput>(rawTextStage3);

    // =========================================================================
    // STAGE 4: AGENT TỔNG HỢP & ĐÁNH GIÁ TRUNG LẬP (SYNTHESIS AUDITOR)
    // =========================================================================
    onProgress?.(4, 'Agent 4: Kiểm định đối soát 2 chiều với URL gốc & tổng hợp lăng kính khách quan...');

    const systemPromptStage4 = `
Bạn là Agent Chuyên gia Đánh giá Trung lập & Tổng hợp Đa chiều (Neutral Summary & Synthesis Auditor).
BỐI CẢNH & PHẠM VI:
- Bạn nhận kết quả đối soát chính xác từ Agent 1 (URL nguồn thô), Agent 2 (Ủng hộ) và Agent 3 (Phản đối).
- Nhiệm vụ của bạn là đưa ra một Tiêu đề chuẩn xác và một bản Tóm tắt Trung lập (Neutral Summary) 2-3 câu hoàn toàn khách quan, không thiên vị phía nào.

Trả về duy nhất chuỗi JSON hợp lệ theo định dạng:
{
  "title": "Tiêu đề tổng quan phân tích",
  "neutralSummary": "Tóm tắt trung lập 2-3 câu ngắn gọn toàn cảnh bức tranh 2 mặt..."
}
`;
    const userPromptStage4 = `Chủ đề: "${query}"\n\nDanh sách URL Nguồn thô:\n${JSON.stringify(rawSources, null, 2)}\n\nỦng hộ:\n${JSON.stringify(stage2Data, null, 2)}\n\nPhản đối:\n${JSON.stringify(stage3Data, null, 2)}`;
    const preferredModelsStage4 = [this.stageModels.synthesisAgentModel || 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];

    const rawTextStage4 = await this.callGeminiApi(apiKey, systemPromptStage4, userPromptStage4, preferredModelsStage4, 'AGENT 4 - SYNTHESIS AUDITOR');
    const stage4Data = this.parseJson<Stage4SynthesisOutput>(rawTextStage4);

    console.groupEnd();

    return this.assembleTopicDomain(query, rawSources, stage2Data, stage3Data, stage4Data);
  }

  private async callGeminiApi(
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
    preferredModels: string[],
    stageName: string
  ): Promise<string> {
    const requestBody = {
      contents: [
        {
          parts: [{ text: systemPrompt }, { text: userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };

    let lastError: Error | null = null;

    for (const model of preferredModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
          throw new Error('Gemini API không trả về nội dung.');
        }

        console.log(`%c[${stageName}] Thành công với model ${model}`, 'color: #10b981; font-weight: bold;');
        return rawText;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (lastError.message.includes('API key') || lastError.message.includes('INVALID_ARGUMENT')) {
          break;
        }
      }
    }

    throw lastError || new Error(`Không thể thực thi ${stageName}.`);
  }

  private parseJson<T>(rawText: string): T {
    let cleanText = rawText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      return JSON.parse(cleanText) as T;
    } catch {
      throw new Error('Dữ liệu phản hồi từ Gemini API không đúng định dạng JSON.');
    }
  }

  private assembleTopicDomain(
    query: string,
    rawSources: RawSource[],
    stage2: Stage2ProArgumentsOutput,
    stage3: Stage3ConArgumentsOutput,
    stage4: Stage4SynthesisOutput
  ): Topic {
    const proArguments = (stage2.proArguments || []).map((arg, idx) => {
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
        id: arg.id || `arg-pro-${idx + 1}`,
        claim: arg.claim,
        reasoning: arg.reasoning,
        sourceIds: arg.sourceIds && arg.sourceIds.length > 0 ? arg.sourceIds : rawSources.slice(0, 1).map((s) => s.id),
        validityReasons: arg.validityReasons || [],
        argumentCaveats: arg.argumentCaveats || [],
        sourceBiasNotes: arg.sourceBiasNotes || '',
        evidences,
        citations,
      });
    });

    const conArguments = (stage3.conArguments || []).map((arg, idx) => {
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
        id: arg.id || `arg-con-${idx + 1}`,
        claim: arg.claim,
        reasoning: arg.reasoning,
        sourceIds: arg.sourceIds && arg.sourceIds.length > 0 ? arg.sourceIds : rawSources.slice(1, 2).map((s) => s.id),
        validityReasons: arg.validityReasons || [],
        argumentCaveats: arg.argumentCaveats || [],
        sourceBiasNotes: arg.sourceBiasNotes || '',
        evidences,
        citations,
      });
    });

    const perspectives = [
      new Perspective({
        stance: Stance.PRO,
        title: stage2.proTitle || 'Góc nhìn Ủng hộ',
        summary: stage2.proSummary || '',
        arguments: proArguments,
      }),
      new Perspective({
        stance: Stance.CON,
        title: stage3.conTitle || 'Góc nhìn Phản biện',
        summary: stage3.conSummary || '',
        arguments: conArguments,
      }),
    ];

    return Topic.create({
      title: stage4.title || query,
      query: query,
      neutralSummary: stage4.neutralSummary || '',
      rawSources: rawSources,
      perspectives: perspectives,
    });
  }
}
