import type { IPerspectiveAnalyzer } from '../../domain/repositories/IPerspectiveAnalyzer';
import { Topic } from '../../domain/models/Topic';
import { Perspective } from '../../domain/models/Perspective';
import { Argument } from '../../domain/models/Argument';
import { Evidence } from '../../domain/models/Evidence';
import { Citation } from '../../domain/models/Citation';
import { Stance } from '../../domain/models/Stance';

export class MockPerspectiveAnalyzer implements IPerspectiveAnalyzer {
  private static readonly PRESET_TOPICS: Record<string, Topic> = {
    ai: Topic.create({
      id: 'topic-ai-workforce',
      title: 'Tác động của AI đối với Việc làm & Thị trường Lao động',
      query: 'AI có thay thế công việc của con người trong tương lai?',
      neutralSummary:
        'AI đang tự động hóa các tác vụ lặp đi lặp lại và gia tăng năng suất đáng kể, đồng thời làm dấy lên lo ngại về việc tự động hóa làm mất việc làm nhưng lại mở ra nhiều ngành nghề mới yêu cầu kỹ năng cao.',
      perspectives: [
        new Perspective({
          stance: Stance.PRO,
          title: 'Góc nhìn Tích cực: Tăng Tốc Năng Suất & Tạo Ngành Nghề Mới',
          summary: 'AI giúp giảm bớt công việc chân tay và công việc thủ công, nâng cao khả năng sáng tạo và tạo ra các cơ hội việc làm mới trong lĩnh vực công nghệ và phân tích dữ liệu.',
          arguments: [
            new Argument({
              id: 'arg-ai-pro-1',
              claim: 'Tăng trưởng năng suất lao động đột phá',
              reasoning: 'Các công cụ Generative AI giúp lập trình viên và nhà phân tích hoàn thành công việc nhanh hơn 40-50%.',
              evidences: [
                new Evidence({
                  metric: '+40% Năng suất',
                  description: 'Nghiên cứu của MIT & Stanford cho thấy nhân viên hỗ trợ dùng AI tăng 14% năng suất mỗi giờ và nhân viên mới tăng 34%.',
                  context: 'Khảo sát trên 5,000 chuyên viên.',
                }),
                new Evidence({
                  metric: '97 Triệu Việc Làm Mới',
                  description: 'Báo cáo của World Economic Forum dự báo đến 2025 AI tạo ra 97 triệu vị trí việc làm mới thích ứng với sự phân công lao động giữa người và máy.',
                }),
              ],
              citations: [
                new Citation({
                  url: 'https://weforum.org/reports/future-of-jobs-2023',
                  title: 'Future of Jobs Report 2023',
                  sourceName: 'World Economic Forum',
                  credibilityScore: 0.96,
                }),
                new Citation({
                  url: 'https://economics.mit.edu/research/ai-productivity',
                  title: 'Experimental Evidence on the Productivity Effects of Generative AI',
                  sourceName: 'MIT Economics Department',
                  credibilityScore: 0.98,
                }),
              ],
            }),
            new Argument({
              id: 'arg-ai-pro-2',
              claim: 'Tập trung vào tư duy chiến lược và sáng tạo',
              reasoning: 'Khi máy móc xử lý tác vụ rập khuôn, con người có nhiều thời gian hơn cho đổi mới sáng tạo và giải quyết bài toán phức tạp.',
              evidences: [
                new Evidence({
                  metric: '60% Tác vụ tự động',
                  description: 'McKinsey ước tính khoảng 60% ngành nghề có thể tự động hóa ít nhất 30% số lượng công việc.',
                }),
              ],
              citations: [
                new Citation({
                  url: 'https://mckinsey.com/featured-insights/future-of-work',
                  title: 'The Economic Potential of Generative AI',
                  sourceName: 'McKinsey Global Institute',
                  credibilityScore: 0.94,
                }),
              ],
            }),
          ],
        }),
        new Perspective({
          stance: Stance.CON,
          title: 'Góc nhìn Phản biện: Rủi ro Dịch chuyển Lao động & Bất bình đẳng',
          summary: 'Sự phát triển quá nhanh của AI có thể khiến hàng triệu lao động bị đào thải khi không kịp chuyển đổi kỹ năng, đồng thời làm tăng nới rộng khoảng cách giàu nghèo.',
          arguments: [
            new Argument({
              id: 'arg-ai-con-1',
              claim: 'Áp lực thay thế việc làm văn phòng và trí óc',
              reasoning: 'Không chỉ lao động phổ thông, AI thế hệ mới ảnh hưởng trực tiếp đến biên dịch, viết lách, chăm sóc khách hàng và lập trình cơ bản.',
              evidences: [
                new Evidence({
                  metric: '300 Triệu Việc Làm bị ảnh hưởng',
                  description: 'Báo cáo Goldman Sachs nhận định AI có thể thay thế hoặc hỗ trợ 1/4 số công việc tại Mỹ và Châu Âu.',
                  context: 'Tương đương 300 triệu việc làm toàn thời gian.',
                }),
                new Evidence({
                  metric: '44% Kỹ năng bị thay đổi',
                  description: 'Kỹ năng cốt lõi của người lao động được dự báo sẽ thay đổi 44% trong 5 năm tới.',
                }),
              ],
              citations: [
                new Citation({
                  url: 'https://goldmansachs.com/insights/pages/generative-ai-could-raise-global-gdp-by-7-percent.html',
                  title: 'The Potentially Large Effects of Artificial Intelligence on Economic Growth',
                  sourceName: 'Goldman Sachs Global Investment Research',
                  credibilityScore: 0.95,
                }),
              ],
            }),
            new Argument({
              id: 'arg-ai-con-2',
              claim: 'Bất bình đẳng thu nhập và rủi ro bản quyền',
              reasoning: 'Lợi nhuận từ AI tập trung vào các tập đoàn công nghệ lớn, trong khi người lao động chịu rủi ro mất an toàn nghề nghiệp.',
              evidences: [
                new Evidence({
                  metric: '70% Tập trung thị trường',
                  description: 'Các công ty Big Tech kiểm soát hạ tầng AI đám mây cốt lõi.',
                }),
              ],
              citations: [
                new Citation({
                  url: 'https://oecd.org/employment/ai-and-labor-markets',
                  title: 'OECD Employment Outlook: Artificial Intelligence and the Labor Market',
                  sourceName: 'OECD',
                  credibilityScore: 0.92,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    remote: Topic.create({
      id: 'topic-remote-work',
      title: 'Làm việc Từ xa (Remote Work) vs Làm việc Tại Văn phòng',
      query: 'Làm việc từ xa hay làm việc tại văn phòng tốt hơn?',
      neutralSummary:
        'Làm việc từ xa giúp tiết kiệm thời gian di chuyển và tăng độ hài lòng của nhân viên, nhưng mô hình văn phòng truyền thống vẫn giữ ưu thế về sự gắn kết đội ngũ và đào tạo nhân sự mới.',
      perspectives: [
        new Perspective({
          stance: Stance.PRO,
          title: 'Ủng hộ Làm việc Từ xa / Hybrid',
          summary: 'Cải thiện sự cân bằng sống - làm việc, mở rộng quy mô tuyển dụng toàn cầu và giảm chi phí vận hành doanh nghiệp.',
          arguments: [
            new Argument({
              id: 'arg-remote-pro-1',
              claim: 'Tiết kiệm chi phí và thời gian cá nhân',
              reasoning: 'Người lao động tiết kiệm hàng trăm giờ di chuyển mỗi năm và doanh nghiệp cắt giảm chi phí thuê mặt bằng.',
              evidences: [
                new Evidence({
                  metric: '72 Phút/ngày',
                  description: 'Người làm việc từ xa tiết kiệm trung bình 72 phút di chuyển mỗi ngày trên toàn thế giới.',
                }),
                new Evidence({
                  metric: '$11,000 / Năm',
                  description: 'Doanh nghiệp tiết kiệm trung bình $11,000 cho mỗi nhân viên chuyển sang làm nửa thời gian từ xa.',
                }),
              ],
              citations: [
                new Citation({
                  url: 'https://nber.org/papers/w30838',
                  title: 'Time Savings from Working from Home',
                  sourceName: 'National Bureau of Economic Research (NBER)',
                  credibilityScore: 0.97,
                }),
                new Citation({
                  url: 'https://globalworkplaceanalytics.com/telework-visa',
                  title: 'Workplace Analytics Research Report',
                  sourceName: 'Global Workplace Analytics',
                  credibilityScore: 0.89,
                }),
              ],
            }),
          ],
        }),
        new Perspective({
          stance: Stance.CON,
          title: 'Ưu tiên Làm việc Tại Văn phòng',
          summary: 'Tạo môi trường tương tác trực tiếp, thúc đẩy đổi mới sáng tạo bộc phát và giúp nhân viên trẻ tiếp thu văn hóa công ty nhanh hơn.',
          arguments: [
            new Argument({
              id: 'arg-remote-con-1',
              claim: 'Sự suy giảm liên kết xã hội và văn hóa doanh nghiệp',
              reasoning: 'Giao tiếp qua màn hình làm giảm khả năng trao đổi ngẫu nhiên (water-cooler effect) - nguồn sinh ra ý tưởng đổi mới.',
              evidences: [
                new Evidence({
                  metric: '-18% Kết nối chéo',
                  description: 'Nghiên cứu trên 60,000 nhân viên Microsoft cho thấy việc làm từ xa khiến sự hợp tác giữa các phòng ban giảm hẳn.',
                }),
              ],
              citations: [
                new Citation({
                  url: 'https://nature.com/articles/s41562-021-01196-4',
                  title: 'The Effects of Firm-wide Remote Work on Information Processing',
                  sourceName: 'Nature Human Behaviour',
                  credibilityScore: 0.98,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  };

  public async analyzeTopic(query: string): Promise<Topic> {
    // Simulate natural response latency for research synthesis
    await new Promise((resolve) => setTimeout(resolve, 800));

    const lower = query.toLowerCase();

    if (lower.includes('ai') || lower.includes('trí tuệ nhân tạo') || lower.includes('robot') || lower.includes('việc làm')) {
      return MockPerspectiveAnalyzer.PRESET_TOPICS.ai;
    }
    if (lower.includes('remote') || lower.includes('văn phòng') || lower.includes('từ xa') || lower.includes('ở nhà')) {
      return MockPerspectiveAnalyzer.PRESET_TOPICS.remote;
    }

    // Dynamic Topic Generator for custom search queries
    return this.generateDynamicTopic(query);
  }

  private generateDynamicTopic(query: string): Topic {
    const formattedTitle = `Phân tích Đa chiều: ${query.charAt(0).toUpperCase() + query.slice(1)}`;

    return Topic.create({
      title: formattedTitle,
      query: query,
      neutralSummary: `Chủ đề "${query}" có nhiều ý kiến trái chiều từ các chuyên gia. Việc đánh giá cần dựa trên dữ liệu thực tế và phân tích lợi ích - rủi ro từ cả hai góc nhìn ủng hộ và phản đối.`,
      perspectives: [
        new Perspective({
          stance: Stance.PRO,
          title: `Góc nhìn Ủng hộ / Cơ hội`,
          summary: `Các nhà phân tích ủng hộ cho rằng "${query}" mang lại tác động tích cực về mặt tăng trưởng, đột phá hiệu quả và cơ hội mới.`,
          arguments: [
            new Argument({
              id: `arg-pro-dyn-1`,
              claim: `Tối ưu hóa nguồn lực và thúc đẩy tăng trưởng`,
              reasoning: `Nhiều báo cáo ghi nhận giải pháp này mang lại hiệu quả về mặt dài hạn khi áp dụng đúng chiến lược.`,
              evidences: [
                new Evidence({
                  metric: 'Tăng trưởng +25%',
                  description: 'Chỉ số đo lường trung bình cải thiện rõ rệt ở các đơn vị tiên phong.',
                  context: 'Khảo sát tổng hợp các nghiên cứu mới nhất.',
                }),
              ],
              citations: [
                new Citation({
                  url: 'https://scholar.google.com/search?q=' + encodeURIComponent(query),
                  title: `Nghiên cứu Tổng hợp về ${query}`,
                  sourceName: 'Academic Research Database',
                  credibilityScore: 0.91,
                }),
              ],
            }),
          ],
        }),
        new Perspective({
          stance: Stance.CON,
          title: `Góc nhìn Phản biện / Thách thức`,
          summary: `Các ý kiến phản biện cảnh báo về các chi phí ẩn, rủi ro tuân thủ và tác động ngoài dự kiến của "${query}".`,
          arguments: [
            new Argument({
              id: `arg-con-dyn-1`,
              claim: `Rủi ro quản trị và chi phí chuyển đổi cao`,
              reasoning: `Nếu không có chính sách kiểm soát hợp lý, sự thay đổi có thể gây xáo trộn tổ chức và tăng áp lực tài chính.`,
              evidences: [
                new Evidence({
                  metric: '35% Rủi ro phát sinh',
                  description: 'Các dự án thiếu lộ trình rõ ràng dễ gặp thách thức trong triển khai thực tế.',
                }),
              ],
              citations: [
                new Citation({
                  url: 'https://news.google.com/search?q=' + encodeURIComponent(query),
                  title: `Phân tích Rủi ro & Thách thức đối với ${query}`,
                  sourceName: 'Global Risk Policy Review',
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
