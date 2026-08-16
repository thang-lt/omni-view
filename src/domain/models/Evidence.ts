export interface EvidenceProps {
  metric: string;
  description: string;
  context?: string;
}

export class Evidence {
  public readonly metric: string;
  public readonly description: string;
  public readonly context?: string;

  constructor(props: EvidenceProps) {
    if (!props.metric) throw new Error('Evidence metric is required');
    if (!props.description) throw new Error('Evidence description is required');

    this.metric = props.metric;
    this.description = props.description;
    this.context = props.context;
  }
}
