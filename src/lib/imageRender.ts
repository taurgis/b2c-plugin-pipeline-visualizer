import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { parsePipeline } from "./pipelineParser";
import type { PipelineEdge as ParsedEdge, PipelineNode as ParsedNode } from "./types";
import { calculateLayout, buildNodeMap } from "../webview-ui/layout";
import {
  LAYOUT_CONFIG,
  NODE_COLORS,
  THEME,
  EDGE_SPACING,
  getEdgeColor,
  isLoopBackEdge,
  BENDPOINT_INDICATOR_COLOR,
} from "../webview-ui/constants";
import type { PipelineEdge, PipelineNode, PlacedNode, Point } from "../webview-ui/types";
import {
  getAnchor,
  getAnchorPoint,
  getArrowAngleForSide,
  determineSidesFromNodeMap,
  buildBackEdgePath,
  buildOrthogonalPath,
  pointsToSegments,
  ChannelRegistry,
  type Segment,
} from "../webview-ui/edges";

interface ImageOptions {
  inputPath: string;
  outputPath: string;
  branch?: string;
  scale?: number;
  padding?: number;
  background?: string;
  showBendpoints?: boolean;
  grid?: boolean;
}

interface NormalizedImageOptions {
  inputPath: string;
  branch?: string;
  scale: number;
  padding: number;
  background: string;
  showBendpoints: boolean;
  grid: boolean;
}

interface EdgeRenderData {
  edge: PipelineEdge;
  points: number[];
  color: string;
  arrowAngle: number;
  arrowPoints: Array<{ x: number; y: number }>;
  labelPoint?: { x: number; y: number };
  labelText?: string;
  waypoints: Point[];
}

export function renderPipelineSvg(options: ImageOptions): string {
  const normalized = normalizeOptions(options);
  const xmlPath = path.resolve(process.cwd(), normalized.inputPath);

  if (!fs.existsSync(xmlPath)) {
    throw new Error(`Input file not found: ${xmlPath}`);
  }

  const xml = fs.readFileSync(xmlPath, "utf8");
  const parsed = parsePipeline(xml, path.basename(xmlPath));

  let filteredNodes = parsed.nodes;
  let filteredEdges = parsed.edges;

  if (normalized.branch) {
    const result = filterByBranch(parsed.nodes, parsed.edges, normalized.branch);
    filteredNodes = result.nodes;
    filteredEdges = result.edges;

    if (filteredNodes.length === 0) {
      const availableBranches = getAvailableBranches(parsed.nodes);
      throw new Error(
        `No nodes found for branch "${normalized.branch}". Available branches: ${availableBranches.join(", ")}`
      );
    }
  }

  const nodes = toWebviewNodes(filteredNodes);
  const edges = toWebviewEdges(filteredEdges);

  const placedNodes = calculateLayout(nodes);
  const nodeMap = buildNodeMap(placedNodes);

  const renderEdges = buildEdgeRenderData(edges, nodeMap, normalized.showBendpoints);

  const bounds = calculateImageBounds(placedNodes, renderEdges);
  const padding = normalized.padding;

  const offsetX = padding - bounds.minX;
  const offsetY = padding - bounds.minY;

  const width = Math.ceil(bounds.maxX - bounds.minX + padding * 2);
  const height = Math.ceil(bounds.maxY - bounds.minY + padding * 2);

  return buildSvg({
    width,
    height,
    scale: normalized.scale,
    background: normalized.background,
    grid: normalized.grid,
    offsetX,
    offsetY,
    nodes: placedNodes,
    edges: renderEdges,
  });
}

export async function writePipelineImageAsync(options: ImageOptions): Promise<string> {
  const svg = renderPipelineSvg(options);
  const outputPath = path.resolve(process.cwd(), options.outputPath);
  const ext = path.extname(outputPath).toLowerCase();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (ext === ".svg") {
    fs.writeFileSync(outputPath, svg, "utf8");
    return outputPath;
  }

  if (ext === ".png") {
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }

  throw new Error("Output path must end with .svg or .png");
}

