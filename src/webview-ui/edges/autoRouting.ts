/**
 * A* pathfinding integration for automatic path routing
 */

import type { PlacedNode, Point } from "../types";
import { EDGE_PAD } from "../constants";
import { nudgePoint } from "./anchors";
import {
  type Segment,
  buildNodeObstacles,
  segmentsToObstacles,
  computeRoutingBounds,
  isInsideObstacle,
  lineIntersectsNode,
} from "./collision";
import {
  aStarRoute,
  simplifyOrthogonalPath,
  flattenPoints,
} from "./pathfinding";
import { ensureMinFinalSegment } from "./pathUtils";
import {
  type ChannelRegistry,
  buildMergedChannelPath,
} from "./channelRouting";

export function buildAutoRoutedPath(
  start: Point,
  end: Point,
  fromNode: PlacedNode,
  toNode: PlacedNode,
  outSide: string,
  inSide: string,
  nodeMap: Record<string, PlacedNode>,
  occupiedSegments: Segment[],
  channelRegistry?: ChannelRegistry
): number[] | null {
  if (channelRegistry) {
    const mergedPath = tryChannelMerge(
      start,
      end,
      fromNode,
      toNode,
      outSide,
      inSide,
      nodeMap,
      channelRegistry
    );
    if (mergedPath) {
      return mergedPath;
    }
  }

  const launch = nudgePoint(start, outSide, 14);
  const approach = nudgePoint(end, inSide, 14);

  const obstacles = [
    ...buildNodeObstacles(nodeMap, fromNode.id, toNode.id),
    ...segmentsToObstacles(occupiedSegments),
  ];

  const bounds = computeRoutingBounds(nodeMap, start, end);

  if (isInsideObstacle(launch.x, launch.y, obstacles)) {
    obstacles.push({
      left: launch.x - EDGE_PAD,
      right: launch.x + EDGE_PAD,
      top: launch.y - EDGE_PAD,
      bottom: launch.y + EDGE_PAD,
    });
  }

  const route = aStarRoute(launch, approach, obstacles, bounds);
  if (!route) {
    return null;
  }

  const stitched: Point[] = [start, launch, ...route, approach, end];
  const simplified = simplifyOrthogonalPath(stitched);
  const flattened = flattenPoints(simplified);
  ensureMinFinalSegment(flattened);
  return flattened;
}

function tryChannelMerge(
  start: Point,
  end: Point,
  fromNode: PlacedNode,
  toNode: PlacedNode,
  outSide: string,
  inSide: string,
  nodeMap: Record<string, PlacedNode>,
  channelRegistry: ChannelRegistry
): number[] | null {
  const targetEnterVertical = inSide === "top" || inSide === "bottom";
  const targetEnterHorizontal = inSide === "left" || inSide === "right";

  if (targetEnterHorizontal) {
    const channelResult = channelRegistry.findMergeableVerticalChannel(
      toNode.id,
      inSide,
      end.y,
      start.x
    );

    if (channelResult) {
      const { mergePoint } = channelResult;

      const channelX = mergePoint.x;
      const targetX = end.x;

      const validPosition =
        (inSide === "right" && channelX > targetX) ||
        (inSide === "left" && channelX < targetX);

      if (validPosition) {
        const mergePathValid = validateMergePath(
          start,
          mergePoint,
          end,
          outSide,
          nodeMap,
          fromNode.id,
          toNode.id
        );

        if (mergePathValid) {
          const path = buildMergedChannelPath(
            start,
            mergePoint,
            end,
            outSide,
            "vertical"
          );
          ensureMinFinalSegment(path);
          return path;
        }
      }
    }
  }

  if (targetEnterVertical) {
    const channelResult = channelRegistry.findMergeableHorizontalChannel(
      toNode.id,
      inSide,
      end.x,
      start.y
    );

    if (channelResult) {
      const { mergePoint } = channelResult;

      const channelY = mergePoint.y;
      const targetY = end.y;

      const validPosition =
        (inSide === "top" && channelY < targetY) ||
        (inSide === "bottom" && channelY > targetY);

      if (validPosition) {
        const mergePathValid = validateMergePath(
          start,
          mergePoint,
          end,
          outSide,
          nodeMap,
          fromNode.id,
          toNode.id
        );

        if (mergePathValid) {
          const path = buildMergedChannelPath(
            start,
            mergePoint,
            end,
            outSide,
            "horizontal"
          );
          ensureMinFinalSegment(path);
          return path;
        }
      }
    }
  }

  return null;
}

function validateMergePath(
  start: Point,
  merge: Point,
  end: Point,
  outSide: string,
  nodeMap: Record<string, PlacedNode>,
  fromNodeId: string,
  toNodeId: string
): boolean {
  if (outSide === "bottom" || outSide === "top") {
    if (lineIntersectsNode(start.x, start.y, start.x, merge.y, nodeMap, fromNodeId, toNodeId)) {
      return false;
    }
    if (lineIntersectsNode(start.x, merge.y, merge.x, merge.y, nodeMap, fromNodeId, toNodeId)) {
      return false;
    }
  } else {
    if (lineIntersectsNode(start.x, start.y, merge.x, start.y, nodeMap, fromNodeId, toNodeId)) {
      return false;
    }
    if (lineIntersectsNode(merge.x, start.y, merge.x, merge.y, nodeMap, fromNodeId, toNodeId)) {
      return false;
    }
  }

  if (lineIntersectsNode(merge.x, merge.y, merge.x, end.y, nodeMap, fromNodeId, toNodeId)) {
    return false;
  }
  if (lineIntersectsNode(merge.x, end.y, end.x, end.y, nodeMap, fromNodeId, toNodeId)) {
    return false;
  }

  return true;
}
