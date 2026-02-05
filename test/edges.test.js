const assert = require("node:assert/strict");
const test = require("node:test");

const { LAYOUT_CONFIG, getEdgeColor, isLoopBackEdge } = require("../dist/webview-ui/constants");
const anchors = require("../dist/webview-ui/edges/anchors");
const edgeUtils = require("../dist/webview-ui/edges/edgeUtils");
const sideDetermination = require("../dist/webview-ui/edges/sideDetermination");
const backEdge = require("../dist/webview-ui/edges/backEdge");
const bendpointRouting = require("../dist/webview-ui/edges/bendpointRouting");
const autoRouting = require("../dist/webview-ui/edges/autoRouting");
const channelRouting = require("../dist/webview-ui/edges/channelRouting");
const collision = require("../dist/webview-ui/edges/collision");
const nodeCollision = require("../dist/webview-ui/edges/nodeCollision");
const directionRouting = require("../dist/webview-ui/edges/directionRouting");
const pathfinding = require("../dist/webview-ui/edges/pathfinding");
const pathUtils = require("../dist/webview-ui/edges/pathUtils");
const waypoints = require("../dist/webview-ui/edges/waypoints");
const pathBuilder = require("../dist/webview-ui/edges/pathBuilder");

function makePlacedNode(id, x, y, type = "pipelet") {
  return {
    id,
    label: id,
    type,
    branch: "Main",
    attributes: {},
    configProperties: [],
    bindings: [],
    template: null,
    description: null,
    x,
    y,
  };
}

const baseX = LAYOUT_CONFIG.baseX;
const baseY = LAYOUT_CONFIG.baseY;
const gapX = LAYOUT_CONFIG.horizontalGap;
const gapY = LAYOUT_CONFIG.verticalGap;

const nodeA = makePlacedNode("A", baseX, baseY, "start");
const nodeB = makePlacedNode("B", baseX + gapX, baseY, "pipelet");
const nodeC = makePlacedNode("C", baseX, baseY + gapY, "join");
const nodeD = makePlacedNode("D", baseX + gapX, baseY + gapY, "end");

const nodeMap = {
  A: nodeA,
  B: nodeB,
  C: nodeC,
  D: nodeD,
};

test("anchors and vectors behave as expected", () => {
  const anchorTop = anchors.getAnchor(nodeA, "top", 10);
  assert.equal(anchorTop.y, nodeA.y);

  const joinTop = anchors.getAnchor(nodeC, "top", 0);
  assert.ok(joinTop.y < nodeC.y + LAYOUT_CONFIG.nodeHeight / 2);

  const joinBottom = anchors.getAnchor(nodeC, "bottom", 0);
  assert.ok(joinBottom.y > nodeC.y + LAYOUT_CONFIG.nodeHeight / 2);

  const joinAnchor = anchors.getAnchor(nodeC, "left", 5);
  assert.ok(joinAnchor.x < nodeC.x + LAYOUT_CONFIG.nodeWidth / 2);

  const anchorPoint = anchors.getAnchorPoint(nodeA, "right");
  assert.equal(anchorPoint.x, nodeA.x + LAYOUT_CONFIG.nodeWidth);

  assert.equal(anchors.getArrowAngleForSide("left"), 0);
  assert.equal(anchors.getArrowAngleForSide("right"), Math.PI);
  assert.equal(anchors.getArrowAngleForSide("top"), Math.PI / 2);
  assert.equal(anchors.getArrowAngleForSide("bottom"), -Math.PI / 2);

  const angle = anchors.calculateArrowAngleFromPoints([0, 0, 10, 0]);
  assert.ok(Math.abs(angle) < 0.01);

  const verticalAngle = anchors.calculateArrowAngleFromPoints([0, 0, 0, 10]);
  assert.ok(Math.abs(verticalAngle - Math.PI / 2) < 0.01);

  const shortAngle = anchors.calculateArrowAngleFromPoints([0, 0]);
  assert.equal(shortAngle, 0);

  const v = anchors.sideVector("left");
  assert.deepEqual(v, { x: -1, y: 0 });

  const nudged = anchors.nudgePoint({ x: 10, y: 10 }, "top", 5);
  assert.equal(nudged.y, 5);
});