function normalizeOptions(options: ImageOptions): NormalizedImageOptions {
  const scale = typeof options.scale === "number" && options.scale > 0 ? options.scale : 1;
  const padding =
    typeof options.padding === "number" && options.padding >= 0 ? options.padding : 80;
  const background = options.background || THEME.darkBg;

  return {
    inputPath: options.inputPath,
    branch: options.branch,
    scale,
    padding,
    background,
    showBendpoints: options.showBendpoints === true,
    grid: options.grid === true,
  };
}

function toWebviewNodes(nodes: ParsedNode[]): PipelineNode[] {
  return nodes.map((node) => ({
    id: node.id,
    label: node.label,
    type: node.type,
    branch: node.branch,
    attributes: Object.fromEntries(
      Object.entries(node.attributes || {}).filter(([, value]) => value !== undefined)
    ) as Record<string, string>,
    configProperties: node.configProperties ?? [],
    bindings: node.bindings ?? [],
    template: node.template
      ? {
          name: node.template.name,
          buffered: node.template.buffered,
          dynamic: node.template.dynamic,
        }
      : null,
    description: node.description ?? null,
    position: node.position
      ? {
          x: node.position.x,
          y: node.position.y,
          orientation: node.position.orientation,
        }
      : undefined,
    sourceLocation: node.sourceLocation,
  }));
}

function toWebviewEdges(edges: ParsedEdge[]): PipelineEdge[] {
  return edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    label: edge.label,
    sourceConnector: edge.sourceConnector,
    targetConnector: edge.targetConnector,
    display: edge.display
      ? {
          bendPoints: edge.display.bendPoints.map((bend) => ({
            relativeTo: bend.relativeTo,
            x: bend.x,
            y: bend.y,
          })),
        }
      : undefined,
    sourceLocation: edge.sourceLocation,
  }));
}

function filterByBranch(
  nodes: ParsedNode[],
  edges: ParsedEdge[],
  branchFilter: string
): { nodes: ParsedNode[]; edges: ParsedEdge[] } {
  const startNode = nodes.find(
    (n) => n.type === "start" && (n.label === `Start ${branchFilter}` || n.label === branchFilter)
  );

  const branchPath = startNode ? startNode.branch : branchFilter;
  const filteredNodeIds = new Set<string>();

  for (const node of nodes) {
    if (
      node.branch === branchPath ||
      node.branch.startsWith(`${branchPath}:`) ||
      node.branch.startsWith(`${branchPath}/`)
    ) {
      filteredNodeIds.add(node.id);
    }
  }

  const edgesFromFiltered = edges.filter((e) => filteredNodeIds.has(e.from));
  for (const edge of edgesFromFiltered) {
    addDownstreamNodes(edge.to, nodes, edges, filteredNodeIds);
  }

  const filteredNodes = nodes.filter((n) => filteredNodeIds.has(n.id));
  const filteredEdges = edges.filter(
    (e) => filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to)
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}

function addDownstreamNodes(
  nodeId: string,
  nodes: ParsedNode[],
  edges: ParsedEdge[],
  nodeSet: Set<string>
): void {
  if (nodeSet.has(nodeId)) {
    return;
  }

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) {
    return;
  }

  nodeSet.add(nodeId);

  const outgoingEdges = edges.filter((e) => e.from === nodeId);
  for (const edge of outgoingEdges) {
    addDownstreamNodes(edge.to, nodes, edges, nodeSet);
  }
}

function getAvailableBranches(nodes: ParsedNode[]): string[] {
  const branches = new Set<string>();

  for (const node of nodes) {
    const branch = node.branch;
    const topLevel = branch.split(/[:/]/)[0];
    branches.add(topLevel);

    if (node.type === "start" && node.label.startsWith("Start ")) {
      branches.add(node.label.replace("Start ", ""));
    }
  }

  return Array.from(branches).sort();
}

