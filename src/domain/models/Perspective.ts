import { Stance } from './Stance';
import { Argument } from './Argument';

export interface PerspectiveProps {
  stance: Stance;
  title: string;
  summary: string;
  arguments: Argument[];
}

export class Perspective {
  public readonly stance: Stance;
  public readonly title: string;
  public readonly summary: string;
  public readonly arguments: Argument[];

  constructor(props: PerspectiveProps) {
    if (!props.stance) throw new Error('Perspective stance is required');
    if (!props.title) throw new Error('Perspective title is required');

    this.stance = props.stance;
    this.title = props.title;
    this.summary = props.summary || '';
    this.arguments = props.arguments || [];
  }
}