test("edge utils and constants classify labels", () => {
  assert.equal(edgeUtils.normalizeLabel("Pipelet Error"), "pipelet_error");
  assert.equal(edgeUtils.normalizeLabel(null), "");
  assert.ok(edgeUtils.isErrorEdge("error"));
  assert.ok(edgeUtils.isErrorEdge("pipelet_error"));
  assert.ok(edgeUtils.isErrorEdge("some-error"));

  assert.equal(getEdgeColor("error"), "#ff8a7a");
  assert.equal(getEdgeColor("pipelet_error"), "#ff8a7a");
  assert.equal(getEdgeColor("do"), "#f2c078");
  assert.equal(getEdgeColor("loop"), "#f2c078");
  assert.equal(getEdgeColor("iterate"), "#f2c078");
  assert.equal(getEdgeColor("next_iteration"), "#f2c078");
  assert.equal(getEdgeColor("yes"), "#6be8c7");
  assert.equal(getEdgeColor("true"), "#6be8c7");
  assert.equal(getEdgeColor("success"), "#6be8c7");
  assert.equal(getEdgeColor("pipelet_next"), "#6be8c7");
  assert.equal(getEdgeColor("ok"), "#6be8c7");
  assert.equal(getEdgeColor("next"), "#6dd3ff");
  assert.equal(getEdgeColor("custom"), "#6dd3ff");
  assert.equal(getEdgeColor("no"), "#ff8a7a");
  assert.equal(getEdgeColor("false"), "#ff8a7a");
  assert.ok(isLoopBackEdge("loop"));
  assert.ok(isLoopBackEdge("next_iteration"));
  assert.ok(!isLoopBackEdge("random"));
});

test("bendpoints inference picks sides", () => {
  const bends = [
    { relativeTo: "source", x: 1, y: 0 },
    { relativeTo: "target", x: 0, y: -1 },
  ];

  assert.equal(edgeUtils.inferExitSideFromBendpoints(bends), "right");
  assert.equal(edgeUtils.inferEntrySideFromBendpoints(bends), "top");

  const source = edgeUtils.getSourceBendpoints(bends);
  const target = edgeUtils.getTargetBendpoints(bends);
  assert.equal(source.length, 1);
  assert.equal(target.length, 1);
});

test("bendpoints inference handles ties and missing", () => {
  assert.equal(edgeUtils.inferExitSideFromBendpoints([]), null);
  assert.equal(edgeUtils.inferEntrySideFromBendpoints(undefined), null);
  assert.deepEqual(edgeUtils.getSourceBendpoints([]), []);
  assert.deepEqual(edgeUtils.getTargetBendpoints(undefined), []);

  const tied = [{ relativeTo: "source", x: 1, y: 1 }];
  assert.equal(edgeUtils.inferExitSideFromBendpoints(tied), "right");

  const targetBends = [
    { relativeTo: "target", x: 2, y: 0 },
    { relativeTo: "target", x: 0, y: 1 },
  ];
  assert.equal(edgeUtils.inferEntrySideFromBendpoints(targetBends), "bottom");

  const sorted = edgeUtils.getSourceBendpoints([
    { relativeTo: "source", x: 2, y: 2 },
    { relativeTo: "source", x: 1, y: 0 },
  ]);
  assert.equal(sorted[0].x, 1);

  const targetSorted = edgeUtils.getTargetBendpoints([
    { relativeTo: "target", x: 3, y: 0 },
    { relativeTo: "target", x: 0, y: 1 },
  ]);
  assert.equal(targetSorted[0].x, 0);
});

test("side determination returns valid sides", () => {
  const edge = {
    from: "A",
    to: "B",
    label: "error",
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, nodeA, nodeB, nodeMap);
  assert.ok(["top", "bottom", "left", "right"].includes(result.outSide));
  assert.ok(["top", "bottom", "left", "right"].includes(result.inSide));
});

test("side determination respects bendpoints and join targets", () => {
  const joinTarget = makePlacedNode("J", baseX + gapX * 2, baseY, "join");
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const map = { F: from, J: joinTarget };
  const edge = {
    from: "F",
    to: "J",
    label: "next",
    display: {
      bendPoints: [
        { relativeTo: "source", x: 1, y: 0 },
        { relativeTo: "target", x: 0, y: 1 },
      ],
    },
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, joinTarget, map);
  assert.equal(result.outSide, "right");
  assert.equal(result.inSide, "bottom");
});

test("side determination uses bendpoint exit and entry sides", () => {
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX + gapX, baseY + gapY, "pipelet");
  const map = { F: from, T: to };
  const edge = {
    from: "F",
    to: "T",
    label: "next",
    display: {
      bendPoints: [
        { relativeTo: "source", x: -1, y: 0 },
        { relativeTo: "target", x: 0, y: -1 },
      ],
    },
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, to, map);
  assert.equal(result.outSide, "left");
  assert.equal(result.inSide, "top");
});

test("side determination handles blocking nodes and yes/no", () => {
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX, baseY + gapY * 2, "pipelet");
  const blocker = makePlacedNode("X", baseX, baseY + gapY, "pipelet");
  const map = { F: from, T: to, X: blocker };

  const edge = {
    from: "F",
    to: "T",
    label: "yes",
    sourceConnector: "yes",
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, to, map);
  assert.equal(result.outSide, "right");
  assert.equal(result.blockingNode?.id, "X");
});

