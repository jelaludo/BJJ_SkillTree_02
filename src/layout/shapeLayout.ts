import { SkillNode, NodePosition, ShapeParams } from '../types/skill';
import { generateMoebiusLayout, generateInfinityLayout, generateInfinity2Layout, generateInfinity3Layout } from '../shapes/moebius';
import { generateBrainLayout, generateBrain2Layout, generateBrain3Layout } from '../shapes/brain';

export function getShapeLayout(
  shape: 'moebius' | 'infinity' | 'infinity2' | 'infinity3' | 'brain' | 'brain2' | 'brain3',
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
    case 'infinity3':
      return generateInfinity3Layout(nodes, params);
    case 'brain':
      return generateBrainLayout(nodes, params);
    case 'brain2':
      return generateBrain2Layout(nodes, params);
    case 'brain3':
      return generateBrain3Layout(nodes, params);
    default:
      return [];
  }
} 