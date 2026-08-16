import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { Topic } from '../../domain/models/Topic';
import { Perspective } from '../../domain/models/Perspective';
import { Argument } from '../../domain/models/Argument';
import { Evidence } from '../../domain/models/Evidence';
import { Citation } from '../../domain/models/Citation';
import { Stance } from '../../domain/models/Stance';

const STORAGE_KEY = 'perspective_lens_session_topics';

interface SerializedTopic {
  id: string;
  title: string;
  query: string;
  neutralSummary: string;
  createdAt: string;
  perspectives: Array<{
    stance: Stance;
    title: string;
    summary: string;
    arguments: Array<{
      id: string;
      claim: string;
      reasoning: string;
      evidences: Array<{ metric: string; description: string; context?: string }>;
      citations: Array<{ url: string; title: string; sourceName: string; credibilityScore?: number }>;
    }>;
  }>;
}

export class SessionStorageRepository implements ISessionRepository {
  public async saveTopic(topic: Topic): Promise<void> {
    const existing = await this.getTopics();
    // Filter out duplicates by query/id
    const updated = [topic, ...existing.filter((t) => t.id !== topic.id && t.query !== topic.query)];
    this.serializeAndSave(updated);
  }

  public async getTopics(): Promise<Topic[]> {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return [];
    }

    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const rawList: SerializedTopic[] = JSON.parse(data);
      return rawList.map((raw) => this.deserializeTopic(raw));
    } catch {
      return [];
    }
  }

  public async getTopicById(id: string): Promise<Topic | null> {
    const topics = await this.getTopics();
    return topics.find((t) => t.id === id) || null;
  }

  public async clearHistory(): Promise<void> {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  private serializeAndSave(topics: Topic[]): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    const rawList: SerializedTopic[] = topics.map((t) => ({
      id: t.id,
      title: t.title,
      query: t.query,
      neutralSummary: t.neutralSummary,
      createdAt: t.createdAt.toISOString(),
      perspectives: t.perspectives.map((p) => ({
        stance: p.stance,
        title: p.title,
        summary: p.summary,
        arguments: p.arguments.map((arg) => ({
          id: arg.id,
          claim: arg.claim,
          reasoning: arg.reasoning,
          evidences: arg.evidences.map((e) => ({
            metric: e.metric,
            description: e.description,
            context: e.context,
          })),
          citations: arg.citations.map((c) => ({
            url: c.url,
            title: c.title,
            sourceName: c.sourceName,
            credibilityScore: c.credibilityScore,
          })),
        })),
      })),
    }));

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rawList));
  }

  private deserializeTopic(raw: SerializedTopic): Topic {
    const perspectives = raw.perspectives.map((p) => {
      const args = p.arguments.map(
        (a) =>
          new Argument({
            id: a.id,
            claim: a.claim,
            reasoning: a.reasoning,
            evidences: a.evidences.map((e) => new Evidence(e)),
            citations: a.citations.map((c) => new Citation(c)),
          })
      );

      return new Perspective({
        stance: p.stance,
        title: p.title,
        summary: p.summary,
        arguments: args,
      });
    });

    return Topic.create({
      id: raw.id,
      title: raw.title,
      query: raw.query,
      neutralSummary: raw.neutralSummary,
      createdAt: new Date(raw.createdAt),
      perspectives,
    });
  }
}
