/**
 * Waypoint filtering and validation for path building
 */

import type { PlacedNode, Point } from "../types";
import { isInsideAnyNode } from "./nodeCollision";

export function isWaypointMeaningful(
  waypoint: Point,
  pathPoints: number[],
  nodeMap: Record<string, PlacedNode>,
  tolerance: number = 20
): boolean {
  if (isInsideAnyNode(waypoint, nodeMap)) {
    return false;
  }

  if (pathPoints.length < 6) {
    return false;
  }

  for (let i = 2; i < pathPoints.length - 2; i += 2) {
    const cornerX = pathPoints[i];
    const cornerY = pathPoints[i + 1];

    const dx = Math.abs(waypoint.x - cornerX);
    const dy = Math.abs(waypoint.y - cornerY);

    if (dx <= tolerance && dy <= tolerance) {
      return true;
    }
  }

  return false;
}

export function filterOnPathWaypoints(
  waypoints: Point[],
  pathPoints: number[],
  nodeMap: Record<string, PlacedNode>
): Point[] {
  return waypoints.filter((wp) =>
    isWaypointMeaningful(wp, pathPoints, nodeMap)
  );
}
