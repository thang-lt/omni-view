import { describe, it, expect } from 'vitest';
import { MockPerspectiveAnalyzer } from '../MockPerspectiveAnalyzer';
import { Stance } from '../../../domain/models/Stance';

describe('Infrastructure Layer: MockPerspectiveAnalyzer', () => {
  const analyzer = new MockPerspectiveAnalyzer();

  it('should analyze preset topic AI workforce', async () => {
    const topic = await analyzer.analyzeTopic('AI tác động đến việc làm thế nào?');

    expect(topic.title).toContain('Tác động của AI');
    expect(topic.getPerspective(Stance.PRO)).toBeDefined();
    expect(topic.getPerspective(Stance.CON)).toBeDefined();
    expect(topic.getPerspective(Stance.PRO)?.arguments.length).toBeGreaterThan(0);
  });

  it('should dynamically generate analysis for unknown query', async () => {
    const topic = await analyzer.analyzeTopic('Thị trường xe điện tại Việt Nam');

    expect(topic.title).toContain('Thị trường xe điện tại Việt Nam');
    expect(topic.getPerspective(Stance.PRO)).toBeDefined();
    expect(topic.getPerspective(Stance.CON)).toBeDefined();
  });
});