test("side determination respects no-connector with clear path", () => {
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX, baseY + gapY, "pipelet");
  const map = { F: from, T: to };

  const edge = {
    from: "F",
    to: "T",
    label: "no",
    sourceConnector: "no",
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, to, map);
  assert.equal(result.outSide, "bottom");
  assert.equal(result.inSide, "top");
});

test("side determination uses target connector hints", () => {
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX, baseY + gapY, "pipelet");
  const map = { F: from, T: to };

  const edge = {
    from: "F",
    to: "T",
    label: "next",
    targetConnector: "right",
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, to, map);
  assert.equal(result.inSide, "right");
});

test("side determination adjusts for same-row targets", () => {
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX + gapX, baseY, "pipelet");
  const map = { F: from, T: to };

  const edge = {
    from: "F",
    to: "T",
    label: "next",
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, to, map);
  assert.equal(result.outSide, "right");
  assert.equal(result.inSide, "left");
});

test("side determination uses blocking-node fallback", () => {
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX, baseY + gapY * 2, "pipelet");
  const blocker = makePlacedNode("X", baseX, baseY + gapY, "pipelet");
  const map = { F: from, T: to, X: blocker };

  const edge = {
    from: "F",
    to: "T",
    label: "next",
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, to, map);
  assert.equal(result.outSide, "left");
  assert.equal(result.inSide, "left");
  assert.equal(result.blockingNode?.id, "X");
});

test("side determination flips when target is above", () => {
  const from = makePlacedNode("F", baseX, baseY + gapY, "pipelet");
  const to = makePlacedNode("T", baseX, baseY, "pipelet");
  const map = { F: from, T: to };

  const edge = {
    from: "F",
    to: "T",
    label: "next",
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, to, map);
  assert.equal(result.outSide, "top");
});

test("side determination flips in-side when target is above with connector", () => {
  const from = makePlacedNode("F", baseX + gapX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX, baseY - gapY, "pipelet");
  const map = { F: from, T: to };

  const edge = {
    from: "F",
    to: "T",
    label: "error",
    sourceConnector: "error",
    targetConnector: "in",
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, to, map);
  assert.equal(result.outSide, "right");
  assert.equal(result.inSide, "bottom");
});

test("side determination handles loop target connector", () => {
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX, baseY + gapY, "pipelet");
  const map = { F: from, T: to };

  const edge = {
    from: "F",
    to: "T",
    label: "loop",
    targetConnector: "loop",
  };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, to, map);
  assert.equal(result.inSide, "top");
});

test("side determination honors target connector variants", () => {
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX, baseY + gapY, "pipelet");
  const map = { F: from, T: to };

  const connectors = ["in", "in1", "in2", "left", "right", "bottom", "loop", "custom"];
  for (const conn of connectors) {
    const edge = {
      from: "F",
      to: "T",
      label: "next",
      targetConnector: conn,
    };
    const result = sideDetermination.determineSidesFromNodeMap(edge, from, to, map);

    if (conn === "left" || conn === "right" || conn === "bottom") {
      assert.equal(result.inSide, conn);
    } else {
      assert.equal(result.inSide, "top");
    }
  }
});

test("side determination emits debug logs when enabled", () => {
  sideDetermination.setDebugLogging(true);
  const edge = { from: "A", to: "C", label: "next" };
  const result = sideDetermination.determineSidesFromNodeMap(edge, nodeA, nodeC, nodeMap);
  sideDetermination.setDebugLogging(false);

  assert.ok(result);
});

test("side determination join vertical dominance from below", () => {
  const joinTarget = makePlacedNode("J", baseX, baseY, "join");
  const from = makePlacedNode("F", baseX, baseY + gapY * 3, "pipelet");
  const map = { F: from, J: joinTarget };
  const edge = { from: "F", to: "J", label: "next" };

  const result = sideDetermination.determineSidesFromNodeMap(edge, from, joinTarget, map);
  assert.equal(result.inSide, "bottom");
});

test("side determination handles source connector variants", () => {
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX + gapX, baseY, "pipelet");
  const map = { F: from, T: to };

  const errorEdge = { from: "F", to: "T", label: "error", sourceConnector: "error" };
  const errorResult = sideDetermination.determineSidesFromNodeMap(errorEdge, from, to, map);
  assert.equal(errorResult.outSide, "right");

  const yesEdge = { from: "F", to: "T", label: "yes", sourceConnector: "yes" };
  const yesResult = sideDetermination.determineSidesFromNodeMap(yesEdge, from, to, map);
  assert.ok(["bottom", "right"].includes(yesResult.outSide));

  const noEdge = { from: "F", to: "T", label: "no", sourceConnector: "no" };
  const noResult = sideDetermination.determineSidesFromNodeMap(noEdge, from, to, map);
  assert.ok(["bottom", "left"].includes(noResult.outSide));
});

