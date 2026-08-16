import { useState, useEffect, useCallback, useMemo } from 'react';
import { Topic } from '../../domain/models/Topic';
import { AnalyzeTopicUseCase } from '../../application/use-cases/AnalyzeTopicUseCase';
import { GetSessionHistoryUseCase } from '../../application/use-cases/GetSessionHistoryUseCase';
import { ClearSessionUseCase } from '../../application/use-cases/ClearSessionUseCase';
import { GeminiPerspectiveAnalyzer } from '../../infrastructure/ai/GeminiPerspectiveAnalyzer';
import { SessionStorageRepository } from '../../infrastructure/persistence/SessionStorageRepository';

export function usePerspectiveLens() {
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [history, setHistory] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Clean Architecture Composition Root: Inject GeminiPerspectiveAnalyzer
  const { analyzeUseCase, getHistoryUseCase, clearUseCase } = useMemo(() => {
    const analyzer = new GeminiPerspectiveAnalyzer();
    const sessionRepo = new SessionStorageRepository();

    return {
      analyzeUseCase: new AnalyzeTopicUseCase(analyzer, sessionRepo),
      getHistoryUseCase: new GetSessionHistoryUseCase(sessionRepo),
      clearUseCase: new ClearSessionUseCase(sessionRepo),
    };
  }, []);

  const refreshHistory = useCallback(async () => {
    const items = await getHistoryUseCase.execute();
    setHistory(items);
  }, [getHistoryUseCase]);

  // Load session history on mount
  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const searchTopic = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const topic = await analyzeUseCase.execute(query);
      setCurrentTopic(topic);
      await refreshHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dịch vụ gặp sự cố khi phân tích chủ đề.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectTopicFromHistory = (topic: Topic) => {
    setCurrentTopic(topic);
  };

  const clearSession = async () => {
    await clearUseCase.execute();
    setHistory([]);
    setCurrentTopic(null);
  };

  return {
    currentTopic,
    history,
    isLoading,
    error,
    searchTopic,
    selectTopicFromHistory,
    clearSession,
  };
}
