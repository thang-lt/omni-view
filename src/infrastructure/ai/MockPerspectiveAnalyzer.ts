import type { IPerspectiveAnalyzer } from '../../domain/repositories/IPerspectiveAnalyzer';
import { Topic } from '../../domain/models/Topic';
import { Perspective } from '../../domain/models/Perspective';
import { Argument } from '../../domain/models/Argument';
import { Evidence } from '../../domain/models/Evidence';
import { Citation } from '../../domain/models/Citation';
import { Stance } from '../../domain/models/Stance';
import { RawSource } from '../../domain/models/RawSource';

export class MockPerspectiveAnalyzer implements IPerspectiveAnalyzer {
  private static readonly PRESET_RAW_SOURCES: RawSource[] = [
    new RawSource({
      id: 'src-1',
      sourceName: 'World Economic Forum',
      title: 'Future of Jobs Report 2023 & Labor Trends',
      url: 'https://weforum.org/reports/future-of-jobs-2023',
      summary: 'Dự báo chuyển dịch lao động và 97 triệu vị trí mới nhờ công nghệ tự động hóa và AI.',
      publisherType: 'Tổ chức Quốc tế',
    }),
    new RawSource({
      id: 'src-2',
      sourceName: 'MIT Economics Department',
      title: 'Experimental Evidence on Productivity Effects of Generative AI',
      url: 'https://economics.mit.edu/research/ai-productivity',
      summary: 'Khảo sát thực nghiệm cho thấy nhân sự sử dụng Generative AI tăng trung bình 40% hiệu suất làm việc.',
      publisherType: 'Viện Nghiên cứu / Học thuật',
    }),
    new RawSource({
      id: 'src-3',
      sourceName: 'Goldman Sachs Research',
      title: 'The Potentially Large Effects of AI on Economic Growth',
      url: 'https://goldmansachs.com/insights/pages/generative-ai-could-raise-global-gdp-by-7-percent.html',
      summary: 'Cảnh báo 300 triệu việc làm toàn thời gian có nguy cơ bị tác động hoặc thay thế một phần bởi tự động hóa.',
      publisherType: 'Báo cáo Đầu tư / Tài chính',
    }),
  ];

  public async analyzeTopic(query: string, onProgress?: (step: number, stepName: string) => void): Promise<Topic> {
    onProgress?.(1, 'Agent 1: Đang tìm kiếm & thu thập các nguồn dữ liệu thật...');
    await new Promise((resolve) => setTimeout(resolve, 250));

    onProgress?.(2, 'Agent 2: Đang phân tích sâu các luận điểm ủng hộ...');
    await new Promise((resolve) => setTimeout(resolve, 250));

    onProgress?.(3, 'Agent 3: Đang phân tích sâu các luận điểm phản biện...');
    await new Promise((resolve) => setTimeout(resolve, 250));

    onProgress?.(4, 'Agent 4: Đang đánh giá thiên kiến nguồn tin & tổng hợp...');
    await new Promise((resolve) => setTimeout(resolve, 200));

    const lower = query.toLowerCase();

    if (lower.includes('ai') || lower.includes('trí tuệ nhân tạo') || lower.includes('robot') || lower.includes('việc làm')) {
      return this.getAiTopic();
    }

    return this.generateDynamicTopic(query);
  }

