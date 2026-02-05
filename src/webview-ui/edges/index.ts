/**
 * Edge routing module - public API
 */

export {
  normalizeLabel,
  isErrorEdge,
  inferExitSideFromBendpoints,
  inferEntrySideFromBendpoints,
  getSourceBendpoints,
  getTargetBendpoints,
} from "./edgeUtils";

export {
  JOIN_RADIUS,
  getAnchor,
  getAnchorPoint,
  getArrowAngleForSide,
  calculateArrowAngleFromPoints,
  sideVector,
  nudgePoint,
} from "./anchors";

export {
  type ObstacleRect,
  type Segment,
  ROUTING_GRID_STEP,
  ROUTING_MARGIN,
  ROUTING_SEGMENT_THICKNESS,
  lineIntersectsNode,
  buildNodeObstacles,
  segmentsToObstacles,
  computeRoutingBounds,
  isInsideObstacle,
  pointsToSegments,
} from "./collision";

export {
  snapToGrid,
  aStarRoute,
  simplifyOrthogonalPath,
  flattenPoints,
} from "./pathfinding";

export {
  setDebugLogging,
  determineSides,
  determineSidesFromNodeMap,
  determineSidesFromMap,
} from "./sideDetermination";

export {
  buildBackEdgePath,
  buildAutoRoutedPath,
  buildOrthogonalPath,
  ensureMinFinalSegment,
  ChannelRegistry,
  type OrthogonalPathResult,
} from "./pathBuilder";

export {
  type EdgeChannel,
  buildMergedChannelPath,
} from "./channelRouting";