test("determineSidesFromMap works with Map input", () => {
  const from = makePlacedNode("F", baseX, baseY, "pipelet");
  const to = makePlacedNode("T", baseX + gapX, baseY, "pipelet");
  const map = new Map([
    ["F", from],
    ["T", to],
  ]);

  const edge = { from: "F", to: "T", label: "next" };
  const result = sideDetermination.determineSidesFromMap(edge, from, to, map);
  assert.ok(["top", "bottom", "left", "right"].includes(result.outSide));
  assert.ok(["top", "bottom", "left", "right"].includes(result.inSide));
});

test("collision helpers detect intersections", () => {
  const hit = collision.lineIntersectsNode(
    nodeA.x,
    nodeA.y,
    nodeA.x + LAYOUT_CONFIG.nodeWidth,
    nodeA.y,
    nodeMap,
    "A",
    "B"
  );
  assert.equal(hit, null);

  const verticalHit = collision.lineIntersectsNode(
    nodeB.x + LAYOUT_CONFIG.nodeWidth / 2,
    nodeB.y - 20,
    nodeB.x + LAYOUT_CONFIG.nodeWidth / 2,
    nodeB.y + 20,
    nodeMap,
    "A",
    "C"
  );
  assert.equal(verticalHit?.id, "B");

  const obstacles = collision.buildNodeObstacles(nodeMap, "A", "B");
  assert.ok(obstacles.length > 0);

  const segments = collision.pointsToSegments([0, 0, 0, 10, 10, 10]);
  const segObstacles = collision.segmentsToObstacles(segments);
  assert.ok(segObstacles.length > 0);

  const bounds = collision.computeRoutingBounds(nodeMap, { x: 0, y: 0 }, { x: 100, y: 100 });
  assert.ok(bounds.maxX > bounds.minX);

  assert.ok(collision.isInsideObstacle(segObstacles[0].left, segObstacles[0].top, segObstacles));
  assert.ok(!collision.isInsideObstacle(9999, 9999, segObstacles));
});

test("node collision helpers detect path overlaps", () => {
  const inside = nodeCollision.isInsideNode({ x: nodeA.x + 5, y: nodeA.y + 5 }, nodeA);
  assert.ok(inside);

  const anyInside = nodeCollision.isInsideAnyNode({ x: nodeB.x + 5, y: nodeB.y + 5 }, nodeMap);
  assert.ok(anyInside);

  const hit = nodeCollision.pathSegmentHitsNode(
    nodeB.x,
    nodeB.y,
    nodeB.x + LAYOUT_CONFIG.nodeWidth,
    nodeB.y,
    nodeMap,
    ["B"]
  );
  assert.equal(hit, null);

  const hasCollision = nodeCollision.bendpointPathHasCollision(
    [nodeB.x, nodeB.y, nodeB.x + 10, nodeB.y + 10],
    nodeMap,
    "A",
    "D"
  );
  assert.ok(hasCollision);
});

