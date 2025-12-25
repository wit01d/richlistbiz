export interface FloatingObjectProps {
  position: [number, number, number];
  scale: number;
  rotationSpeed: number;
}

export enum SectionType {
  HERO = 'HERO',
  ABOUT = 'ABOUT',
  ORACLE = 'ORACLE',
  FOOTER = 'FOOTER'
}

export interface OracleResponse {
  answer: string;
  isError: boolean;
}