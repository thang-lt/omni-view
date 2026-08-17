import { Topic } from '../models/Topic';

export interface IPerspectiveAnalyzer {
  analyzeTopic(query: string, onProgress?: (step: number, stepName: string) => void): Promise<Topic>;
}

