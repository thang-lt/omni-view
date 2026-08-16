import { Topic } from '../models/Topic';

export interface IPerspectiveAnalyzer {
  analyzeTopic(query: string): Promise<Topic>;
}
