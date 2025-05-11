import { SkillNode, NodePosition, ShapeParams } from '../types/skill';
import { generateMoebiusLayout, generateInfinityLayout, generateInfinity2Layout, generateInfinity3Layout } from '../shapes/moebius';
import { generateBrainLayout, generateBrain2Layout, generateBrain3Layout, generateBrain4SVGPolygonLayout, generateBrainSVG2Layout } from '../shapes/brain';
import { generateFist1Layout } from '../shapes/fist1';
import { generateFistLayout } from '../shapes/fist';
import { generateChikaraLayout } from '../shapes/chikara';
import { generateBrainTestLayout } from '../shapes/brainTest';
import { generateBrainTest2Layout } from '../shapes/brainTest2';
import { generateMuscleTestLayout } from '../shapes/muscleTest';
import { generateMuscleTest90x63Layout } from '../shapes/muscleTest90x63';
import { generateMuscleTest90x63FillLayout } from '../shapes/muscleTest90x63Fill';
import { generateTopDownBrainLayout, generateTopDownBrain2Layout } from '../shapes/brain';

export function getShapeLayout(
  shape: 'moebius' | 'infinity' | 'infinity2' | 'infinity3' | 'brain' | 'brain2' | 'brain3' | 'brain4svg' | 'brainsvg2' | 'fist1' | 'chikara' | 'fist' | 'brainTest' | 'brainTest2' | 'muscleTest' | 'muscleTest90x63' | 'muscleTest90x63Fill' | 'topDownBrain' | 'topDownBrain2',
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
    case 'brain4svg':
      return generateBrain4SVGPolygonLayout(nodes, params);
    case 'brainsvg2':
      return generateBrainSVG2Layout(nodes, params);
    case 'fist1':
      return generateFist1Layout(nodes, params);
    case 'fist':
      return generateFistLayout(nodes, params);
    case 'brainTest':
      return generateBrainTestLayout(nodes, params);
    case 'brainTest2':
      return generateBrainTest2Layout(nodes, params);
    case 'muscleTest':
      return generateMuscleTestLayout(nodes, params);
    case 'muscleTest90x63':
      return generateMuscleTest90x63Layout(nodes, params);
    case 'muscleTest90x63Fill':
      return generateMuscleTest90x63FillLayout(nodes, params);
    case 'chikara':
      return generateChikaraLayout(nodes, params);
    case 'topDownBrain':
      return generateTopDownBrainLayout(nodes, params);
    case 'topDownBrain2':
      return generateTopDownBrain2Layout(nodes, params);
    default:
      return [];
  }
} 