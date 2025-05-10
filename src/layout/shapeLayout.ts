import { SkillNode, NodePosition, ShapeParams } from '../types/skill';
import { generateMoebiusLayout, generateInfinityLayout, generateInfinity2Layout } from '../shapes/moebius';

export function getShapeLayout(
  shape: 'moebius' | 'infinity' | 'infinity2',
  nodes: SkillNode[],
  params: ShapeParams & { nodeSpace?: number }
): NodePosition[] {
  switch (shape) {
    case 'moebius':
      return generateMoebiusLayout(nodes, params);
    case 'infinity':
      return generateInfinityLayout(nodes, params);
    case 'infinity2':
      return generateInfinity2Layout(nodes, params);
    default:
      return [];
  }
} 