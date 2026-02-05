"use strict";
/**
 * Bendpoint-based path routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBendpointPath = buildBendpointPath;
exports.buildSingleWaypointPath = buildSingleWaypointPath;
const nodeCollision_1 = require("./nodeCollision");
const autoRouting_1 = require("./autoRouting");
function buildBendpointPath(points, start, end, srcWpX, srcWpY, tgtWpX, tgtWpY, outSide, inSide) {
    const actualWaypoints = [];
    if (outSide === "right" || outSide === "left") {
        if (inSide === "right" || inSide === "left") {
            let channelX;
            if (inSide === "right") {
                channelX = Math.max(srcWpX, tgtWpX, end.x + 30);
            }
            else {
                channelX = Math.min(srcWpX, tgtWpX, end.x - 30);
            }
            if (outSide === "right" && channelX < start.x) {
                channelX = Math.max(channelX, start.x + 30);
            }
            else if (outSide === "left" && channelX > start.x) {
                channelX = Math.min(channelX, start.x - 30);
            }
            points.push(channelX, start.y);
            points.push(channelX, end.y);
            actualWaypoints.push({ x: channelX, y: start.y });
            actualWaypoints.push({ x: channelX, y: end.y });
        }
        else if (inSide === "top" || inSide === "bottom") {
            points.push(srcWpX, start.y);
            const approachY = inSide === "top"
                ? Math.min(srcWpY, tgtWpY, end.y - 30)
                : Math.max(srcWpY, tgtWpY, end.y + 30);
            if (Math.abs(srcWpX - end.x) > 5) {
                points.push(srcWpX, approachY);
                points.push(end.x, approachY);
            }
            else {
                points.push(srcWpX, approachY);
                points.push(end.x, approachY);
            }
            actualWaypoints.push({ x: srcWpX, y: approachY });
        }
        else {
            points.push(srcWpX, start.y);
            points.push(srcWpX, tgtWpY);
            if (Math.abs(srcWpX - end.x) > 5) {
                points.push(end.x, tgtWpY);
            }
            actualWaypoints.push({ x: srcWpX, y: tgtWpY });
        }
    }
    else {
        if (inSide === "top" || inSide === "bottom") {
            let channelY;
            if (inSide === "top") {
                channelY = Math.min(srcWpY, tgtWpY, end.y - 30);
            }
            else {
                channelY = Math.max(srcWpY, tgtWpY, end.y + 30);
            }
            if (outSide === "bottom" && channelY < start.y) {
                channelY = Math.max(channelY, start.y + 30);
            }
            else if (outSide === "top" && channelY > start.y) {
                channelY = Math.min(channelY, start.y - 30);
            }
            points.push(start.x, channelY);
            points.push(end.x, channelY);
            actualWaypoints.push({ x: start.x, y: channelY });
            actualWaypoints.push({ x: end.x, y: channelY });
        }
        else if (inSide === "right" || inSide === "left") {
            points.push(start.x, srcWpY);
            const approachX = inSide === "right"
                ? Math.max(srcWpX, tgtWpX, end.x + 30)
                : Math.min(srcWpX, tgtWpX, end.x - 30);
            if (Math.abs(srcWpY - end.y) > 5) {
                points.push(approachX, srcWpY);
                points.push(approachX, end.y);
            }
            else {
                points.push(approachX, srcWpY);
                points.push(approachX, end.y);
            }
            actualWaypoints.push({ x: approachX, y: srcWpY });
        }
        else {
            points.push(start.x, srcWpY);
            points.push(tgtWpX, srcWpY);
            if (Math.abs(srcWpY - end.y) > 5) {
                points.push(tgtWpX, end.y);
            }
            actualWaypoints.push({ x: tgtWpX, y: srcWpY });
        }
    }
    return { actualWaypoints };
}
function buildSingleWaypointPath(points, start, end, wpX, wpY, outSide, inSide, nodeMap, fromNodeId, toNodeId, occupiedSegments, fromNode, toNode) {
    const minApproachDistance = 30;
    const proposedPoints = [start.x, start.y];
    if (outSide === "right" || outSide === "left") {
        proposedPoints.push(wpX, start.y);
        if (inSide === "top") {
            const approachY = end.y - minApproachDistance;
            if (start.y < approachY) {
                proposedPoints.push(wpX, approachY);
                proposedPoints.push(end.x, approachY);
            }
            else {
                const aboveY = Math.min(start.y, end.y - minApproachDistance);
                proposedPoints.push(wpX, aboveY);
                proposedPoints.push(end.x, aboveY);
            }
        }
        else if (inSide === "bottom") {
            const approachY = end.y + minApproachDistance;
            if (start.y > approachY) {
                proposedPoints.push(wpX, approachY);
                proposedPoints.push(end.x, approachY);
            }
            else {
                const belowY = Math.max(start.y, end.y + minApproachDistance);
                proposedPoints.push(wpX, belowY);
                proposedPoints.push(end.x, belowY);
            }
        }
        else if (inSide === "left" || inSide === "right") {
            proposedPoints.push(wpX, end.y);
        }
        else {
            proposedPoints.push(wpX, wpY);
            proposedPoints.push(end.x, wpY);
        }
    }
    else {
        proposedPoints.push(start.x, wpY);
        if (inSide === "left") {
            const approachX = end.x - minApproachDistance;
            proposedPoints.push(approachX, wpY);
            proposedPoints.push(approachX, end.y);
        }
        else if (inSide === "right") {
            const approachX = end.x + minApproachDistance;
            proposedPoints.push(approachX, wpY);
            proposedPoints.push(approachX, end.y);
        }
        else {
            proposedPoints.push(wpX, wpY);
            proposedPoints.push(wpX, end.y);
        }
    }
    proposedPoints.push(end.x, end.y);
    if ((0, nodeCollision_1.bendpointPathHasCollision)(proposedPoints, nodeMap, fromNodeId, toNodeId)) {
        const autoRouted = (0, autoRouting_1.buildAutoRoutedPath)(start, end, fromNode, toNode, outSide, inSide, nodeMap, occupiedSegments);
        if (autoRouted) {
            for (let i = 2; i < autoRouted.length; i += 2) {
                points.push(autoRouted[i], autoRouted[i + 1]);
            }
            return true;
        }
        return false;
    }
    for (let i = 2; i < proposedPoints.length - 2; i += 2) {
        points.push(proposedPoints[i], proposedPoints[i + 1]);
    }
    return true;
}
