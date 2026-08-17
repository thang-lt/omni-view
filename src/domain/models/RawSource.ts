export interface RawSourceProps {
  id: string;
  url: string;
  title: string;
  sourceName: string;
  summary: string;
  rawExcerpt?: string;
  publisherType?: string;
}

export class RawSource {
  public readonly id: string;
  public readonly url: string;
  public readonly title: string;
  public readonly sourceName: string;
  public readonly summary: string;
  public readonly rawExcerpt: string;
  public readonly publisherType: string;

  constructor(props: RawSourceProps) {
    if (!props.id) throw new Error('RawSource id is required');
    if (!props.url) throw new Error('RawSource url is required');
    if (!props.title) throw new Error('RawSource title is required');
    if (!props.sourceName) throw new Error('RawSource sourceName is required');

    this.id = props.id;
    this.url = props.url.startsWith('http') ? props.url : `https://${props.url}`;
    this.title = props.title;
    this.sourceName = props.sourceName;
    this.summary = props.summary || '';
    this.rawExcerpt = props.rawExcerpt || props.summary || '';
    this.publisherType = props.publisherType || 'Chưa phân loại';
  }
}
