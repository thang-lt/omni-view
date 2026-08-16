import { describe, it, expect } from 'vitest';
import { Topic } from '../Topic';
import { Perspective } from '../Perspective';
import { Argument } from '../Argument';
import { Evidence } from '../Evidence';
import { Citation } from '../Citation';
import { Stance } from '../Stance';

describe('Domain Layer: Entities & Value Objects', () => {
  it('should create a valid Citation value object', () => {
    const citation = new Citation({
      url: 'https://example.com/study',
      title: 'Economic Impact Study 2026',
      sourceName: 'Harvard Business Review',
      credibilityScore: 0.95,
    });

    expect(citation.url).toBe('https://example.com/study');
    expect(citation.sourceName).toBe('Harvard Business Review');
    expect(citation.credibilityScore).toBe(0.95);
  });

  it('should throw an error for invalid Citation URL', () => {
    expect(() => {
      new Citation({
        url: 'invalid-url-string',
        title: 'Title',
        sourceName: 'Source',
      });
    }).toThrow('Invalid URL string');
  });

  it('should create a valid Evidence value object', () => {
    const evidence = new Evidence({
      metric: '+45% Productivity',
      description: 'Companies adopting hybrid work saw a 45% boost in quarterly output.',
      context: 'Based on a survey of 500 Fortune 500 companies.',
    });

    expect(evidence.metric).toBe('+45% Productivity');
    expect(evidence.description).toContain('hybrid work');
  });

  it('should create an Argument with evidences and citations', () => {
    const evidence = new Evidence({
      metric: '3.2M Jobs',
      description: 'AI is projected to create 3.2M net new jobs by 2030.',
    });

    const citation = new Citation({
      url: 'https://weforum.org/report',
      title: 'Future of Jobs Report',
      sourceName: 'World Economic Forum',
    });

    const argument = new Argument({
      id: 'arg-1',
      claim: 'AI creates high-skill job opportunities',
      reasoning: 'Automation shifts labor from repetitive tasks to strategic roles.',
      evidences: [evidence],
      citations: [citation],
    });

    expect(argument.id).toBe('arg-1');
    expect(argument.evidences).toHaveLength(1);
    expect(argument.citations).toHaveLength(1);
  });

  it('should create a Perspective entity with arguments', () => {
    const argument = new Argument({
      id: 'arg-1',
      claim: 'Remote work reduces overhead',
      reasoning: 'Companies save on real estate and utility expenses.',
      evidences: [],
      citations: [],
    });

    const perspective = new Perspective({
      stance: Stance.PRO,
      title: 'Advocates of Remote Work',
      summary: 'Promotes work-life balance and operational cost reduction.',
      arguments: [argument],
    });

    expect(perspective.stance).toBe(Stance.PRO);
    expect(perspective.arguments).toHaveLength(1);
  });

  it('should create a Topic Aggregate Root', () => {
    const topic = Topic.create({
      title: 'Remote Work vs In-Office Work',
      query: 'Is remote work better than working from office?',
      perspectives: [
        new Perspective({
          stance: Stance.PRO,
          title: 'Supports Remote Work',
          summary: 'Higher flexibility',
          arguments: [],
        }),
        new Perspective({
          stance: Stance.CON,
          title: 'Opposes Remote Work',
          summary: 'Lower team cohesion',
          arguments: [],
        }),
      ],
      neutralSummary: 'Remote work offers flexibility and cost savings, but may impact team cohesion and onboarding speed.',
    });

    expect(topic.id).toBeDefined();
    expect(topic.query).toBe('Is remote work better than working from office?');
    expect(topic.getPerspective(Stance.PRO)).toBeDefined();
    expect(topic.getPerspective(Stance.CON)).toBeDefined();
    expect(topic.neutralSummary).toContain('flexibility');
  });
});
