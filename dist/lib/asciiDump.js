"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAsciiDump = generateAsciiDump;
exports.writeDumpToFile = writeDumpToFile;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const pipelineParser_1 = require("./pipelineParser");
const layout_1 = require("../webview-ui/layout");
const constants_1 = require("../webview-ui/constants");
const edges_1 = require("../webview-ui/edges");
const DEFAULT_CELL_WIDTH = 18;
const FULL_LAYOUT_SCALE = 8;
function generateAsciiDump(options) {
    const normalized = normalizeOptions(options);
    const xmlPath = node_path_1.default.resolve(process.cwd(), normalized.inputPath);
    if (!node_fs_1.default.existsSync(xmlPath)) {
        throw new Error(`Input file not found: ${xmlPath}`);
    }
    const xml = node_fs_1.default.readFileSync(xmlPath, "utf8");
    const parsed = (0, pipelineParser_1.parsePipeline)(xml, node_path_1.default.basename(xmlPath));
    let filteredNodes = parsed.nodes;
    let filteredEdges = parsed.edges;
    if (normalized.branch) {
        const result = filterByBranch(parsed.nodes, parsed.edges, normalized.branch);
        filteredNodes = result.nodes;
        filteredEdges = result.edges;
        if (filteredNodes.length === 0) {
            const availableBranches = getAvailableBranches(parsed.nodes);
            throw new Error(`No nodes found for branch "${normalized.branch}". Available branches: ${availableBranches.join(", ")}`);
        }
    }
    const nodes = toWebviewNodes(filteredNodes);
    const edges = toWebviewEdges(filteredEdges);
    const placedNodes = (0, layout_1.calculateLayout)(nodes, { preserveGrid: true });
    const displayName = normalized.branch
        ? `${parsed.name} (branch: ${normalized.branch})`
        : parsed.name;
    const dump = renderDump(placedNodes, edges, displayName, {
        cellWidth: normalized.cellWidth,
        showBendpoints: normalized.showBendpoints,
        includeGrid: normalized.includeGrid,
        includeNodes: normalized.includeNodes,
        includeEdges: normalized.includeEdges,
        includeFullLayout: normalized.includeFullLayout,
    });
    return {
        ...dump,
        resolvedInputPath: xmlPath,
        branch: normalized.branch,
    };
}
function writeDumpToFile(dump, outputPath) {
    const resolvedPath = node_path_1.default.resolve(process.cwd(), outputPath || defaultOutputPath(dump.resolvedInputPath, dump.branch));
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(resolvedPath), { recursive: true });
    node_fs_1.default.writeFileSync(resolvedPath, dump.ascii, "utf8");
    return resolvedPath;
}
function normalizeOptions(options) {
    const cellWidth = typeof options.cellWidth === "number" && options.cellWidth > 4
        ? options.cellWidth
        : DEFAULT_CELL_WIDTH;
    return {
        inputPath: options.inputPath,
        cellWidth,
        showBendpoints: options.showBendpoints === true,
        includeGrid: options.includeGrid === true,
        includeNodes: options.includeNodes === true,
        includeEdges: options.includeEdges === true || options.showBendpoints === true,
        includeFullLayout: options.includeFullLayout !== false,
        branch: options.branch,
    };
}
function defaultOutputPath(xmlPath, branch) {
    const baseName = node_path_1.default.basename(xmlPath, node_path_1.default.extname(xmlPath));
    const outputName = branch ? `${baseName}_${branch}` : baseName;
    return node_path_1.default.join("debug", "layouts", `${outputName}.txt`);
}
function toWebviewNodes(nodes) {
    return nodes.map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        branch: node.branch,
        attributes: Object.fromEntries(Object.entries(node.attributes || {}).filter(([, value]) => value !== undefined)),
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
function toWebviewEdges(edges) {
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
function filterByBranch(nodes, edges, branchFilter) {
    const startNode = nodes.find((n) => n.type === "start" && (n.label === `Start ${branchFilter}` || n.label === branchFilter));
    const branchPath = startNode ? startNode.branch : branchFilter;
    const filteredNodeIds = new Set();
    for (const node of nodes) {
        if (node.branch === branchPath ||
            node.branch.startsWith(`${branchPath}:`) ||
            node.branch.startsWith(`${branchPath}/`)) {
            filteredNodeIds.add(node.id);
        }
    }
    const edgesFromFiltered = edges.filter((e) => filteredNodeIds.has(e.from));
    for (const edge of edgesFromFiltered) {
        addDownstreamNodes(edge.to, nodes, edges, filteredNodeIds);
    }
    const filteredNodes = nodes.filter((n) => filteredNodeIds.has(n.id));
    const filteredEdges = edges.filter((e) => filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to));
    return { nodes: filteredNodes, edges: filteredEdges };
}
function addDownstreamNodes(nodeId, nodes, edges, nodeSet) {
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
function getAvailableBranches(nodes) {
    const branches = new Set();
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
function renderDump(placedNodes, edges, pipelineName, options) {
    const nodeMap = new Map(placedNodes.map((n) => [n.id, n]));
    const withGrid = ensureGridCoordinates(placedNodes);
    const sections = [
        `Pipeline: ${pipelineName}`,
    ];
    if (options.includeGrid) {
        sections.push("", "Grid (x left->right, y top->bottom):", renderAsciiGrid(withGrid, options.cellWidth));
    }
    if (options.includeNodes) {
        sections.push("", "Nodes (ordered by grid row):", ...renderNodeList(withGrid));
    }
    if (options.includeEdges) {
        sections.push("", "Edges:", ...renderEdges(edges, withGrid, nodeMap, options.showBendpoints));
    }
    if (options.includeFullLayout) {
        sections.push("", `Full layout (coarse ASCII, ~${FULL_LAYOUT_SCALE}px per cell):`, renderFullLayout(withGrid, edges, nodeMap));
    }
    const ascii = sections.filter(Boolean).join("\n");
    return { ascii, nodes: withGrid, edges };
}
function renderAsciiGrid(nodes, cellWidth) {
    if (nodes.length === 0) {
        return "(no nodes)";
    }
    const maxX = Math.max(...nodes.map((n) => n.gridX ?? 0));
    const maxY = Math.max(...nodes.map((n) => n.gridY ?? 0));
    const cellMap = new Map();
    for (const node of nodes) {
        const key = `${node.gridX ?? 0},${node.gridY ?? 0}`;
        const bucket = cellMap.get(key) ?? [];
        bucket.push(node);
        cellMap.set(key, bucket);
    }
    const headerCells = new Array(maxX + 1)
        .fill(null)
        .map((_, x) => centerText(`x=${x}`, cellWidth + 2));
    const lines = [`     ${headerCells.join(" ")}`];
    for (let y = 0; y <= maxY; y += 1) {
        const row = [];
        for (let x = 0; x <= maxX; x += 1) {
            const key = `${x},${y}`;
            const bucket = cellMap.get(key);
            if (bucket && bucket.length > 0) {
                const label = abbreviate(bucket.map((n) => `${n.label} (${n.type})`).join(" | "), cellWidth);
                row.push(`[${pad(label, cellWidth)}]`);
            }
            else {
                row.push(`[${" ".repeat(cellWidth)}]`);
            }
        }
        lines.push(`${y.toString().padStart(3, " ")} ${row.join(" ")}`);
    }
    return lines.join("\n");
}
function renderNodeList(nodes) {
    if (nodes.length === 0) {
        return ["(no nodes)"];
    }
    const sorted = [...nodes].sort((a, b) => {
        const y = (a.gridY ?? 0) - (b.gridY ?? 0);
        if (y !== 0) {
            return y;
        }
        return (a.gridX ?? 0) - (b.gridX ?? 0);
    });
    return sorted.map((node) => {
        const grid = `(${node.gridX ?? "?"}, ${node.gridY ?? "?"})`;
        const px = `(${Math.round(node.x)}, ${Math.round(node.y)})`;
        return `- ${grid} px=${px} branch=${node.branch} label="${node.label}" type=${node.type} id=${node.id}`;
    });
}
function renderEdges(edges, _nodes, nodeMap, showBendpoints) {
    if (!edges.length) {
        return ["(no edges)"];
    }
    return edges.map((edge) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        const fromLabel = fromNode?.label ?? edge.from;
        const toLabel = toNode?.label ?? edge.to;
        const label = edge.label ? ` --${edge.label}--> ` : " ----> ";
        const sides = fromNode && toNode
            ? (0, edges_1.determineSidesFromMap)(edge, fromNode, toNode, nodeMap)
            : { outSide: "?", inSide: "?" };
        const startAnchor = fromNode ? (0, edges_1.getAnchorPoint)(fromNode, sides.outSide) : null;
        const endAnchor = toNode ? (0, edges_1.getAnchorPoint)(toNode, sides.inSide) : null;
        const startPos = startAnchor
            ? `@( ${Math.round(startAnchor.x)}, ${Math.round(startAnchor.y)} )`
            : "@(?, ?)";
        const endPos = endAnchor
            ? `@( ${Math.round(endAnchor.x)}, ${Math.round(endAnchor.y)} )`
            : "@(?, ?)";
        const bendStr = showBendpoints && edge.display?.bendPoints?.length
            ? formatBendpoints(edge.display.bendPoints)
            : "";
        return `- ${fromLabel} [out=${sides.outSide} ${startPos}]${label}[in=${sides.inSide} ${endPos}] ${toLabel}${bendStr}`;
    });
}
function ensureGridCoordinates(nodes) {
    return nodes.map((node) => {
        if (node.gridX !== undefined && node.gridY !== undefined) {
            return node;
        }
        const gridX = Math.round((node.x - constants_1.LAYOUT_CONFIG.baseX) / constants_1.LAYOUT_CONFIG.horizontalGap);
        const gridY = Math.round((node.y - constants_1.LAYOUT_CONFIG.baseY) / constants_1.LAYOUT_CONFIG.verticalGap);
        return { ...node, gridX, gridY };
    });
}
function formatBendpoints(bps) {
    const parts = bps.map((bp) => `${bp.relativeTo}(${bp.x},${bp.y})`);
    return parts.length ? ` (bendpoints: ${parts.join("; ")})` : "";
}
function renderFullLayout(nodes, edges, nodeMap) {
    if (!nodes.length) {
        return "(no nodes)";
    }
    const { nodeWidth, nodeHeight } = constants_1.LAYOUT_CONFIG;
    let maxX = 0;
    let maxY = 0;
    for (const n of nodes) {
        maxX = Math.max(maxX, n.x + nodeWidth);
        maxY = Math.max(maxY, n.y + nodeHeight);
    }
    const widthChars = Math.ceil((maxX + 160) / FULL_LAYOUT_SCALE) + 6;
    const heightChars = Math.ceil((maxY + 160) / FULL_LAYOUT_SCALE) + 6;
    const canvas = Array.from({ length: heightChars }, () => Array.from({ length: widthChars }, () => " "));
    const clamp = (x, max) => Math.max(0, Math.min(max - 1, x));
    const put = (x, y, ch) => {
        const cx = clamp(x, widthChars);
        const cy = clamp(y, heightChars);
        canvas[cy][cx] = ch;
    };
    const nodeRects = [];
    for (const node of nodes) {
        if (node.type === "join") {
            const cx = Math.floor((node.x + nodeWidth / 2) / FULL_LAYOUT_SCALE);
            const cy = Math.floor((node.y + nodeHeight / 2) / FULL_LAYOUT_SCALE);
            const r = Math.max(1, Math.round(10 / FULL_LAYOUT_SCALE));
            nodeRects.push({
                x0: cx - r - 1,
                y0: cy - r - 1,
                x1: cx + r + 1,
                y1: cy + r + 1,
            });
            put(cx, cy, "o");
            put(cx - 1, cy, "(");
            put(cx + 1, cy, ")");
            put(cx, cy - 1, "-");
            put(cx, cy + 1, "-");
            continue;
        }
        const w = Math.max(6, Math.floor(nodeWidth / FULL_LAYOUT_SCALE));
        const h = Math.max(3, Math.floor(nodeHeight / FULL_LAYOUT_SCALE));
        const x0 = Math.floor(node.x / FULL_LAYOUT_SCALE);
        const y0 = Math.floor(node.y / FULL_LAYOUT_SCALE);
        const x1 = clamp(x0 + w, widthChars);
        const y1 = clamp(y0 + h, heightChars);
        nodeRects.push({ x0, y0, x1, y1 });
        for (let x = x0; x <= x1; x += 1) {
            put(x, y0, x === x0 || x === x1 ? "+" : "-");
            put(x, y1, x === x0 || x === x1 ? "+" : "-");
        }
        for (let y = y0; y <= y1; y += 1) {
            put(x0, y, "|");
            put(x1, y, "|");
        }
        const label = abbreviate(node.label, Math.max(1, w - 2));
        const labelX = x0 + 1;
        const labelY = clamp(y0 + 1, heightChars);
        for (let i = 0; i < label.length && labelX + i < widthChars - 1; i += 1) {
            put(labelX + i, labelY, label[i]);
        }
    }
    const nodeRecord = {};
    for (const [id, node] of nodeMap) {
        nodeRecord[id] = node;
    }
    const occupiedSegments = [];
    const allWaypoints = [];
    for (const edge of edges) {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) {
            continue;
        }
        const sides = (0, edges_1.determineSidesFromMap)(edge, fromNode, toNode, nodeMap);
        const start = (0, edges_1.getAnchorPoint)(fromNode, sides.outSide);
        const end = (0, edges_1.getAnchorPoint)(toNode, sides.inSide);
        const pathResult = (0, edges_1.buildOrthogonalPath)(start, end, edge.display?.bendPoints ?? null, fromNode, toNode, sides.outSide, sides.inSide, 0, 0, nodeRecord, sides.blockingNode, occupiedSegments);
        let pathPoints;
        if (Array.isArray(pathResult)) {
            pathPoints = pathResult;
        }
        else {
            pathPoints = pathResult.points;
            allWaypoints.push(...pathResult.waypoints);
        }
        occupiedSegments.push(...(0, edges_1.pointsToSegments)(pathPoints));
        drawPolylineFromFlat(canvas, pathPoints, nodeRects);
    }
    for (const waypoint of allWaypoints) {
        const cx = clamp(Math.round(waypoint.x / FULL_LAYOUT_SCALE), widthChars);
        const cy = clamp(Math.round(waypoint.y / FULL_LAYOUT_SCALE), heightChars);
        put(cx, cy, "*");
    }
    return canvas.map((row) => row.join("")).join("\n");
}
function flatToPoints(flat) {
    const points = [];
    for (let i = 0; i < flat.length - 1; i += 2) {
        points.push({ x: flat[i], y: flat[i + 1] });
    }
    return points;
}
function drawPolylineFromFlat(canvas, flatPoints, nodeRects) {
    const points = flatToPoints(flatPoints);
    const w = canvas[0].length;
    const h = canvas.length;
    const clamp = (x, max) => Math.max(0, Math.min(max - 1, x));
    const toCell = (p) => ({
        x: clamp(Math.round(p.x / FULL_LAYOUT_SCALE), w),
        y: clamp(Math.round(p.y / FULL_LAYOUT_SCALE), h),
    });
    const snapOut = (c, axis) => snapOutOfRect(c, nodeRects, axis);
    const globalDir = {
        dx: points.length >= 2 ? points[points.length - 1].x - points[0].x : 0,
        dy: points.length >= 2 ? points[points.length - 1].y - points[0].y : 0,
    };
    const segments = [];
    for (let i = 0; i < points.length - 1; i += 1) {
        const rawA = points[i];
        const rawB = points[i + 1];
        const axis = Math.abs(rawA.x - rawB.x) >= Math.abs(rawA.y - rawB.y)
            ? "horizontal"
            : "vertical";
        const a = snapOut(toCell(rawA), axis);
        const b = snapOut(toCell(rawB), axis);
        const dirX = rawB.x - rawA.x;
        const dirY = rawB.y - rawA.y;
        if (a.x === b.x && a.y === b.y) {
            continue;
        }
        segments.push({ a, b, dir: { dx: dirX, dy: dirY } });
    }
    segments.forEach((seg, idx) => {
        drawSegment(canvas, seg.a, seg.b, nodeRects, idx === segments.length - 1, seg.dir, globalDir);
    });
}
function drawSegment(canvas, a, b, nodeRects, isTerminal, directionHint, globalDir) {
    const w = canvas[0].length;
    const h = canvas.length;
    const put = (x, y, ch) => {
        if (x >= 0 && x < w && y >= 0 && y < h && !isInsideNodeRect(x, y, nodeRects)) {
            canvas[y][x] = mergeChar(canvas[y][x], ch);
        }
    };
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
        put(a.x, a.y, "+");
        return;
    }
    if (Math.abs(dx) >= Math.abs(dy)) {
        const step = dx >= 0 ? 1 : -1;
        for (let x = a.x; x !== b.x + step; x += step) {
            put(x, a.y, dx === 0 ? "+" : "-");
        }
        if (dy !== 0) {
            const stepY = dy >= 0 ? 1 : -1;
            for (let y = a.y; y !== b.y + stepY; y += stepY) {
                put(b.x, y, "|");
            }
        }
    }
    else {
        const stepY = dy >= 0 ? 1 : -1;
        for (let y = a.y; y !== b.y + stepY; y += stepY) {
            put(a.x, y, dy === 0 ? "+" : "|");
        }
        if (dx !== 0) {
            const stepX = dx >= 0 ? 1 : -1;
            for (let x = a.x; x !== b.x + stepX; x += stepX) {
                put(x, b.y, "-");
            }
        }
    }
    if (!isTerminal) {
        return;
    }
    const effDx = globalDir.dx !== 0 || globalDir.dy !== 0
        ? globalDir.dx
        : directionHint.dx !== 0 || directionHint.dy !== 0
            ? directionHint.dx
            : dx;
    const effDy = globalDir.dy !== 0 || globalDir.dx !== 0
        ? globalDir.dy
        : directionHint.dy !== 0 || directionHint.dx !== 0
            ? directionHint.dy
            : dy;
    const arrowChar = effDx > 0 ? ">" : effDx < 0 ? "<" : effDy > 0 ? "v" : "^";
    const canArrow = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h) {
            return false;
        }
        if (isInsideNodeRect(x, y, nodeRects)) {
            return false;
        }
        const existing = canvas[y][x];
        return (existing === " " ||
            existing === "-" ||
            existing === "|" ||
            existing === "+");
    };
    const placeArrow = (x, y) => {
        if (!canArrow(x, y)) {
            return false;
        }
        canvas[y][x] = arrowChar;
        return true;
    };
    if (!placeArrow(b.x, b.y)) {
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);
        let placed = false;
        let x = b.x - stepX;
        let y = b.y - stepY;
        for (let i = 0; i < 4 && !placed; i += 1) {
            if (placeArrow(x, y)) {
                placed = true;
                break;
            }
            x -= stepX;
            y -= stepY;
        }
        if (!placed) {
            placeArrow(a.x, a.y);
        }
    }
}
function isInsideNodeRect(x, y, rects) {
    for (const rect of rects) {
        if (x > rect.x0 && x < rect.x1 && y > rect.y0 && y < rect.y1) {
            return true;
        }
    }
    return false;
}
function snapOutOfRect(cell, rects, axis) {
    for (const rect of rects) {
        if (cell.x > rect.x0 &&
            cell.x < rect.x1 &&
            cell.y > rect.y0 &&
            cell.y < rect.y1) {
            if (axis === "vertical") {
                const distTop = cell.y - rect.y0;
                const distBottom = rect.y1 - cell.y;
                return distTop <= distBottom
                    ? { x: cell.x, y: rect.y0 }
                    : { x: cell.x, y: rect.y1 };
            }
            const distLeft = cell.x - rect.x0;
            const distRight = rect.x1 - cell.x;
            return distLeft <= distRight
                ? { x: rect.x0, y: cell.y }
                : { x: rect.x1, y: cell.y };
        }
    }
    return cell;
}
function mergeChar(existing, next, preferNext = false) {
    if (existing === " " || existing === undefined) {
        return next;
    }
    if (existing === next) {
        return existing;
    }
    if (preferNext) {
        const replacable = existing === " " ||
            existing === "|" ||
            existing === "-" ||
            existing === "+";
        if (replacable) {
            return next;
        }
        return existing;
    }
    const combos = new Set([existing, next]);
    if (combos.has("|") && combos.has("-")) {
        return "+";
    }
    if (combos.has("+")) {
        return "+";
    }
    return existing;
}
function abbreviate(value, maxLength) {
    if (value.length <= maxLength) {
        return value;
    }
    if (maxLength <= 3) {
        return value.slice(0, maxLength);
    }
    return `${value.slice(0, maxLength - 3)}...`;
}
function pad(value, width) {
    if (value.length >= width) {
        return value;
    }
    return `${value}${" ".repeat(width - value.length)}`;
}
function centerText(value, width) {
    if (value.length >= width) {
        return value;
    }
    const total = width - value.length;
    const left = Math.floor(total / 2);
    const right = total - left;
    return `${" ".repeat(left)}${value}${" ".repeat(right)}`;
}
