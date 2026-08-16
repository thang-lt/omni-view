import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import type { Topic } from '../../domain/models/Topic';

export class GetSessionHistoryUseCase {
  private readonly sessionRepository: ISessionRepository;

  constructor(sessionRepository: ISessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  public async execute(): Promise<Topic[]> {
    return this.sessionRepository.getTopics();
  }
}
