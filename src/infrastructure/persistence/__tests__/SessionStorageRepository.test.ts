import { describe, it, expect, beforeEach } from 'vitest';
import { SessionStorageRepository } from '../SessionStorageRepository';
import { Topic } from '../../../domain/models/Topic';
import { Perspective } from '../../../domain/models/Perspective';
import { Stance } from '../../../domain/models/Stance';

describe('Infrastructure Layer: SessionStorageRepository', () => {
  let repository: SessionStorageRepository;

  beforeEach(() => {
    sessionStorage.clear();
    repository = new SessionStorageRepository();
  });

  it('should store and retrieve topics from sessionStorage', async () => {
    const topic = Topic.create({
      id: 'topic-1',
      title: 'Universal Basic Income',
      query: 'Should UBI be implemented?',
      perspectives: [
        new Perspective({
          stance: Stance.PRO,
          title: 'Pro UBI',
          summary: 'Eliminates poverty',
          arguments: [],
        }),
      ],
      neutralSummary: 'UBI guarantees income but raises tax concerns.',
    });

    await repository.saveTopic(topic);
    const topics = await repository.getTopics();

    expect(topics).toHaveLength(1);
    expect(topics[0].id).toBe('topic-1');
    expect(topics[0].title).toBe('Universal Basic Income');
    expect(topics[0].getPerspective(Stance.PRO)?.title).toBe('Pro UBI');
  });

  it('should clear stored topics', async () => {
    const topic = Topic.create({
      id: 'topic-1',
      title: 'Title',
      query: 'query',
      perspectives: [],
      neutralSummary: 'summary',
    });

    await repository.saveTopic(topic);
    await repository.clearHistory();

    const topics = await repository.getTopics();
    expect(topics).toHaveLength(0);
  });
});
