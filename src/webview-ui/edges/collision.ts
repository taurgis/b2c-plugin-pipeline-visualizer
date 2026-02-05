/**
 * Collision detection for edge routing
 */

import type { PlacedNode, Point } from "../types";
import { LAYOUT_CONFIG, EDGE_PAD } from "../constants";

const { nodeWidth, nodeHeight } = LAYOUT_CONFIG;

export interface ObstacleRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const ROUTING_GRID_STEP = 18;
export const ROUTING_MARGIN = 200;
export const ROUTING_SEGMENT_THICKNESS = 10;

export function lineIntersectsNode(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  nodeMap: Record<string, PlacedNode>,
  fromNodeId: string,
  toNodeId: string
): PlacedNode | null {
  if (!nodeMap) {return null;}
  const padding = 10;

  for (const nodeId in nodeMap) {
    if (nodeId === fromNodeId || nodeId === toNodeId) {continue;}
    const node = nodeMap[nodeId];
    const nodeLeft = node.x - padding;
    const nodeRight = node.x + nodeWidth + padding;
    const nodeTop = node.y - padding;
    const nodeBottom = node.y + nodeHeight + padding;

    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    if (Math.abs(y1 - y2) < 5) {
      if (y1 > nodeTop && y1 < nodeBottom) {
        if (maxX > nodeLeft && minX < nodeRight) {
          return node;
        }
      }
    } else if (Math.abs(x1 - x2) < 5) {
      if (x1 > nodeLeft && x1 < nodeRight) {
        if (maxY > nodeTop && minY < nodeBottom) {
          return node;
        }
      }
    }
  }
  return null;
}

export function buildNodeObstacles(
  nodeMap: Record<string, PlacedNode>,
  fromNodeId: string,
  toNodeId: string
): ObstacleRect[] {
  const padding = EDGE_PAD;
  const obstacles: ObstacleRect[] = [];

  for (const [id, node] of Object.entries(nodeMap)) {
    if (id === fromNodeId || id === toNodeId) {continue;}
    obstacles.push({
      left: node.x - padding,
      right: node.x + nodeWidth + padding,
      top: node.y - padding,
      bottom: node.y + nodeHeight + padding,
    });
  }
  return obstacles;
}

export function segmentsToObstacles(segments: Segment[]): ObstacleRect[] {
  const obstacles: ObstacleRect[] = [];

  for (const seg of segments) {
    const minX = Math.min(seg.x1, seg.x2) - ROUTING_SEGMENT_THICKNESS;
    const maxX = Math.max(seg.x1, seg.x2) + ROUTING_SEGMENT_THICKNESS;
    const minY = Math.min(seg.y1, seg.y2) - ROUTING_SEGMENT_THICKNESS;
    const maxY = Math.max(seg.y1, seg.y2) + ROUTING_SEGMENT_THICKNESS;
    obstacles.push({ left: minX, right: maxX, top: minY, bottom: maxY });
  }
  return obstacles;
}

export function computeRoutingBounds(
  nodeMap: Record<string, PlacedNode>,
  start: Point,
  end: Point
): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Math.min(start.x, end.x);
  let maxX = Math.max(start.x, end.x);
  let minY = Math.min(start.y, end.y);
  let maxY = Math.max(start.y, end.y);

  for (const node of Object.values(nodeMap)) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x + nodeWidth);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y + nodeHeight);
  }

  return {
    minX: minX - ROUTING_MARGIN,
    maxX: maxX + ROUTING_MARGIN,
    minY: minY - ROUTING_MARGIN,
    maxY: maxY + ROUTING_MARGIN,
  };
}

export function isInsideObstacle(
  x: number,
  y: number,
  obstacles: ObstacleRect[]
): boolean {
  for (const obs of obstacles) {
    if (x >= obs.left && x <= obs.right && y >= obs.top && y <= obs.bottom) {
      return true;
    }
  }
  return false;
}

export function pointsToSegments(points: number[]): Segment[] {
  const segments: Segment[] = [];

  for (let i = 0; i < points.length - 2; i += 2) {
    segments.push({
      x1: points[i],
      y1: points[i + 1],
      x2: points[i + 2],
      y2: points[i + 3],
    });
  }
  return segments;
}