  private getAiTopic(): Topic {
    return Topic.create({
      id: 'topic-ai-workforce',
      title: 'Tác động của AI đối với Việc làm & Thị trường Lao động',
      query: 'AI có thay thế công việc của con người trong tương lai?',
      neutralSummary:
        'AI đang tự động hóa các tác vụ lặp đi lặp lại và gia tăng năng suất đáng kể, đồng thời làm dấy lên lo ngại về việc tự động hóa làm mất việc làm nhưng lại mở ra nhiều ngành nghề mới yêu cầu kỹ năng cao.',
      rawSources: MockPerspectiveAnalyzer.PRESET_RAW_SOURCES,
      perspectives: [
        new Perspective({
          stance: Stance.PRO,
          title: 'Góc nhìn Tích cực: Tăng Tốc Năng Suất & Tạo Ngành Nghề Mới',
          summary: 'AI giúp giảm bớt công việc chân tay và công việc thủ công, nâng cao khả năng sáng tạo và tạo ra các cơ hội việc làm mới.',
          arguments: [
            new Argument({
              id: 'arg-ai-pro-1',
              claim: 'Tăng trưởng năng suất lao động đột phá',
              reasoning: 'Các công cụ Generative AI giúp lập trình viên và nhà phân tích hoàn thành công việc nhanh hơn 40-50%.',
              sourceIds: ['src-1', 'src-2'],
              validityReasons: [
                'Cơ sở dữ liệu thực nghiệm từ MIT & Stanford kiểm chứng trên 5,000 chuyên viên.',
                'Giảm thiểu sai sót do yếu tố con người trong các công việc phân tích số liệu lặp lại.',
                'Mở ra khả năng xử lý lượng dữ liệu khổng lồ trong thời gian ngắn.',
              ],
              argumentCaveats: [
                'Hiệu quả phụ thuộc lớn vào năng lực đặt câu lệnh (Prompt Engineering) và kỹ năng sử dụng của người lao động.',
                'Yêu cầu đầu tư ban đầu về hạ tầng và đào tạo nhân sự.',
              ],
              sourceBiasNotes: 'Nguồn dữ liệu từ các viện nghiên cứu kinh tế độc lập (MIT, Stanford), có độ uy tín học thuật cao (98%), ít chịu ảnh hưởng từ lợi ích thương mại.',
              evidences: [
                new Evidence({
                  metric: '+40% Năng suất',
                  description: 'Nghiên cứu của MIT & Stanford cho thấy nhân viên hỗ trợ dùng AI tăng 14% năng suất mỗi giờ và nhân viên mới tăng 34%.',
                }),
                new Evidence({
                  metric: '97 Triệu Việc Làm Mới',
                  description: 'Báo cáo của WEF dự báo đến 2025 AI tạo ra 97 triệu vị trí việc làm mới.',
                }),
              ],
              citations: [
                new Citation({
                  url: 'https://weforum.org/reports/future-of-jobs-2023',
                  title: 'Future of Jobs Report 2023',
                  sourceName: 'World Economic Forum',
                  credibilityScore: 0.96,
                }),
              ],
            }),
          ],
        }),
        new Perspective({
          stance: Stance.CON,
          title: 'Góc nhìn Phản biện: Rủi ro Dịch chuyển Lao động & Bất bình đẳng',
          summary: 'Sự phát triển quá nhanh của AI có thể khiến hàng triệu lao động bị đào thải khi không kịp chuyển đổi kỹ năng.',
          arguments: [
            new Argument({
              id: 'arg-ai-con-1',
              claim: 'Áp lực thay thế việc làm văn phòng và trí óc',
              reasoning: 'Không chỉ lao động phổ thông, AI thế hệ mới ảnh hưởng trực tiếp đến biên dịch, viết lách và lập trình cơ bản.',
              sourceIds: ['src-3'],
              validityReasons: [
                'Mô hình kinh tế lượng từ Goldman Sachs chỉ ra sự trùng lặp cao giữa năng lực AI và mô tả công việc văn phòng.',
                'Xu hướng cắt giảm nhân sự ở các tập đoàn công nghệ khi áp dụng AI tự động hóa.',
              ],
              argumentCaveats: [
                'Tác động thực tế còn phụ thuộc vào tốc độ ban hành chính sách quản lý và bảo hộ lao động của từng quốc gia.',
              ],
              sourceBiasNotes: 'Nguồn từ ngân hàng đầu tư Goldman Sachs mang góc nhìn tối ưu hóa chi phí tài chính cho doanh nghiệp, có thể đánh giá hơi quá mức nguy cơ cắt giảm nhân sự.',
              evidences: [
                new Evidence({
                  metric: '300 Triệu Việc Làm bị ảnh hưởng',
                  description: 'Báo cáo Goldman Sachs nhận định AI có thể thay thế hoặc hỗ trợ 1/4 số công việc tại Mỹ và Châu Âu.',
                }),
              ],
              citations: [
                new Citation({
                  url: 'https://goldmansachs.com/insights/pages/generative-ai-could-raise-global-gdp-by-7-percent.html',
                  title: 'The Potentially Large Effects of AI on Growth',
                  sourceName: 'Goldman Sachs Research',
                  credibilityScore: 0.95,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  private generateDynamicTopic(query: string): Topic {
    const formattedTitle = `Phân tích Đa chiều Sâu: ${query.charAt(0).toUpperCase() + query.slice(1)}`;
    const dynamicSources = [
      new RawSource({
        id: 'src-dyn-1',
        sourceName: 'Cổng Thông tin Chuyên ngành / Báo chí Chính thống',
        title: `Phân tích tổng hợp về ${query}`,
        url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
        summary: `Tóm tắt các báo cáo và ý kiến thực tế từ giới chuyên gia liên quan đến chủ đề "${query}".`,
        publisherType: 'Báo chí Chính thống',
      }),
      new RawSource({
        id: 'src-dyn-2',
        sourceName: 'Tổ chức Nghiên cứu Độc lập',
        title: `Nghiên cứu tác động & rủi ro đối với ${query}`,
        url: `https://scholar.google.com/search?q=${encodeURIComponent(query)}`,
        summary: `Các số liệu và đánh giá thực nghiệm từ cơ sở dữ liệu học thuật về "${query}".`,
        publisherType: 'Viện Nghiên cứu Độc lập',
      }),
    ];

    return Topic.create({
      title: formattedTitle,
      query: query,
      neutralSummary: `Chủ đề "${query}" có nhiều ý kiến trái chiều từ các chuyên gia. Việc đánh giá cần dựa trên dữ liệu thực tế và phân tích lợi ích - rủi ro từ cả hai góc nhìn ủng hộ và phản đối.`,
      rawSources: dynamicSources,
      perspectives: [
        new Perspective({
          stance: Stance.PRO,
          title: `Góc nhìn Ủng hộ / Cơ hội`,
          summary: `Các nhà phân tích ủng hộ cho rằng "${query}" mang lại tác động tích cực về mặt tăng trưởng và đột phá hiệu quả.`,
          arguments: [
            new Argument({
              id: `arg-pro-dyn-1`,
              claim: `Tối ưu hóa nguồn lực và thúc đẩy tăng trưởng`,
              reasoning: `Nhiều báo cáo ghi nhận giải pháp này mang lại hiệu quả về mặt dài hạn khi áp dụng đúng chiến lược.`,
              sourceIds: ['src-dyn-1'],
              validityReasons: [
                'Dựa trên số liệu cải thiện hiệu suất thực tế ở các đơn vị thử nghiệm tiên phong.',
                'Logic phát triển kinh tế và xu hướng đổi mới sáng tạo toàn cầu.',
              ],
              argumentCaveats: [
                'Cần điều kiện môi trường pháp lý thuận lợi và năng lực thực thi tốt.',
              ],
              sourceBiasNotes: 'Nguồn thông tin tổng hợp từ truyền thông chính thống, mang tính định hướng tích cực nhưng cần kiểm chứng thêm số liệu lâu dài.',
              evidences: [
                new Evidence({
                  metric: 'Tăng trưởng +25%',
                  description: 'Chỉ số đo lường trung bình cải thiện rõ rệt ở các đơn vị tiên phong.',
                }),
              ],
              citations: [
                new Citation({
                  url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
                  title: `Bài viết phân tích về ${query}`,
                  sourceName: 'Cổng Thông tin Chuyên ngành',
                  credibilityScore: 0.9,
                }),
              ],
            }),
          ],
        }),
        new Perspective({
          stance: Stance.CON,
          title: `Góc nhìn Phản biện / Thách thức`,
          summary: `Các ý kiến phản biện cảnh báo về các chi phí ẩn và rủi ro phát sinh của "${query}".`,
          arguments: [
            new Argument({
              id: `arg-con-dyn-1`,
              claim: `Rủi ro quản trị và chi phí chuyển đổi cao`,
              reasoning: `Nếu không có chính sách kiểm soát hợp lý, sự thay đổi có thể gây xáo trộn tổ chức và áp lực tài chính.`,
              sourceIds: ['src-dyn-2'],
              validityReasons: [
                'Phân tích chi phí cơ hội và rủi ro không lường trước được trong giai đoạn chuyển giao.',
              ],
              argumentCaveats: [
                'Mức độ rủi ro khác nhau tùy thuộc vào quy mô và tiềm lực của từng đối tượng áp dụng.',
              ],
              sourceBiasNotes: 'Nguồn nghiên cứu học thuật độc lập có xu hướng tập trung vào các trường hợp ngoại lệ rủi ro để đưa ra khuyến cáo an toàn.',
              evidences: [
                new Evidence({
                  metric: '35% Rủi ro phát sinh',
                  description: 'Các dự án thiếu lộ trình rõ ràng dễ gặp thách thức trong triển khai.',
                }),
              ],
              citations: [
                new Citation({
                  url: `https://scholar.google.com/search?q=${encodeURIComponent(query)}`,
                  title: `Phân tích Rủi ro đối với ${query}`,
                  sourceName: 'Tổ chức Nghiên cứu Độc lập',
                  credibilityScore: 0.88,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }
}
