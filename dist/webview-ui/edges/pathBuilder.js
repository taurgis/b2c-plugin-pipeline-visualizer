"use strict";
/**
 * Path building for edge routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelRegistry = exports.routeTopToBottom = exports.routeLeftToRight = exports.routeRightToLeft = exports.routeLeftToBottom = exports.routeRightToBottom = exports.routeBottomToLeft = exports.routeBottomToRight = exports.routeLeftToLeft = exports.routeLeftToTop = exports.routeRightToTop = exports.routeBottomToTop = exports.ensureMinFinalSegment = exports.buildAutoRoutedPath = exports.buildBackEdgePath = exports.filterOnPathWaypoints = exports.isWaypointMeaningful = exports.bendpointPathHasCollision = exports.pathSegmentHitsNode = exports.isInsideAnyNode = exports.isInsideNode = void 0;
exports.buildOrthogonalPath = buildOrthogonalPath;
const constants_1 = require("../constants");
var nodeCollision_1 = require("./nodeCollision");
Object.defineProperty(exports, "isInsideNode", { enumerable: true, get: function () { return nodeCollision_1.isInsideNode; } });
Object.defineProperty(exports, "isInsideAnyNode", { enumerable: true, get: function () { return nodeCollision_1.isInsideAnyNode; } });
Object.defineProperty(exports, "pathSegmentHitsNode", { enumerable: true, get: function () { return nodeCollision_1.pathSegmentHitsNode; } });
Object.defineProperty(exports, "bendpointPathHasCollision", { enumerable: true, get: function () { return nodeCollision_1.bendpointPathHasCollision; } });
var waypoints_1 = require("./waypoints");
Object.defineProperty(exports, "isWaypointMeaningful", { enumerable: true, get: function () { return waypoints_1.isWaypointMeaningful; } });
Object.defineProperty(exports, "filterOnPathWaypoints", { enumerable: true, get: function () { return waypoints_1.filterOnPathWaypoints; } });
var backEdge_1 = require("./backEdge");
Object.defineProperty(exports, "buildBackEdgePath", { enumerable: true, get: function () { return backEdge_1.buildBackEdgePath; } });
var autoRouting_1 = require("./autoRouting");
Object.defineProperty(exports, "buildAutoRoutedPath", { enumerable: true, get: function () { return autoRouting_1.buildAutoRoutedPath; } });
var pathUtils_1 = require("./pathUtils");
Object.defineProperty(exports, "ensureMinFinalSegment", { enumerable: true, get: function () { return pathUtils_1.ensureMinFinalSegment; } });
var directionRouting_1 = require("./directionRouting");
Object.defineProperty(exports, "routeBottomToTop", { enumerable: true, get: function () { return directionRouting_1.routeBottomToTop; } });
Object.defineProperty(exports, "routeRightToTop", { enumerable: true, get: function () { return directionRouting_1.routeRightToTop; } });
Object.defineProperty(exports, "routeLeftToTop", { enumerable: true, get: function () { return directionRouting_1.routeLeftToTop; } });
Object.defineProperty(exports, "routeLeftToLeft", { enumerable: true, get: function () { return directionRouting_1.routeLeftToLeft; } });
Object.defineProperty(exports, "routeBottomToRight", { enumerable: true, get: function () { return directionRouting_1.routeBottomToRight; } });
Object.defineProperty(exports, "routeBottomToLeft", { enumerable: true, get: function () { return directionRouting_1.routeBottomToLeft; } });
Object.defineProperty(exports, "routeRightToBottom", { enumerable: true, get: function () { return directionRouting_1.routeRightToBottom; } });
Object.defineProperty(exports, "routeLeftToBottom", { enumerable: true, get: function () { return directionRouting_1.routeLeftToBottom; } });
Object.defineProperty(exports, "routeRightToLeft", { enumerable: true, get: function () { return directionRouting_1.routeRightToLeft; } });
Object.defineProperty(exports, "routeLeftToRight", { enumerable: true, get: function () { return directionRouting_1.routeLeftToRight; } });
Object.defineProperty(exports, "routeTopToBottom", { enumerable: true, get: function () { return directionRouting_1.routeTopToBottom; } });
var channelRouting_1 = require("./channelRouting");
Object.defineProperty(exports, "ChannelRegistry", { enumerable: true, get: function () { return channelRouting_1.ChannelRegistry; } });
const waypoints_2 = require("./waypoints");
const autoRouting_2 = require("./autoRouting");
const bendpointRouting_1 = require("./bendpointRouting");
const pathUtils_2 = require("./pathUtils");
const directionRouting_2 = require("./directionRouting");
const { nodeWidth, nodeHeight, horizontalGap, verticalGap } = constants_1.LAYOUT_CONFIG;
function buildOrthogonalPath(start, end, bendPoints, fromNode, toNode, outSide, inSide, startOffset, endOffset, nodeMap, blockingNode, occupiedSegments, channelRegistry) {
    const points = [start.x, start.y];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const hasBendPoints = bendPoints && bendPoints.length > 0;
    const calculatedWaypoints = [];
    if (hasBendPoints) {
        const sourceBend = bendPoints.find((bp) => bp.relativeTo === "source");
        const targetBend = bendPoints.find((bp) => bp.relativeTo === "target");
        if (sourceBend && targetBend) {
            const sourceWaypointX = fromNode.x + nodeWidth / 2 + sourceBend.x * horizontalGap;
            const sourceWaypointY = fromNode.y + nodeHeight / 2 + sourceBend.y * verticalGap;
            const targetWaypointX = toNode.x + nodeWidth / 2 + targetBend.x * horizontalGap;
            const targetWaypointY = toNode.y + nodeHeight / 2 + targetBend.y * verticalGap;
            const result = (0, bendpointRouting_1.buildBendpointPath)(points, start, end, sourceWaypointX, sourceWaypointY, targetWaypointX, targetWaypointY, outSide, inSide);
            calculatedWaypoints.push(...result.actualWaypoints);
        }
        else if (sourceBend) {
            const waypointX = fromNode.x + nodeWidth / 2 + sourceBend.x * horizontalGap;
            const waypointY = fromNode.y + nodeHeight / 2 + sourceBend.y * verticalGap;
            calculatedWaypoints.push({ x: waypointX, y: waypointY });
            const success = (0, bendpointRouting_1.buildSingleWaypointPath)(points, start, end, waypointX, waypointY, outSide, inSide, nodeMap, fromNode.id, toNode.id, occupiedSegments, fromNode, toNode);
            if (!success) {
                // fall through to add end
            }
        }
        else if (targetBend) {
            const waypointX = toNode.x + nodeWidth / 2 + targetBend.x * horizontalGap;
            const waypointY = toNode.y + nodeHeight / 2 + targetBend.y * verticalGap;
            calculatedWaypoints.push({ x: waypointX, y: waypointY });
            const success = (0, bendpointRouting_1.buildSingleWaypointPath)(points, start, end, waypointX, waypointY, outSide, inSide, nodeMap, fromNode.id, toNode.id, occupiedSegments, fromNode, toNode);
            if (!success) {
                // fall through to add end
            }
        }
    }
    else {
        const isStraightVertical = outSide === "bottom" && inSide === "top" && Math.abs(dx) < 5 && dy > 0;
        if (isStraightVertical) {
            points.push(end.x, end.y);
            return points;
        }
        const isStraightHorizontal = ((outSide === "right" && inSide === "left") ||
            (outSide === "left" && inSide === "right")) &&
            Math.abs(dy) < 5;
        if (isStraightHorizontal) {
            points.push(end.x, end.y);
            return points;
        }
        const autoRouted = (0, autoRouting_2.buildAutoRoutedPath)(start, end, fromNode, toNode, outSide, inSide, nodeMap, occupiedSegments, channelRegistry);
        if (autoRouted) {
            return autoRouted;
        }
        applyFallbackRouting(points, start, end, dx, dy, outSide, inSide, startOffset, endOffset, fromNode, toNode, nodeMap, blockingNode);
    }
    points.push(end.x, end.y);
    (0, pathUtils_2.ensureMinFinalSegment)(points);
    if (calculatedWaypoints.length > 0) {
        const meaningfulWaypoints = (0, waypoints_2.filterOnPathWaypoints)(calculatedWaypoints, points, nodeMap);
        if (meaningfulWaypoints.length > 0) {
            return { points, waypoints: meaningfulWaypoints };
        }
    }
    return points;
}
function applyFallbackRouting(points, start, end, dx, dy, outSide, inSide, startOffset, endOffset, fromNode, toNode, nodeMap, blockingNode) {
    if (outSide === "bottom" && inSide === "top") {
        (0, directionRouting_2.routeBottomToTop)(points, start, end, dx, dy, fromNode, toNode, nodeMap);
    }
    else if (outSide === "right" && inSide === "top") {
        (0, directionRouting_2.routeRightToTop)(points, start, end, dy, startOffset, toNode, nodeMap, blockingNode);
    }
    else if (outSide === "left" && inSide === "top") {
        (0, directionRouting_2.routeLeftToTop)(points, start, end, dx, dy, startOffset, toNode, nodeMap, blockingNode);
    }
    else if (outSide === "left" && inSide === "left") {
        (0, directionRouting_2.routeLeftToLeft)(points, start, end, dy, startOffset, toNode, blockingNode);
    }
    else if (outSide === "bottom" && inSide === "right") {
        (0, directionRouting_2.routeBottomToRight)(points, start, end);
    }
    else if (outSide === "bottom" && inSide === "left") {
        (0, directionRouting_2.routeBottomToLeft)(points, start, end);
    }
    else if (outSide === "right" && inSide === "bottom") {
        (0, directionRouting_2.routeRightToBottom)(points, start, end, fromNode, toNode, nodeMap);
    }
    else if (outSide === "left" && inSide === "bottom") {
        (0, directionRouting_2.routeLeftToBottom)(points, start, end, fromNode, toNode, nodeMap);
    }
    else if (outSide === "right" && inSide === "left") {
        (0, directionRouting_2.routeRightToLeft)(points, start, end, dy, startOffset, endOffset, fromNode, toNode, nodeMap);
    }
    else if (outSide === "left" && inSide === "right") {
        (0, directionRouting_2.routeLeftToRight)(points, start, end, dy, startOffset, endOffset, fromNode, toNode, nodeMap);
    }
    else if (outSide === "top" && inSide === "bottom") {
        (0, directionRouting_2.routeTopToBottom)(points, start, end, dx, startOffset, endOffset);
    }
    else if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        if (outSide === "right" || outSide === "left") {
            points.push(end.x, start.y);
        }
        else {
            points.push(start.x, end.y);
        }
    }
}
