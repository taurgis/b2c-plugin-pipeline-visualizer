"use strict";
/**
 * Node collision detection for path building
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInsideNode = isInsideNode;
exports.isInsideAnyNode = isInsideAnyNode;
exports.pathSegmentHitsNode = pathSegmentHitsNode;
exports.bendpointPathHasCollision = bendpointPathHasCollision;
const constants_1 = require("../constants");
const { nodeWidth, nodeHeight } = constants_1.LAYOUT_CONFIG;
function isInsideNode(point, node, padding = 15) {
    return (point.x >= node.x - padding &&
        point.x <= node.x + nodeWidth + padding &&
        point.y >= node.y - padding &&
        point.y <= node.y + nodeHeight + padding);
}
function isInsideAnyNode(point, nodeMap) {
    for (const node of Object.values(nodeMap)) {
        if (isInsideNode(point, node)) {
            return true;
        }
    }
    return false;
}
function pathSegmentHitsNode(x1, y1, x2, y2, nodeMap, excludeIds) {
    const padding = 10;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (const node of Object.values(nodeMap)) {
        if (excludeIds.includes(node.id)) {
            continue;
        }
        const nodeLeft = node.x - padding;
        const nodeRight = node.x + nodeWidth + padding;
        const nodeTop = node.y - padding;
        const nodeBottom = node.y + nodeHeight + padding;
        const segmentOverlapsX = maxX >= nodeLeft && minX <= nodeRight;
        const segmentOverlapsY = maxY >= nodeTop && minY <= nodeBottom;
        if (segmentOverlapsX && segmentOverlapsY) {
            return node;
        }
    }
    return null;
}
function bendpointPathHasCollision(proposedPoints, nodeMap, fromNodeId, toNodeId) {
    const excludeIds = [fromNodeId, toNodeId];
    for (let i = 0; i < proposedPoints.length - 2; i += 2) {
        const x1 = proposedPoints[i];
        const y1 = proposedPoints[i + 1];
        const x2 = proposedPoints[i + 2];
        const y2 = proposedPoints[i + 3];
        if (pathSegmentHitsNode(x1, y1, x2, y2, nodeMap, excludeIds)) {
            return true;
        }
    }
    return false;
}