function buildEdgeRenderData(
  edges: PipelineEdge[],
  nodeMap: Record<string, PlacedNode>,
  showBendpoints: boolean
): EdgeRenderData[] {
  const planned: Array<{
    edge: PipelineEdge;
    fromNode: PlacedNode;
    toNode: PlacedNode;
    outSide: string;
    inSide: string;
    blockingNode: PlacedNode | null;
  }> = [];

  const outCounts: Record<string, number> = {};
  const inCounts: Record<string, number> = {};
  const occupiedSegments: Segment[] = [];
  const channelRegistry = new ChannelRegistry();

  function incCount(map: Record<string, number>, key: string): void {
    map[key] = (map[key] || 0) + 1;
  }

  for (const edge of edges) {
    const fromNode = nodeMap[edge.from];
    const toNode = nodeMap[edge.to];
    if (!fromNode || !toNode) {continue;}

    const sides = determineSidesFromNodeMap(edge, fromNode, toNode, nodeMap);

    const outKey = `${edge.from}|${sides.outSide}`;
    const inKey = `${edge.to}|${sides.inSide}`;
    incCount(outCounts, outKey);
    incCount(inCounts, inKey);

    planned.push({
      edge,
      fromNode,
      toNode,
      outSide: sides.outSide,
      inSide: sides.inSide,
      blockingNode: sides.blockingNode,
    });
  }

  const outIndex: Record<string, number> = {};
  const inIndex: Record<string, number> = {};

  function nextOffset(
    indexMap: Record<string, number>,
    countMap: Record<string, number>,
    key: string
  ): number {
    const idx = indexMap[key] || 0;
    indexMap[key] = idx + 1;
    const total = countMap[key] || 1;
    return (idx - (total - 1) / 2) * EDGE_SPACING;
  }

  const renderData: EdgeRenderData[] = [];
  const { nodeWidth, nodeHeight } = LAYOUT_CONFIG;

  for (const plan of planned) {
    const { edge, fromNode, toNode, outSide, inSide, blockingNode } = plan;
    const edgeColor = getEdgeColor(edge.label);
    const isBackEdge = isLoopBackEdge(edge.label);

    const outKey = `${edge.from}|${outSide}`;
    const inKey = `${edge.to}|${inSide}`;
    const outOffset = nextOffset(outIndex, outCounts, outKey);
    const inOffset = nextOffset(inIndex, inCounts, inKey);

    let start = getAnchor(
      fromNode,
      outSide,
      outSide === "top" || outSide === "bottom" ? outOffset : outOffset
    );
    let end = getAnchor(
      toNode,
      inSide,
      inSide === "top" || inSide === "bottom" ? inOffset : inOffset
    );

    const fromCenterX = fromNode.x + nodeWidth / 2;
    const toCenterX = toNode.x + nodeWidth / 2;
    const nodesAligned = Math.abs(fromCenterX - toCenterX) < 5;

    if (outSide === "bottom" && inSide === "top" && nodesAligned) {
      const alignedX = fromCenterX;
      const startY =
        fromNode.type === "join"
          ? fromNode.y + nodeHeight / 2 + 10
          : fromNode.y + nodeHeight;
      const endY =
        toNode.type === "join" ? toNode.y + nodeHeight / 2 - 10 : toNode.y;
      start = { x: alignedX, y: startY };
      end = { x: alignedX, y: endY };
    }

    const isGoingUp = end.y < start.y - 5;

    let points: number[] = [];
    let arrowAngle: number;
    let waypoints: Point[] = [];

    const bendPoints = edge.display?.bendPoints;
    const hasBendPoints = bendPoints && bendPoints.length > 0;

    if ((isBackEdge || isGoingUp) && !hasBendPoints) {
      const result = buildBackEdgePath(fromNode, toNode);
      points = result.points;
      end = result.end;
      arrowAngle = -Math.PI / 2;
    } else {
      const pathResult = buildOrthogonalPath(
        start,
        end,
        bendPoints,
        fromNode,
        toNode,
        outSide,
        inSide,
        outOffset,
        inOffset,
        nodeMap,
        blockingNode,
        occupiedSegments,
        channelRegistry
      );

      if (Array.isArray(pathResult)) {
        points = pathResult;
      } else {
        points = pathResult.points;
        waypoints = pathResult.waypoints;
      }

      arrowAngle = getArrowAngleForSide(inSide);
    }

    const arrowPoints = buildArrowPoints(points, arrowAngle);

    const labelText = edge.label || undefined;
    const labelPoint = labelText ? computeLabelPoint(start, end, outSide) : undefined;

    renderData.push({
      edge,
      points,
      color: edgeColor,
      arrowAngle,
      arrowPoints,
      labelPoint,
      labelText,
      waypoints: showBendpoints ? waypoints : [],
    });

    const segments = pointsToSegments(points);
    occupiedSegments.push(...segments);
    channelRegistry.registerEdge(segments, toNode.id, inSide);
  }

  return renderData;
}