test("pathfinding utilities return routes and simplify", () => {
  const obstacles = [];
  const bounds = { minX: -100, maxX: 200, minY: -100, maxY: 200 };
  const route = pathfinding.aStarRoute({ x: 0, y: 0 }, { x: 72, y: 0 }, obstacles, bounds);
  assert.ok(route);

  const blocked = pathfinding.aStarRoute(
    { x: 0, y: 0 },
    { x: 36, y: 0 },
    [{ left: -200, right: 200, top: -200, bottom: 200 }],
    { minX: -50, maxX: 50, minY: -50, maxY: 50 }
  );
  assert.equal(blocked, null);

  const snapped = pathfinding.snapToGrid(19);
  assert.equal(snapped % collision.ROUTING_GRID_STEP, 0);

  const simplified = pathfinding.simplifyOrthogonalPath([
    { x: 0, y: 0 },
    { x: 0, y: 18 },
    { x: 0, y: 36 },
    { x: 18, y: 36 },
  ]);
  assert.ok(simplified.length < 4);

  const flattened = pathfinding.flattenPoints([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
  assert.deepEqual(flattened, [1, 2, 3, 4]);
});

test("channel registry finds mergeable channels", () => {
  const registry = new channelRouting.ChannelRegistry();
  registry.registerEdge(
    [{ x1: 100, y1: 0, x2: 100, y2: 100 }],
    "B",
    "left"
  );

  registry.registerEdge(
    [{ x1: 0, y1: 120, x2: 100, y2: 120 }],
    "B",
    "bottom"
  );

  const result = registry.findMergeableVerticalChannel("B", "left", 50, 0);
  assert.ok(result);
  assert.ok(result.mergePoint.x < 100);

  const horiz = registry.findMergeableHorizontalChannel("B", "bottom", 50, 0);
  assert.ok(horiz);

  const merged = channelRouting.buildMergedChannelPath(
    { x: 10, y: 10 },
    result.mergePoint,
    { x: 80, y: 80 },
    "right",
    "vertical"
  );
  assert.ok(merged.length > 4);

  const mergedHorizontal = channelRouting.buildMergedChannelPath(
    { x: 10, y: 10 },
    horiz.mergePoint,
    { x: 80, y: 80 },
    "top",
    "horizontal"
  );
  assert.ok(mergedHorizontal.length > 4);

  assert.ok(registry.getChannels().length > 0);
  registry.clear();
  assert.equal(registry.getChannels().length, 0);
});

test("auto routing skips invalid channel positions", () => {
  const from = makePlacedNode("F", 0, 0, "pipelet");
  const to = makePlacedNode("T", 100, 0, "pipelet");
  const map = { F: from, T: to };

  const registry = new channelRouting.ChannelRegistry();
  registry.registerEdge([{ x1: 200, y1: -50, x2: 200, y2: 50 }], "T", "left");

  const path = autoRouting.buildAutoRoutedPath(
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    from,
    to,
    "right",
    "left",
    map,
    [],
    registry
  );

  assert.ok(path);
});

test("auto routing falls back when merge path is blocked", () => {
  const from = makePlacedNode("F", 0, 0, "pipelet");
  const to = makePlacedNode("T", 200, 0, "pipelet");
  const blocker = makePlacedNode("X", 20, -10, "pipelet");
  const map = { F: from, T: to, X: blocker };

  const registry = new channelRouting.ChannelRegistry();
  registry.registerEdge([{ x1: 60, y1: -50, x2: 60, y2: 50 }], "T", "left");

  const path = autoRouting.buildAutoRoutedPath(
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    from,
    to,
    "right",
    "left",
    map,
    [],
    registry
  );

  assert.equal(path, null);
});

test("auto routing merges channels and handles launch obstacles", () => {
  const from = makePlacedNode("F", 0, 0, "pipelet");
  const to = makePlacedNode("T", 200, 0, "pipelet");
  const toTop = makePlacedNode("T2", 0, 200, "pipelet");
  const blocker = makePlacedNode("B", 20, -20, "pipelet");
  const map = { F: from, T: to };

  const registry = new channelRouting.ChannelRegistry();
  registry.registerEdge([{ x1: 50, y1: -50, x2: 50, y2: 50 }], "T", "left");

  const mergedVertical = autoRouting.buildAutoRoutedPath(
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    from,
    to,
    "right",
    "left",
    map,
    [],
    registry
  );
  assert.ok(mergedVertical);

  registry.registerEdge([{ x1: -50, y1: 50, x2: 50, y2: 50 }], "T2", "top");
  const mergedHorizontal = autoRouting.buildAutoRoutedPath(
    { x: 0, y: 0 },
    { x: 0, y: 200 },
    from,
    toTop,
    "bottom",
    "top",
    { F: from, T2: toTop },
    [],
    registry
  );
  assert.ok(mergedHorizontal);

  const obstacleMap = { F: from, T: to, B: blocker };
  const routedAround = autoRouting.buildAutoRoutedPath(
    { x: blocker.x - 40, y: blocker.y },
    { x: 200, y: 0 },
    from,
    to,
    "right",
    "left",
    obstacleMap,
    []
  );
  assert.equal(routedAround, null);
});

test("direction routing and back edges build points", () => {
  const points = [nodeA.x, nodeA.y];
  directionRouting.routeBottomToTop(points, { x: 10, y: 10 }, { x: 20, y: 100 }, 10, 90, nodeA, nodeD, nodeMap);
  assert.ok(points.length > 2);

  directionRouting.routeRightToTop(points, { x: 0, y: 0 }, { x: 50, y: 50 }, 50, 5, nodeD, nodeMap, null);
  directionRouting.routeLeftToTop(points, { x: 0, y: 0 }, { x: -50, y: 50 }, -50, 50, 5, nodeD, nodeMap, null);
  directionRouting.routeLeftToLeft(points, { x: 0, y: 0 }, { x: -50, y: 50 }, 50, 0, nodeD, null);
  directionRouting.routeBottomToRight(points, { x: 0, y: 0 }, { x: 50, y: 50 });
  directionRouting.routeBottomToLeft(points, { x: 0, y: 0 }, { x: -50, y: 50 });
  directionRouting.routeRightToBottom(points, { x: 0, y: 0 }, { x: 50, y: 50 }, nodeA, nodeD, nodeMap);
  directionRouting.routeLeftToBottom(points, { x: 0, y: 0 }, { x: -50, y: 50 }, nodeA, nodeD, nodeMap);
  directionRouting.routeRightToBottom(points, { x: 0, y: 0 }, { x: 50, y: -50 }, nodeA, nodeD, nodeMap);
  directionRouting.routeLeftToBottom(points, { x: 0, y: 0 }, { x: -50, y: -50 }, nodeA, nodeD, nodeMap);
  directionRouting.routeRightToLeft(points, { x: 0, y: 0 }, { x: -50, y: 50 }, 50, 0, 0, nodeA, nodeD, nodeMap);
  directionRouting.routeLeftToRight(points, { x: 0, y: 0 }, { x: 50, y: 50 }, 50, 0, 0, nodeA, nodeD, nodeMap);
  directionRouting.routeTopToBottom(points, { x: 0, y: 0 }, { x: 50, y: 50 }, 50, 0, 0);

  const back = backEdge.buildBackEdgePath(nodeA, nodeC);
  assert.ok(back.points.length > 0);
  assert.ok(back.end.x !== undefined);
});

test("direction routing handles blockers", () => {
  const from = makePlacedNode("F", 0, 0, "pipelet");
  const to = makePlacedNode("T", 100, 200, "pipelet");
  const horizontalBlocker = makePlacedNode("H", 20, 40, "pipelet");
  const verticalBlocker = makePlacedNode("V", 0, 10, "pipelet");

  const mapH = { F: from, T: to, H: horizontalBlocker };
  const pointsH = [from.x, from.y];
  directionRouting.routeBottomToTop(pointsH, { x: 0, y: 0 }, { x: 100, y: 200 }, 100, 200, from, to, mapH);
  assert.ok(pointsH.length > 2);

  const mapV = { F: from, T: to, V: verticalBlocker };
  const pointsV = [from.x, from.y];
  directionRouting.routeBottomToTop(pointsV, { x: 0, y: 0 }, { x: 100, y: 200 }, 100, 200, from, to, mapV);
  assert.ok(pointsV.length > 2);

  const pointsSameX = [from.x, from.y];
  directionRouting.routeBottomToTop(pointsSameX, { x: 0, y: 0 }, { x: 0, y: 200 }, 0, 200, from, to, mapV);
  assert.ok(pointsSameX.length > 2);
});

test("direction routing handles side blockers", () => {
  const from = makePlacedNode("F", 0, 0, "pipelet");
  const to = makePlacedNode("T", 100, 100, "pipelet");
  const blockerRight = makePlacedNode("BR", 120, 20, "pipelet");
  const blockerLeft = makePlacedNode("BL", -120, 20, "pipelet");
  const map = { F: from, T: to, BR: blockerRight, BL: blockerLeft };

  const pointsRight = [from.x, from.y];
  directionRouting.routeRightToTop(pointsRight, { x: 0, y: 0 }, { x: 100, y: 100 }, 100, 0, to, map, null);
  assert.ok(pointsRight.length > 2);

  const pointsLeft = [from.x, from.y];
  directionRouting.routeLeftToTop(pointsLeft, { x: 0, y: 0 }, { x: -100, y: 100 }, -100, 100, 0, to, map, blockerLeft);
  assert.ok(pointsLeft.length > 2);

  const pointsLeftLeft = [from.x, from.y];
  directionRouting.routeLeftToLeft(pointsLeftLeft, { x: 0, y: 0 }, { x: -100, y: 100 }, 100, 0, to, blockerLeft);
  assert.ok(pointsLeftLeft.length > 2);

  const pointsRightLeft = [from.x, from.y];
  directionRouting.routeRightToLeft(pointsRightLeft, { x: 0, y: 0 }, { x: -100, y: 100 }, 100, 0, 0, from, to, map);
  assert.ok(pointsRightLeft.length > 2);
});

test("bendpoint and orthogonal routing generate paths", () => {
  const points = [0, 0];
  const bendResult = bendpointRouting.buildBendpointPath(
    points,
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    20,
    0,
    40,
    0,
    "right",
    "left"
  );
  assert.ok(bendResult.actualWaypoints.length > 0);

  const waypointPoints = [0, 0];
  const singleOk = bendpointRouting.buildSingleWaypointPath(
    waypointPoints,
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    120,
    0,
    "right",
    "left",
    nodeMap,
    "A",
    "B",
    [],
    nodeA,
    nodeB
  );
  assert.ok(singleOk);

  const auto = autoRouting.buildAutoRoutedPath(
    { x: 0, y: 0 },
    { x: 180, y: 90 },
    nodeA,
    nodeD,
    "bottom",
    "top",
    nodeMap,
    []
  );
  assert.ok(auto);

  const registry = new channelRouting.ChannelRegistry();
  registry.registerEdge([{ x1: 50, y1: 0, x2: 50, y2: 100 }], "B", "left");
  const merged = autoRouting.buildAutoRoutedPath(
    { x: 0, y: 0 },
    { x: 160, y: 0 },
    nodeA,
    nodeB,
    "right",
    "left",
    nodeMap,
    [],
    registry
  );
  assert.ok(merged);

  const pathResult = pathBuilder.buildOrthogonalPath(
    { x: 0, y: 0 },
    { x: 220, y: 0 },
    null,
    nodeA,
    nodeB,
    "right",
    "left",
    0,
    0,
    nodeMap,
    null,
    []
  );

  const pointsOut = Array.isArray(pathResult) ? pathResult : pathResult.points;
  assert.ok(pointsOut.length >= 4);

  const vertical = pathBuilder.buildOrthogonalPath(
    { x: 0, y: 0 },
    { x: 0, y: 120 },
    null,
    nodeA,
    nodeC,
    "bottom",
    "top",
    0,
    0,
    nodeMap,
    null,
    []
  );
  assert.ok(Array.isArray(vertical));

  const sourceOnly = pathBuilder.buildOrthogonalPath(
    { x: 0, y: 0 },
    { x: 120, y: 0 },
    [{ relativeTo: "source", x: 1, y: 0 }],
    nodeA,
    nodeB,
    "right",
    "left",
    0,
    0,
    nodeMap,
    null,
    []
  );
  assert.ok(Array.isArray(sourceOnly) || sourceOnly.points.length >= 4);

  const targetOnly = pathBuilder.buildOrthogonalPath(
    { x: 0, y: 0 },
    { x: 0, y: 120 },
    [{ relativeTo: "target", x: 0, y: 1 }],
    nodeA,
    nodeC,
    "bottom",
    "top",
    0,
    0,
    nodeMap,
    null,
    []
  );
  assert.ok(Array.isArray(targetOnly) || targetOnly.points.length >= 4);

  const bendPath = pathBuilder.buildOrthogonalPath(
    { x: 0, y: 0 },
    { x: 120, y: 0 },
    [
      { relativeTo: "source", x: 1, y: 0 },
      { relativeTo: "target", x: -1, y: 0 },
    ],
    nodeA,
    nodeB,
    "right",
    "left",
    0,
    0,
    nodeMap,
    null,
    []
  );

  if (!Array.isArray(bendPath)) {
    assert.ok(bendPath.points.length >= 4);
  }
});

test("bendpoint routing covers side combinations", () => {
  const pointsA = [0, 0];
  bendpointRouting.buildBendpointPath(
    pointsA,
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    20,
    0,
    40,
    0,
    "right",
    "right"
  );
  assert.ok(pointsA.length > 2);

  const pointsB = [0, 0];
  bendpointRouting.buildBendpointPath(
    pointsB,
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    20,
    40,
    40,
    60,
    "right",
    "top"
  );
  assert.ok(pointsB.length > 2);

  const pointsC = [0, 0];
  bendpointRouting.buildBendpointPath(
    pointsC,
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    20,
    40,
    40,
    60,
    "bottom",
    "bottom"
  );
  assert.ok(pointsC.length > 2);

  const pointsD = [0, 0];
  bendpointRouting.buildBendpointPath(
    pointsD,
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    20,
    40,
    40,
    60,
    "bottom",
    "left"
  );
  assert.ok(pointsD.length > 2);

  const pointsE = [0, 0];
  bendpointRouting.buildBendpointPath(
    pointsE,
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    20,
    40,
    40,
    60,
    "bottom",
    "center"
  );
  assert.ok(pointsE.length > 2);

  const pointsF = [0, 0];
  bendpointRouting.buildBendpointPath(
    pointsF,
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    0,
    40,
    0,
    60,
    "top",
    "bottom"
  );
  assert.ok(pointsF.length > 2);

  const pointsG = [0, 0];
  bendpointRouting.buildBendpointPath(
    pointsG,
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    0,
    40,
    0,
    60,
    "top",
    "right"
  );
  assert.ok(pointsG.length > 2);

  const pointsH = [0, 0];
  bendpointRouting.buildBendpointPath(
    pointsH,
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    0,
    40,
    0,
    60,
    "right",
    "center"
  );
  assert.ok(pointsH.length > 2);
});

test("path builder fallback routing covers direction branches", () => {
  const blockedSegments = [{ x1: -10000, y1: -10000, x2: 10000, y2: 10000 }];

  const cases = [
    { out: "bottom", in: "top", start: { x: 0, y: 0 }, end: { x: 100, y: 200 } },
    { out: "right", in: "top", start: { x: 0, y: 0 }, end: { x: 100, y: 200 } },
    { out: "left", in: "top", start: { x: 0, y: 0 }, end: { x: -100, y: 200 } },
    { out: "left", in: "left", start: { x: 0, y: 0 }, end: { x: -100, y: 200 } },
    { out: "bottom", in: "right", start: { x: 0, y: 0 }, end: { x: 100, y: 200 } },
    { out: "bottom", in: "left", start: { x: 0, y: 0 }, end: { x: -100, y: 200 } },
    { out: "right", in: "bottom", start: { x: 0, y: 0 }, end: { x: 100, y: 200 } },
    { out: "left", in: "bottom", start: { x: 0, y: 0 }, end: { x: -100, y: 200 } },
    { out: "right", in: "left", start: { x: 0, y: 0 }, end: { x: -100, y: 200 } },
    { out: "left", in: "right", start: { x: 0, y: 0 }, end: { x: 100, y: 200 } },
    { out: "top", in: "bottom", start: { x: 0, y: 200 }, end: { x: 100, y: 0 } },
  ];

  for (const combo of cases) {
    const result = pathBuilder.buildOrthogonalPath(
      combo.start,
      combo.end,
      null,
      nodeA,
      nodeB,
      combo.out,
      combo.in,
      0,
      0,
      nodeMap,
      null,
      blockedSegments
    );

    const pointsOut = Array.isArray(result) ? result : result.points;
    assert.ok(pointsOut.length >= 4);
  }
});

test("single waypoint routing handles collisions", () => {
  const blocker = makePlacedNode("Block", 40, -20, "pipelet");
  const map = { A: nodeA, B: nodeB, Block: blocker };
  const points = [0, 0];
  const blockedSegments = [{ x1: -10000, y1: -10000, x2: 10000, y2: 10000 }];

  const ok = bendpointRouting.buildSingleWaypointPath(
    points,
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    100,
    0,
    "right",
    "left",
    map,
    "A",
    "B",
    blockedSegments,
    nodeA,
    nodeB
  );
  assert.equal(ok, false);

  const clearPoints = [0, 0];
  const okTop = bendpointRouting.buildSingleWaypointPath(
    clearPoints,
    { x: 0, y: 100 },
    { x: 200, y: 0 },
    120,
    0,
    "right",
    "top",
    {},
    "A",
    "B",
    [],
    nodeA,
    nodeB
  );
  assert.ok(okTop);

  const okBottom = bendpointRouting.buildSingleWaypointPath(
    [0, 0],
    { x: 0, y: 0 },
    { x: 200, y: 100 },
    120,
    0,
    "right",
    "bottom",
    {},
    "A",
    "B",
    [],
    nodeA,
    nodeB
  );
  assert.ok(okBottom);

  const okLeft = bendpointRouting.buildSingleWaypointPath(
    [0, 0],
    { x: 0, y: 0 },
    { x: 0, y: 200 },
    0,
    120,
    "bottom",
    "left",
    {},
    "A",
    "B",
    [],
    nodeA,
    nodeB
  );
  assert.ok(okLeft);

  const okOther = bendpointRouting.buildSingleWaypointPath(
    [0, 0],
    { x: 0, y: 0 },
    { x: 0, y: 200 },
    10,
    120,
    "bottom",
    "other",
    {},
    "A",
    "B",
    [],
    nodeA,
    nodeB
  );
  assert.ok(okOther);

  const pointsBottom = [0, 0];
  const okBottomRight = bendpointRouting.buildSingleWaypointPath(
    pointsBottom,
    { x: 0, y: 0 },
    { x: 0, y: 200 },
    0,
    120,
    "bottom",
    "right",
    map,
    "A",
    "B",
    [],
    nodeA,
    nodeB
  );
  assert.ok(okBottomRight);
});

test("waypoint filtering and min segment logic", () => {
  const points = [0, 0, 0, 10];
  pathUtils.ensureMinFinalSegment(points);
  assert.ok(points.length === 4);
  assert.ok(points[1] < 0);

  const horizontal = [0, 0, 10, 0];
  pathUtils.ensureMinFinalSegment(horizontal);
  assert.ok(horizontal[0] < 0);

  const reverseVertical = [0, 0, 0, -10];
  pathUtils.ensureMinFinalSegment(reverseVertical);
  assert.ok(reverseVertical[1] > 0);

  const reverseHorizontal = [0, 0, -10, 0];
  pathUtils.ensureMinFinalSegment(reverseHorizontal);
  assert.ok(reverseHorizontal[0] > 0);

  const pathPoints = [0, 0, 0, 50, 50, 50];
  const wp = { x: 0, y: 50 };
  assert.ok(waypoints.isWaypointMeaningful(wp, pathPoints, nodeMap));

  const filtered = waypoints.filterOnPathWaypoints([wp], pathPoints, nodeMap);
  assert.equal(filtered.length, 1);
});
