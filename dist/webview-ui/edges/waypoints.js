"use strict";
/**
 * Waypoint filtering and validation for path building
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWaypointMeaningful = isWaypointMeaningful;
exports.filterOnPathWaypoints = filterOnPathWaypoints;
const nodeCollision_1 = require("./nodeCollision");
function isWaypointMeaningful(waypoint, pathPoints, nodeMap, tolerance = 20) {
    if ((0, nodeCollision_1.isInsideAnyNode)(waypoint, nodeMap)) {
        return false;
    }
    if (pathPoints.length < 6) {
        return false;
    }
    for (let i = 2; i < pathPoints.length - 2; i += 2) {
        const cornerX = pathPoints[i];
        const cornerY = pathPoints[i + 1];
        const dx = Math.abs(waypoint.x - cornerX);
        const dy = Math.abs(waypoint.y - cornerY);
        if (dx <= tolerance && dy <= tolerance) {
            return true;
        }
    }
    return false;
}
function filterOnPathWaypoints(waypoints, pathPoints, nodeMap) {
    return waypoints.filter((wp) => isWaypointMeaningful(wp, pathPoints, nodeMap));
}
