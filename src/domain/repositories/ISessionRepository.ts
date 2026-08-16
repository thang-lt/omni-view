import { Topic } from '../models/Topic';

export interface ISessionRepository {
  saveTopic(topic: Topic): Promise<void>;
  getTopics(): Promise<Topic[]>;
  getTopicById(id: string): Promise<Topic | null>;
  clearHistory(): Promise<void>;
}