function buildArrowPoints(points: number[], arrowAngle: number): Array<{ x: number; y: number }> {
  const arrowRadius = 8;
  const baseHalf = arrowRadius * 0.7;

  const tipX = points[points.length - 2];
  const tipY = points[points.length - 1];
  const dirX = Math.cos(arrowAngle);
  const dirY = Math.sin(arrowAngle);
  const baseCenterX = tipX - dirX * arrowRadius;
  const baseCenterY = tipY - dirY * arrowRadius;
  const perpX = -dirY;
  const perpY = dirX;

  const baseLeftX = baseCenterX + perpX * baseHalf;
  const baseLeftY = baseCenterY + perpY * baseHalf;
  const baseRightX = baseCenterX - perpX * baseHalf;
  const baseRightY = baseCenterY - perpY * baseHalf;

  return [
    { x: tipX, y: tipY },
    { x: baseLeftX, y: baseLeftY },
    { x: baseRightX, y: baseRightY },
  ];
}

function computeLabelPoint(
  start: Point,
  end: Point,
  outSide: string
): { x: number; y: number } {
  let labelX = (start.x + end.x) / 2;
  let labelY = (start.y + end.y) / 2;
  if (outSide === "right" || outSide === "left") {
    labelY -= 14;
  } else {
    labelX += 14;
    labelY -= 16;
  }
  return { x: labelX, y: labelY };
}

function calculateImageBounds(
  nodes: PlacedNode[],
  edges: EdgeRenderData[]
): { minX: number; minY: number; maxX: number; maxY: number } {
  const { nodeWidth, nodeHeight } = LAYOUT_CONFIG;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + nodeWidth);
    maxY = Math.max(maxY, node.y + nodeHeight);
  }

  for (const edge of edges) {
    for (let i = 0; i < edge.points.length; i += 2) {
      const x = edge.points[i];
      const y = edge.points[i + 1];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    for (const pt of edge.arrowPoints) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }

    if (edge.labelPoint) {
      minX = Math.min(minX, edge.labelPoint.x - 20);
      minY = Math.min(minY, edge.labelPoint.y - 20);
      maxX = Math.max(maxX, edge.labelPoint.x + 120);
      maxY = Math.max(maxY, edge.labelPoint.y + 20);
    }

    for (const waypoint of edge.waypoints) {
      minX = Math.min(minX, waypoint.x - 6);
      minY = Math.min(minY, waypoint.y - 6);
      maxX = Math.max(maxX, waypoint.x + 6);
      maxY = Math.max(maxY, waypoint.y + 6);
    }
  }

  return { minX, minY, maxX, maxY };
}

