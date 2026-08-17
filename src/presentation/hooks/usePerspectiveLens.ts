import { useState, useEffect, useCallback, useMemo } from 'react';
import { Topic } from '../../domain/models/Topic';
import { AnalyzeTopicUseCase } from '../../application/use-cases/AnalyzeTopicUseCase';
import { GetSessionHistoryUseCase } from '../../application/use-cases/GetSessionHistoryUseCase';
import { ClearSessionUseCase } from '../../application/use-cases/ClearSessionUseCase';
import { GeminiPerspectiveAnalyzer } from '../../infrastructure/ai/GeminiPerspectiveAnalyzer';
import { MockPerspectiveAnalyzer } from '../../infrastructure/ai/MockPerspectiveAnalyzer';
import { SessionStorageRepository } from '../../infrastructure/persistence/SessionStorageRepository';
import { ApiKeyRepository } from '../../infrastructure/config/ApiKeyRepository';

export function usePerspectiveLens() {
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [history, setHistory] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);

  // Clean Architecture Composition Root
  const { analyzeUseCase, getHistoryUseCase, clearUseCase } = useMemo(() => {
    const apiKey = ApiKeyRepository.getApiKey();
    // Fallback to Mock if API Key is missing for seamless local testing
    const analyzer = apiKey ? new GeminiPerspectiveAnalyzer() : new MockPerspectiveAnalyzer();
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
    setCurrentStep(1);
    setStepMessage('Đang khởi động Multi-Agent Pipeline...');

    try {
      const topic = await analyzeUseCase.execute(query, (step, message) => {
        setCurrentStep(step);
        setStepMessage(message);
      });
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

  const scrollToSource = (sourceId: string) => {
    setActiveSourceId(sourceId);
    const element = document.getElementById(`raw-source-${sourceId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return {
    currentTopic,
    history,
    isLoading,
    error,
    currentStep,
    stepMessage,
    activeSourceId,
    setActiveSourceId,
    scrollToSource,
    searchTopic,
    selectTopicFromHistory,
    clearSession,
  };
}
