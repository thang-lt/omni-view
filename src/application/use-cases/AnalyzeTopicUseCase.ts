import type { IPerspectiveAnalyzer } from '../../domain/repositories/IPerspectiveAnalyzer';
import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import type { Topic } from '../../domain/models/Topic';

export class AnalyzeTopicUseCase {
  private readonly analyzer: IPerspectiveAnalyzer;
  private readonly sessionRepository: ISessionRepository;

  constructor(analyzer: IPerspectiveAnalyzer, sessionRepository: ISessionRepository) {
    this.analyzer = analyzer;
    this.sessionRepository = sessionRepository;
  }

  public async execute(query: string): Promise<Topic> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      throw new Error('Search query cannot be empty');
    }

    const topic = await this.analyzer.analyzeTopic(trimmedQuery);
    await this.sessionRepository.saveTopic(topic);
    return topic;
  }
}
