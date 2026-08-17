import { Evidence } from './Evidence';
import { Citation } from './Citation';

export interface ArgumentProps {
  id: string;
  claim: string;
  reasoning: string;
  sourceIds?: string[];
  validityReasons?: string[];
  argumentCaveats?: string[];
  sourceBiasNotes?: string;
  evidences?: Evidence[];
  citations?: Citation[];
}

export class Argument {
  public readonly id: string;
  public readonly claim: string;
  public readonly reasoning: string;
  public readonly sourceIds: string[];
  public readonly validityReasons: string[];
  public readonly argumentCaveats: string[];
  public readonly sourceBiasNotes: string;
  public readonly evidences: Evidence[];
  public readonly citations: Citation[];

  constructor(props: ArgumentProps) {
    if (!props.id) throw new Error('Argument id is required');
    if (!props.claim) throw new Error('Argument claim is required');

    this.id = props.id;
    this.claim = props.claim;
    this.reasoning = props.reasoning || '';
    this.sourceIds = props.sourceIds || [];
    this.validityReasons = props.validityReasons || [];
    this.argumentCaveats = props.argumentCaveats || [];
    this.sourceBiasNotes = props.sourceBiasNotes || '';
    this.evidences = props.evidences || [];
    this.citations = props.citations || [];
  }
}