function buildSvg(input: {
  width: number;
  height: number;
  scale: number;
  background: string;
  grid: boolean;
  offsetX: number;
  offsetY: number;
  nodes: PlacedNode[];
  edges: EdgeRenderData[];
}): string {
  const width = Math.max(1, Math.round(input.width * input.scale));
  const height = Math.max(1, Math.round(input.height * input.scale));

  const viewBox = `0 0 ${input.width} ${input.height}`;
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">`
  );

  if (input.background && input.background !== "transparent") {
    lines.push(
      `<rect x="0" y="0" width="${input.width}" height="${input.height}" fill="${escapeXml(input.background)}"/>`
    );
  }

  if (input.grid) {
    lines.push(drawGrid(input.width, input.height, input.offsetX, input.offsetY));
  }

  lines.push(`<g transform="translate(${input.offsetX}, ${input.offsetY})">`);

  for (const edge of input.edges) {
    lines.push(drawEdge(edge));
  }

  for (const node of input.nodes) {
    lines.push(drawNode(node));
  }

  lines.push("</g>");
  lines.push("</svg>");

  return lines.join("\n");
}

function drawGrid(width: number, height: number, offsetX: number, offsetY: number): string {
  const gridSize = 50;
  const minX = -offsetX;
  const minY = -offsetY;
  const maxX = minX + width;
  const maxY = minY + height;

  const startX = Math.floor(minX / gridSize) * gridSize - gridSize;
  const endX = Math.ceil(maxX / gridSize) * gridSize + gridSize;
  const startY = Math.floor(minY / gridSize) * gridSize - gridSize;
  const endY = Math.ceil(maxY / gridSize) * gridSize + gridSize;

  const path: string[] = [];
  for (let x = startX; x <= endX; x += gridSize) {
    path.push(`M ${x + offsetX} ${startY + offsetY} L ${x + offsetX} ${endY + offsetY}`);
  }
  for (let y = startY; y <= endY; y += gridSize) {
    path.push(`M ${startX + offsetX} ${y + offsetY} L ${endX + offsetX} ${y + offsetY}`);
  }

  return `<path d="${path.join(" ")}" stroke="${THEME.gridColor}" stroke-width="1" fill="none"/>`;
}

function drawNode(node: PlacedNode): string {
  const { nodeWidth, nodeHeight } = LAYOUT_CONFIG;
  const color = NODE_COLORS[node.type] || NODE_COLORS.unknown;
  const fontFamily = THEME.fontFamily;

  if (node.type === "join") {
    const cx = node.x + nodeWidth / 2;
    const cy = node.y + nodeHeight / 2;
    return [
      `<g>`,
      `<circle cx="${cx}" cy="${cy}" r="10" fill="${THEME.nodeFill}" stroke="${color}" stroke-width="2"/>`,
      `<circle cx="${cx}" cy="${cy}" r="4" fill="${color}"/>`,
      `</g>`,
    ].join("");
  }

  const pillText = node.type;
  const pillWidth = Math.max(24, pillText.length * 6 + 12);
  const titleText = truncate(node.label, Math.floor((nodeWidth - 20) / 7));
  const branchText = truncate(node.branch, Math.floor((nodeWidth - 20) / 6));

  const parts: string[] = [];
  parts.push(`<g>`);
  parts.push(
    `<rect x="${node.x}" y="${node.y}" width="${nodeWidth}" height="${nodeHeight}" rx="10" ry="10" fill="${THEME.nodeFill}" stroke="${color}" stroke-width="2"/>`
  );
  parts.push(
    `<rect x="${node.x + 1}" y="${node.y + 1}" width="${nodeWidth - 2}" height="${nodeHeight / 2}" rx="9" ry="9" fill="${THEME.nodeOverlay}"/>`
  );
  parts.push(
    `<rect x="${node.x + 10}" y="${node.y + 10}" width="${pillWidth}" height="18" rx="9" ry="9" fill="${color}"/>`
  );
  parts.push(
    `<text x="${node.x + 16}" y="${node.y + 14}" font-family="${fontFamily}" font-size="10" fill="#0b1021" dominant-baseline="hanging">${escapeXml(pillText)}</text>`
  );
  parts.push(
    `<text x="${node.x + 10}" y="${node.y + 34}" font-family="${fontFamily}" font-size="13" font-weight="bold" fill="${THEME.textColor}" dominant-baseline="hanging">${escapeXml(titleText)}</text>`
  );
  parts.push(
    `<text x="${node.x + 10}" y="${node.y + 52}" font-family="${fontFamily}" font-size="10" fill="${THEME.mutedColor}" dominant-baseline="hanging">${escapeXml(branchText)}</text>`
  );

  if (node.type === "jump" || node.type === "call") {
    parts.push(drawNavigationIndicator(node.x + nodeWidth - 28, node.y + nodeHeight - 28));
  }

  parts.push(`</g>`);
  return parts.join("");
}

