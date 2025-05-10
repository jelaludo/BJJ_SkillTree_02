export interface SkillNode {
  id: string;
  score: number;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  brightness: number;
  neighbors?: string[];
  score?: number;
}

export interface ShapeParams {
  width: number;
  height: number;
  [key: string]: any;
} 