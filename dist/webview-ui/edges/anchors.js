"use strict";
/**
 * Anchor point calculation for edge routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOIN_RADIUS = void 0;
exports.getAnchor = getAnchor;
exports.getAnchorPoint = getAnchorPoint;
exports.getArrowAngleForSide = getArrowAngleForSide;
exports.calculateArrowAngleFromPoints = calculateArrowAngleFromPoints;
exports.sideVector = sideVector;
exports.nudgePoint = nudgePoint;
const constants_1 = require("../constants");
const { nodeWidth, nodeHeight } = constants_1.LAYOUT_CONFIG;
exports.JOIN_RADIUS = 10;
function getAnchor(node, side, offset) {
    if (node.type === "join") {
        const centerX = node.x + nodeWidth / 2;
        const centerY = node.y + nodeHeight / 2;
        if (side === "top") {
            return { x: centerX + offset, y: centerY - exports.JOIN_RADIUS };
        }
        if (side === "bottom") {
            return { x: centerX + offset, y: centerY + exports.JOIN_RADIUS };
        }
        if (side === "left") {
            return { x: centerX - exports.JOIN_RADIUS, y: centerY + offset };
        }
        return { x: centerX + exports.JOIN_RADIUS, y: centerY + offset };
    }
    if (side === "top") {
        return { x: node.x + nodeWidth / 2 + offset, y: node.y };
    }
    if (side === "bottom") {
        return { x: node.x + nodeWidth / 2 + offset, y: node.y + nodeHeight };
    }
    if (side === "left") {
        return { x: node.x, y: node.y + nodeHeight / 2 + offset };
    }
    return { x: node.x + nodeWidth, y: node.y + nodeHeight / 2 + offset };
}
function getAnchorPoint(node, side) {
    return getAnchor(node, side, 0);
}
function getArrowAngleForSide(side) {
    if (side === "top") {
        return Math.PI / 2;
    } // 90deg = down
    if (side === "bottom") {
        return -Math.PI / 2;
    } // -90deg = up
    if (side === "left") {
        return 0;
    } // 0deg = right
    return Math.PI; // 180deg = left
}
function calculateArrowAngleFromPoints(points) {
    if (points.length < 4) {
        return 0;
    }
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
function sideVector(side) {
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
function nudgePoint(point, side, distance) {
    const v = sideVector(side);
    return { x: point.x + v.x * distance, y: point.y + v.y * distance };
}