function drawNavigationIndicator(x: number, y: number): string {
  return [
    `<g>`,
    `<rect x="${x}" y="${y}" width="20" height="20" rx="4" ry="4" fill="rgba(242,192,120,0.2)"/>`,
    `<line x1="${x + 5}" y1="${y + 15}" x2="${x + 15}" y2="${y + 5}" stroke="#f2c078" stroke-width="1.5" stroke-linecap="round"/>`,
    `<line x1="${x + 9}" y1="${y + 5}" x2="${x + 15}" y2="${y + 5}" stroke="#f2c078" stroke-width="1.5" stroke-linecap="round"/>`,
    `<line x1="${x + 15}" y1="${y + 5}" x2="${x + 15}" y2="${y + 11}" stroke="#f2c078" stroke-width="1.5" stroke-linecap="round"/>`,
    `<line x1="${x + 5}" y1="${y + 9}" x2="${x + 5}" y2="${y + 15}" stroke="#f2c078" stroke-width="1.5" stroke-linecap="round"/>`,
    `<line x1="${x + 5}" y1="${y + 15}" x2="${x + 11}" y2="${y + 15}" stroke="#f2c078" stroke-width="1.5" stroke-linecap="round"/>`,
    `</g>`,
  ].join("");
}

function drawEdge(edge: EdgeRenderData): string {
  const parts: string[] = [];
  const path = pointsToPath(edge.points);

  parts.push(
    `<path d="${path}" stroke="${edge.color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  );

  const arrowPoints = edge.arrowPoints
    .map((pt) => `${pt.x},${pt.y}`)
    .join(" ");
  parts.push(
    `<polygon points="${arrowPoints}" fill="${edge.color}" stroke="${edge.color}" stroke-width="1"/>`
  );

  if (edge.labelPoint && edge.labelText) {
    parts.push(
      `<text x="${edge.labelPoint.x}" y="${edge.labelPoint.y}" font-family="${THEME.fontFamily}" font-size="11" fill="${edge.color}" text-anchor="middle" dominant-baseline="middle">${escapeXml(edge.labelText)}</text>`
    );
  }

  for (const waypoint of edge.waypoints) {
    parts.push(
      `<circle cx="${waypoint.x}" cy="${waypoint.y}" r="4" fill="${BENDPOINT_INDICATOR_COLOR}" stroke="#ffffff" stroke-width="1"/>`
    );
  }

  return parts.join("");
}

function pointsToPath(points: number[]): string {
  if (points.length < 2) {return "";}
  const commands: string[] = [`M ${points[0]} ${points[1]}`];
  for (let i = 2; i < points.length; i += 2) {
    commands.push(`L ${points[i]} ${points[i + 1]}`);
  }
  return commands.join(" ");
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) {return value;}
  if (maxChars <= 3) {return value.slice(0, maxChars);}
  return `${value.slice(0, maxChars - 3)}...`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}