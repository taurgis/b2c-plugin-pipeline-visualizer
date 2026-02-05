"use strict";
/**
 * Collision detection for edge routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROUTING_SEGMENT_THICKNESS = exports.ROUTING_MARGIN = exports.ROUTING_GRID_STEP = void 0;
exports.lineIntersectsNode = lineIntersectsNode;
exports.buildNodeObstacles = buildNodeObstacles;
exports.segmentsToObstacles = segmentsToObstacles;
exports.computeRoutingBounds = computeRoutingBounds;
exports.isInsideObstacle = isInsideObstacle;
exports.pointsToSegments = pointsToSegments;
const constants_1 = require("../constants");
const { nodeWidth, nodeHeight } = constants_1.LAYOUT_CONFIG;
exports.ROUTING_GRID_STEP = 18;
exports.ROUTING_MARGIN = 200;
exports.ROUTING_SEGMENT_THICKNESS = 10;
function lineIntersectsNode(x1, y1, x2, y2, nodeMap, fromNodeId, toNodeId) {
    if (!nodeMap) {
        return null;
    }
    const padding = 10;
    for (const nodeId in nodeMap) {
        if (nodeId === fromNodeId || nodeId === toNodeId) {
            continue;
        }
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
        }
        else if (Math.abs(x1 - x2) < 5) {
            if (x1 > nodeLeft && x1 < nodeRight) {
                if (maxY > nodeTop && minY < nodeBottom) {
                    return node;
                }
            }
        }
    }
    return null;
}
function buildNodeObstacles(nodeMap, fromNodeId, toNodeId) {
    const padding = constants_1.EDGE_PAD;
    const obstacles = [];
    for (const [id, node] of Object.entries(nodeMap)) {
        if (id === fromNodeId || id === toNodeId) {
            continue;
        }
        obstacles.push({
            left: node.x - padding,
            right: node.x + nodeWidth + padding,
            top: node.y - padding,
            bottom: node.y + nodeHeight + padding,
        });
    }
    return obstacles;
}
function segmentsToObstacles(segments) {
    const obstacles = [];
    for (const seg of segments) {
        const minX = Math.min(seg.x1, seg.x2) - exports.ROUTING_SEGMENT_THICKNESS;
        const maxX = Math.max(seg.x1, seg.x2) + exports.ROUTING_SEGMENT_THICKNESS;
        const minY = Math.min(seg.y1, seg.y2) - exports.ROUTING_SEGMENT_THICKNESS;
        const maxY = Math.max(seg.y1, seg.y2) + exports.ROUTING_SEGMENT_THICKNESS;
        obstacles.push({ left: minX, right: maxX, top: minY, bottom: maxY });
    }
    return obstacles;
}
function computeRoutingBounds(nodeMap, start, end) {
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
        minX: minX - exports.ROUTING_MARGIN,
        maxX: maxX + exports.ROUTING_MARGIN,
        minY: minY - exports.ROUTING_MARGIN,
        maxY: maxY + exports.ROUTING_MARGIN,
    };
}
function isInsideObstacle(x, y, obstacles) {
    for (const obs of obstacles) {
        if (x >= obs.left && x <= obs.right && y >= obs.top && y <= obs.bottom) {
            return true;
        }
    }
    return false;
}
function pointsToSegments(points) {
    const segments = [];
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
