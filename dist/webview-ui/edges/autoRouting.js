"use strict";
/**
 * A* pathfinding integration for automatic path routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAutoRoutedPath = buildAutoRoutedPath;
const constants_1 = require("../constants");
const anchors_1 = require("./anchors");
const collision_1 = require("./collision");
const pathfinding_1 = require("./pathfinding");
const pathUtils_1 = require("./pathUtils");
const channelRouting_1 = require("./channelRouting");
function buildAutoRoutedPath(start, end, fromNode, toNode, outSide, inSide, nodeMap, occupiedSegments, channelRegistry) {
    if (channelRegistry) {
        const mergedPath = tryChannelMerge(start, end, fromNode, toNode, outSide, inSide, nodeMap, channelRegistry);
        if (mergedPath) {
            return mergedPath;
        }
    }
    const launch = (0, anchors_1.nudgePoint)(start, outSide, 14);
    const approach = (0, anchors_1.nudgePoint)(end, inSide, 14);
    const obstacles = [
        ...(0, collision_1.buildNodeObstacles)(nodeMap, fromNode.id, toNode.id),
        ...(0, collision_1.segmentsToObstacles)(occupiedSegments),
    ];
    const bounds = (0, collision_1.computeRoutingBounds)(nodeMap, start, end);
    if ((0, collision_1.isInsideObstacle)(launch.x, launch.y, obstacles)) {
        obstacles.push({
            left: launch.x - constants_1.EDGE_PAD,
            right: launch.x + constants_1.EDGE_PAD,
            top: launch.y - constants_1.EDGE_PAD,
            bottom: launch.y + constants_1.EDGE_PAD,
        });
    }
    const route = (0, pathfinding_1.aStarRoute)(launch, approach, obstacles, bounds);
    if (!route) {
        return null;
    }
    const stitched = [start, launch, ...route, approach, end];
    const simplified = (0, pathfinding_1.simplifyOrthogonalPath)(stitched);
    const flattened = (0, pathfinding_1.flattenPoints)(simplified);
    (0, pathUtils_1.ensureMinFinalSegment)(flattened);
    return flattened;
}
function tryChannelMerge(start, end, fromNode, toNode, outSide, inSide, nodeMap, channelRegistry) {
    const targetEnterVertical = inSide === "top" || inSide === "bottom";
    const targetEnterHorizontal = inSide === "left" || inSide === "right";
    if (targetEnterHorizontal) {
        const channelResult = channelRegistry.findMergeableVerticalChannel(toNode.id, inSide, end.y, start.x);
        if (channelResult) {
            const { mergePoint } = channelResult;
            const channelX = mergePoint.x;
            const targetX = end.x;
            const validPosition = (inSide === "right" && channelX > targetX) ||
                (inSide === "left" && channelX < targetX);
            if (validPosition) {
                const mergePathValid = validateMergePath(start, mergePoint, end, outSide, nodeMap, fromNode.id, toNode.id);
                if (mergePathValid) {
                    const path = (0, channelRouting_1.buildMergedChannelPath)(start, mergePoint, end, outSide, "vertical");
                    (0, pathUtils_1.ensureMinFinalSegment)(path);
                    return path;
                }
            }
        }
    }
    if (targetEnterVertical) {
        const channelResult = channelRegistry.findMergeableHorizontalChannel(toNode.id, inSide, end.x, start.y);
        if (channelResult) {
            const { mergePoint } = channelResult;
            const channelY = mergePoint.y;
            const targetY = end.y;
            const validPosition = (inSide === "top" && channelY < targetY) ||
                (inSide === "bottom" && channelY > targetY);
            if (validPosition) {
                const mergePathValid = validateMergePath(start, mergePoint, end, outSide, nodeMap, fromNode.id, toNode.id);
                if (mergePathValid) {
                    const path = (0, channelRouting_1.buildMergedChannelPath)(start, mergePoint, end, outSide, "horizontal");
                    (0, pathUtils_1.ensureMinFinalSegment)(path);
                    return path;
                }
            }
        }
    }
    return null;
}
function validateMergePath(start, merge, end, outSide, nodeMap, fromNodeId, toNodeId) {
    if (outSide === "bottom" || outSide === "top") {
        if ((0, collision_1.lineIntersectsNode)(start.x, start.y, start.x, merge.y, nodeMap, fromNodeId, toNodeId)) {
            return false;
        }
        if ((0, collision_1.lineIntersectsNode)(start.x, merge.y, merge.x, merge.y, nodeMap, fromNodeId, toNodeId)) {
            return false;
        }
    }
    else {
        if ((0, collision_1.lineIntersectsNode)(start.x, start.y, merge.x, start.y, nodeMap, fromNodeId, toNodeId)) {
            return false;
        }
        if ((0, collision_1.lineIntersectsNode)(merge.x, start.y, merge.x, merge.y, nodeMap, fromNodeId, toNodeId)) {
            return false;
        }
    }
    if ((0, collision_1.lineIntersectsNode)(merge.x, merge.y, merge.x, end.y, nodeMap, fromNodeId, toNodeId)) {
        return false;
    }
    if ((0, collision_1.lineIntersectsNode)(merge.x, end.y, end.x, end.y, nodeMap, fromNodeId, toNodeId)) {
        return false;
    }
    return true;
}
