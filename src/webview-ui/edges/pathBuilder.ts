/**
 * Path building for edge routing
 */

import type { PlacedNode, Point, BendPoint } from "../types";
import { LAYOUT_CONFIG } from "../constants";
import type { Segment } from "./collision";
import type { ChannelRegistry } from "./channelRouting";

export {
  isInsideNode,
  isInsideAnyNode,
  pathSegmentHitsNode,
  bendpointPathHasCollision,
} from "./nodeCollision";

export {
  isWaypointMeaningful,
  filterOnPathWaypoints,
} from "./waypoints";

export { buildBackEdgePath } from "./backEdge";

export { buildAutoRoutedPath } from "./autoRouting";

export { ensureMinFinalSegment } from "./pathUtils";

export {
  routeBottomToTop,
  routeRightToTop,
  routeLeftToTop,
  routeLeftToLeft,
  routeBottomToRight,
  routeBottomToLeft,
  routeRightToBottom,
  routeLeftToBottom,
  routeRightToLeft,
  routeLeftToRight,
  routeTopToBottom,
} from "./directionRouting";

export { ChannelRegistry } from "./channelRouting";

import { filterOnPathWaypoints } from "./waypoints";
import { buildAutoRoutedPath } from "./autoRouting";
import { buildBendpointPath, buildSingleWaypointPath } from "./bendpointRouting";
import type { BendpointPathResult } from "./bendpointRouting";
import { ensureMinFinalSegment } from "./pathUtils";
import {
  routeBottomToTop,
  routeRightToTop,
  routeLeftToTop,
  routeLeftToLeft,
  routeBottomToRight,
  routeBottomToLeft,
  routeRightToBottom,
  routeLeftToBottom,
  routeRightToLeft,
  routeLeftToRight,
  routeTopToBottom,
} from "./directionRouting";

const { nodeWidth, nodeHeight, horizontalGap, verticalGap } = LAYOUT_CONFIG;

export interface OrthogonalPathResult {
  points: number[];
  waypoints: Point[];
}

export function buildOrthogonalPath(
  start: Point,
  end: Point,
  bendPoints: BendPoint[] | null | undefined,
  fromNode: PlacedNode,
  toNode: PlacedNode,
  outSide: string,
  inSide: string,
  startOffset: number,
  endOffset: number,
  nodeMap: Record<string, PlacedNode>,
  blockingNode: PlacedNode | null,
  occupiedSegments: Segment[],
  channelRegistry?: ChannelRegistry
): number[] | OrthogonalPathResult {
  const points = [start.x, start.y];
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  const hasBendPoints = bendPoints && bendPoints.length > 0;
  const calculatedWaypoints: Point[] = [];

  if (hasBendPoints) {
    const sourceBend = bendPoints.find((bp) => bp.relativeTo === "source");
    const targetBend = bendPoints.find((bp) => bp.relativeTo === "target");

    if (sourceBend && targetBend) {
      const sourceWaypointX =
        fromNode.x + nodeWidth / 2 + sourceBend.x * horizontalGap;
      const sourceWaypointY =
        fromNode.y + nodeHeight / 2 + sourceBend.y * verticalGap;

      const targetWaypointX =
        toNode.x + nodeWidth / 2 + targetBend.x * horizontalGap;
      const targetWaypointY =
        toNode.y + nodeHeight / 2 + targetBend.y * verticalGap;

      const result: BendpointPathResult = buildBendpointPath(
        points,
        start,
        end,
        sourceWaypointX,
        sourceWaypointY,
        targetWaypointX,
        targetWaypointY,
        outSide,
        inSide
      );

      calculatedWaypoints.push(...result.actualWaypoints);
    } else if (sourceBend) {
      const waypointX =
        fromNode.x + nodeWidth / 2 + sourceBend.x * horizontalGap;
      const waypointY =
        fromNode.y + nodeHeight / 2 + sourceBend.y * verticalGap;

      calculatedWaypoints.push({ x: waypointX, y: waypointY });

      const success = buildSingleWaypointPath(
        points,
        start,
        end,
        waypointX,
        waypointY,
        outSide,
        inSide,
        nodeMap,
        fromNode.id,
        toNode.id,
        occupiedSegments,
        fromNode,
        toNode
      );
      if (!success) {
        // fall through to add end
      }
    } else if (targetBend) {
      const waypointX =
        toNode.x + nodeWidth / 2 + targetBend.x * horizontalGap;
      const waypointY =
        toNode.y + nodeHeight / 2 + targetBend.y * verticalGap;

      calculatedWaypoints.push({ x: waypointX, y: waypointY });

      const success = buildSingleWaypointPath(
        points,
        start,
        end,
        waypointX,
        waypointY,
        outSide,
        inSide,
        nodeMap,
        fromNode.id,
        toNode.id,
        occupiedSegments,
        fromNode,
        toNode
      );
      if (!success) {
        // fall through to add end
      }
    }
  } else {
    const isStraightVertical =
      outSide === "bottom" && inSide === "top" && Math.abs(dx) < 5 && dy > 0;

    if (isStraightVertical) {
      points.push(end.x, end.y);
      return points;
    }

    const isStraightHorizontal =
      ((outSide === "right" && inSide === "left") ||
        (outSide === "left" && inSide === "right")) &&
      Math.abs(dy) < 5;

    if (isStraightHorizontal) {
      points.push(end.x, end.y);
      return points;
    }

    const autoRouted = buildAutoRoutedPath(
      start,
      end,
      fromNode,
      toNode,
      outSide,
      inSide,
      nodeMap,
      occupiedSegments,
      channelRegistry
    );

    if (autoRouted) {
      return autoRouted;
    }

    applyFallbackRouting(
      points,
      start,
      end,
      dx,
      dy,
      outSide,
      inSide,
      startOffset,
      endOffset,
      fromNode,
      toNode,
      nodeMap,
      blockingNode
    );
  }

  points.push(end.x, end.y);
  ensureMinFinalSegment(points);

  if (calculatedWaypoints.length > 0) {
    const meaningfulWaypoints = filterOnPathWaypoints(
      calculatedWaypoints,
      points,
      nodeMap
    );
    if (meaningfulWaypoints.length > 0) {
      return { points, waypoints: meaningfulWaypoints };
    }
  }
  return points;
}

