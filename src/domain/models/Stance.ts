export const Stance = {
  PRO: 'PRO',
  CON: 'CON',
  NEUTRAL: 'NEUTRAL',
} as const;

export type Stance = (typeof Stance)[keyof typeof Stance];
