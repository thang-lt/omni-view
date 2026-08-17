import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyzeTopicUseCase } from '../AnalyzeTopicUseCase';
import { GetSessionHistoryUseCase } from '../GetSessionHistoryUseCase';
import { ClearSessionUseCase } from '../ClearSessionUseCase';
import type { IPerspectiveAnalyzer } from '../../../domain/repositories/IPerspectiveAnalyzer';
import type { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { Topic } from '../../../domain/models/Topic';
import { Perspective } from '../../../domain/models/Perspective';
import { Stance } from '../../../domain/models/Stance';

class MockAnalyzer implements IPerspectiveAnalyzer {
  public analyzeTopic = vi.fn();
}

class MockSessionRepo implements ISessionRepository {
  private topics: Topic[] = [];
  public saveTopic = vi.fn(async (topic: Topic) => {
    this.topics.unshift(topic);
  });
  public getTopics = vi.fn(async () => this.topics);
  public getTopicById = vi.fn(async (id: string) => this.topics.find((t) => t.id === id) || null);
  public clearHistory = vi.fn(async () => {
    this.topics = [];
  });
}

describe('Application Layer: Use Cases', () => {
  let analyzer: MockAnalyzer;
  let repo: MockSessionRepo;

  beforeEach(() => {
    analyzer = new MockAnalyzer();
    repo = new MockSessionRepo();
  });

  describe('AnalyzeTopicUseCase', () => {
    it('should throw an error if query is empty', async () => {
      const useCase = new AnalyzeTopicUseCase(analyzer, repo);
      await expect(useCase.execute('')).rejects.toThrow('Search query cannot be empty');
      await expect(useCase.execute('   ')).rejects.toThrow('Search query cannot be empty');
    });

    it('should analyze topic and save it to session repository', async () => {
      const dummyTopic = Topic.create({
        title: 'Crypto Regulation',
        query: 'Should crypto be strictly regulated?',
        perspectives: [
          new Perspective({
            stance: Stance.PRO,
            title: 'Pro Regulation',
            summary: 'Protects investors',
            arguments: [],
          }),
        ],
        neutralSummary: 'Regulation balances innovation and safety.',
      });

      analyzer.analyzeTopic.mockResolvedValue(dummyTopic);

      const useCase = new AnalyzeTopicUseCase(analyzer, repo);
      const result = await useCase.execute('Should crypto be strictly regulated?');

      expect(analyzer.analyzeTopic).toHaveBeenCalledWith('Should crypto be strictly regulated?', undefined);
      expect(repo.saveTopic).toHaveBeenCalledWith(dummyTopic);
      expect(result.title).toBe('Crypto Regulation');
    });
  });

  describe('GetSessionHistoryUseCase', () => {
    it('should retrieve topic history from repository', async () => {
      const topic1 = Topic.create({ title: 'Topic 1', query: 'q1', perspectives: [], neutralSummary: 's1' });
      const topic2 = Topic.create({ title: 'Topic 2', query: 'q2', perspectives: [], neutralSummary: 's2' });
      await repo.saveTopic(topic1);
      await repo.saveTopic(topic2);

      const useCase = new GetSessionHistoryUseCase(repo);
      const history = await useCase.execute();

      expect(history).toHaveLength(2);
      expect(history[0].title).toBe('Topic 2');
    });
  });

  describe('ClearSessionUseCase', () => {
    it('should clear session history in repository', async () => {
      const topic = Topic.create({ title: 'Topic 1', query: 'q1', perspectives: [], neutralSummary: 's1' });
      await repo.saveTopic(topic);

      const clearUseCase = new ClearSessionUseCase(repo);
      await clearUseCase.execute();

      expect(repo.clearHistory).toHaveBeenCalled();
      expect(await repo.getTopics()).toHaveLength(0);
    });
  });
});