function applyFallbackRouting(
  points: number[],
  start: Point,
  end: Point,
  dx: number,
  dy: number,
  outSide: string,
  inSide: string,
  startOffset: number,
  endOffset: number,
  fromNode: PlacedNode,
  toNode: PlacedNode,
  nodeMap: Record<string, PlacedNode>,
  blockingNode: PlacedNode | null
): void {
  if (outSide === "bottom" && inSide === "top") {
    routeBottomToTop(points, start, end, dx, dy, fromNode, toNode, nodeMap);
  } else if (outSide === "right" && inSide === "top") {
    routeRightToTop(
      points,
      start,
      end,
      dy,
      startOffset,
      toNode,
      nodeMap,
      blockingNode
    );
  } else if (outSide === "left" && inSide === "top") {
    routeLeftToTop(
      points,
      start,
      end,
      dx,
      dy,
      startOffset,
      toNode,
      nodeMap,
      blockingNode
    );
  } else if (outSide === "left" && inSide === "left") {
    routeLeftToLeft(points, start, end, dy, startOffset, toNode, blockingNode);
  } else if (outSide === "bottom" && inSide === "right") {
    routeBottomToRight(points, start, end);
  } else if (outSide === "bottom" && inSide === "left") {
    routeBottomToLeft(points, start, end);
  } else if (outSide === "right" && inSide === "bottom") {
    routeRightToBottom(points, start, end, fromNode, toNode, nodeMap);
  } else if (outSide === "left" && inSide === "bottom") {
    routeLeftToBottom(points, start, end, fromNode, toNode, nodeMap);
  } else if (outSide === "right" && inSide === "left") {
    routeRightToLeft(
      points,
      start,
      end,
      dy,
      startOffset,
      endOffset,
      fromNode,
      toNode,
      nodeMap
    );
  } else if (outSide === "left" && inSide === "right") {
    routeLeftToRight(
      points,
      start,
      end,
      dy,
      startOffset,
      endOffset,
      fromNode,
      toNode,
      nodeMap
    );
  } else if (outSide === "top" && inSide === "bottom") {
    routeTopToBottom(points, start, end, dx, startOffset, endOffset);
  } else if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    if (outSide === "right" || outSide === "left") {
      points.push(end.x, start.y);
    } else {
      points.push(start.x, end.y);
    }
  }
}
