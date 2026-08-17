import { Perspective } from './Perspective';
import { Stance } from './Stance';
import { RawSource } from './RawSource';

export interface CreateTopicProps {
  id?: string;
  title: string;
  query: string;
  rawSources?: RawSource[];
  perspectives: Perspective[];
  neutralSummary: string;
  createdAt?: Date;
}

export class Topic {
  public readonly id: string;
  public readonly title: string;
  public readonly query: string;
  public readonly rawSources: RawSource[];
  public readonly perspectives: Perspective[];
  public readonly neutralSummary: string;
  public readonly createdAt: Date;

  private constructor(props: CreateTopicProps) {
    if (!props.title) throw new Error('Topic title is required');
    if (!props.query) throw new Error('Topic query is required');

    this.id = props.id || `topic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.title = props.title;
    this.query = props.query;
    this.rawSources = props.rawSources || [];
    this.perspectives = props.perspectives;
    this.neutralSummary = props.neutralSummary;
    this.createdAt = props.createdAt || new Date();
  }

  public static create(props: CreateTopicProps): Topic {
    return new Topic(props);
  }

  public getPerspective(stance: Stance): Perspective | undefined {
    return this.perspectives.find((p) => p.stance === stance);
  }
}

