export interface CitationProps {
  url: string;
  title: string;
  sourceName: string;
  credibilityScore?: number;
}

export class Citation {
  public readonly url: string;
  public readonly title: string;
  public readonly sourceName: string;
  public readonly credibilityScore: number;

  constructor(props: CitationProps) {
    if (!props.url || (!props.url.startsWith('http://') && !props.url.startsWith('https://'))) {
      throw new Error('Invalid URL string');
    }
    if (!props.title) throw new Error('Citation title is required');
    if (!props.sourceName) throw new Error('Citation sourceName is required');

    this.url = props.url;
    this.title = props.title;
    this.sourceName = props.sourceName;
    this.credibilityScore = props.credibilityScore ?? 0.85;
  }
}
