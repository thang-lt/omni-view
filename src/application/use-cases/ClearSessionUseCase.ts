import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';

export class ClearSessionUseCase {
  private readonly sessionRepository: ISessionRepository;

  constructor(sessionRepository: ISessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  public async execute(): Promise<void> {
    await this.sessionRepository.clearHistory();
  }
}
