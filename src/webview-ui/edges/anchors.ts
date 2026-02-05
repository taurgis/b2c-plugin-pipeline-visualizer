/**
 * Anchor point calculation for edge routing
 */

import type { Point, PlacedNode } from "../types";
import { LAYOUT_CONFIG } from "../constants";

const { nodeWidth, nodeHeight } = LAYOUT_CONFIG;

export const JOIN_RADIUS = 10;

export function getAnchor(node: PlacedNode, side: string, offset: number): Point {
  if (node.type === "join") {
    const centerX = node.x + nodeWidth / 2;
    const centerY = node.y + nodeHeight / 2;

    if (side === "top") {return { x: centerX + offset, y: centerY - JOIN_RADIUS };}
    if (side === "bottom") {return { x: centerX + offset, y: centerY + JOIN_RADIUS };}
    if (side === "left") {return { x: centerX - JOIN_RADIUS, y: centerY + offset };}
    return { x: centerX + JOIN_RADIUS, y: centerY + offset };
  }

  if (side === "top") {return { x: node.x + nodeWidth / 2 + offset, y: node.y };}
  if (side === "bottom") {return { x: node.x + nodeWidth / 2 + offset, y: node.y + nodeHeight };}
  if (side === "left") {return { x: node.x, y: node.y + nodeHeight / 2 + offset };}
  return { x: node.x + nodeWidth, y: node.y + nodeHeight / 2 + offset };
}

export function getAnchorPoint(node: PlacedNode, side: string): Point {
  return getAnchor(node, side, 0);
}

export function getArrowAngleForSide(side: string): number {
  if (side === "top") {return Math.PI / 2;} // 90deg = down
  if (side === "bottom") {return -Math.PI / 2;} // -90deg = up
  if (side === "left") {return 0;} // 0deg = right
  return Math.PI; // 180deg = left
}

export function calculateArrowAngleFromPoints(points: number[]): number {
  if (points.length < 4) {return 0;}

  const lastX = points[points.length - 2];
  const lastY = points[points.length - 1];

  for (let i = points.length - 4; i >= 0; i -= 2) {
    const prevX = points[i];
    const prevY = points[i + 1];
    const dx = lastX - prevX;
    const dy = lastY - prevY;

    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      return Math.atan2(dy, dx);
    }
  }

  return 0;
}

export function sideVector(side: string): Point {
  switch (side) {
    case "top":
      return { x: 0, y: -1 };
    case "bottom":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    default:
      return { x: 1, y: 0 };
  }
}

export function nudgePoint(point: Point, side: string, distance: number): Point {
  const v = sideVector(side);
  return { x: point.x + v.x * distance, y: point.y + v.y * distance };
}
