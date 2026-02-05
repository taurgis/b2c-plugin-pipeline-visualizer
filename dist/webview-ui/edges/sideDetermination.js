"use strict";
/**
 * Side determination for edge routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDebugLogging = setDebugLogging;
exports.determineSides = determineSides;
exports.determineSidesFromNodeMap = determineSidesFromNodeMap;
exports.determineSidesFromMap = determineSidesFromMap;
const constants_1 = require("../constants");
const edgeUtils_1 = require("./edgeUtils");
const { nodeWidth, nodeHeight } = constants_1.LAYOUT_CONFIG;
let debugLogging = false;
function setDebugLogging(enabled) {
    debugLogging = enabled;
}
function debugLog(message) {
    if (debugLogging) {
        // eslint-disable-next-line no-console
        console.log(message);
    }
}
function determineSides(edge, fromNode, toNode, getNode, nodeIds) {
    const label = edge.label;
    const isError = (0, edgeUtils_1.isErrorEdge)(label);
    const dx = toNode.x + nodeWidth / 2 - (fromNode.x + nodeWidth / 2);
    const dy = toNode.y + nodeHeight / 2 - (fromNode.y + nodeHeight / 2);
    const sourceConn = (edge.sourceConnector || "").toLowerCase();
    const targetConn = (edge.targetConnector || "").toLowerCase();
    const bendPoints = edge.display?.bendPoints;
    const bendExitSide = (0, edgeUtils_1.inferExitSideFromBendpoints)(bendPoints);
    const bendEntrySide = (0, edgeUtils_1.inferEntrySideFromBendpoints)(bendPoints);
    let outSide = "bottom";
    let inSide = "top";
    const targetToRight = dx > nodeWidth * 0.3;
    const targetToLeft = dx < -nodeWidth * 0.3;
    const targetDirectlyBelow = Math.abs(dx) < nodeWidth * 0.5 && dy > 0;
    const targetAbove = dy < -nodeHeight * 0.3;
    const targetBelow = dy > nodeHeight * 0.3;
    debugLog(`[EdgeRouting] Edge "${label}" from "${fromNode.label}" to "${toNode.label}" (type: ${toNode.type})`);
    debugLog(`[EdgeRouting]   dx=${dx.toFixed(0)}, dy=${dy.toFixed(0)}`);
    debugLog(`[EdgeRouting]   sourceConn="${sourceConn}", targetConn="${targetConn}"`);
    debugLog(`[EdgeRouting]   bendExitSide=${bendExitSide}, bendEntrySide=${bendEntrySide}`);
    let cellBelowEmpty = true;
    let blockingNode = null;
    const sourceBottomY = fromNode.y + nodeHeight;
    const targetTopY = toNode.y;
    const sourceCenterX = fromNode.x + nodeWidth / 2;
    if (dy > 0) {
        for (const nodeId of nodeIds) {
            if (nodeId === fromNode.id || nodeId === toNode.id) {
                continue;
            }
            const otherNode = getNode(nodeId);
            if (!otherNode) {
                continue;
            }
            const otherCenterX = otherNode.x + nodeWidth / 2;
            const otherTop = otherNode.y;
            if (Math.abs(otherCenterX - sourceCenterX) < nodeWidth * 0.8) {
                if (otherTop >= sourceBottomY - 10 && otherTop < targetTopY) {
                    cellBelowEmpty = false;
                    blockingNode = otherNode;
                    break;
                }
            }
        }
    }
    if (bendExitSide) {
        outSide = bendExitSide;
    }
    else if (sourceConn === "error" || sourceConn === "pipelet_error" || isError) {
        outSide = "right";
    }
    else if (sourceConn === "yes" || sourceConn === "true") {
        if (targetDirectlyBelow && cellBelowEmpty) {
            outSide = "bottom";
        }
        else {
            outSide = "right";
        }
    }
    else if (sourceConn === "no" || sourceConn === "false") {
        if (targetDirectlyBelow && cellBelowEmpty) {
            outSide = "bottom";
        }
        else {
            outSide = "left";
        }
    }
    else {
        const targetOnSameRowForExit = Math.abs(dy) < nodeHeight * 0.5;
        if (targetOnSameRowForExit && (targetToLeft || targetToRight)) {
            outSide = targetToLeft ? "left" : "right";
        }
        else if (!cellBelowEmpty) {
            if (targetToLeft) {
                outSide = "left";
            }
            else if (targetToRight) {
                outSide = "right";
            }
            else {
                outSide = "left";
            }
        }
    }
    if (bendEntrySide) {
        inSide = bendEntrySide;
    }
    else {
        const targetOnSameRow = Math.abs(dy) < nodeHeight * 0.5;
        const targetDirectlyToRight = targetToRight && targetOnSameRow;
        const targetDirectlyToLeft = targetToLeft && targetOnSameRow;
        const sourceToRightOfTarget = dx < -nodeWidth * 0.8;
        const sourceToLeftOfTarget = dx > nodeWidth * 0.8;
        const horizontalDistance = Math.abs(dx);
        const verticalDistance = Math.abs(dy);
        const targetPrimarilyToSide = horizontalDistance > verticalDistance * 0.8 && horizontalDistance > nodeWidth * 0.5;
        const isJoinTarget = toNode.type === "join";
        debugLog(`[EdgeRouting]   isJoinTarget=${isJoinTarget}, outSide=${outSide}`);
        debugLog(`[EdgeRouting]   horizontalDist=${horizontalDistance.toFixed(0)}, verticalDist=${verticalDistance.toFixed(0)}`);
        debugLog(`[EdgeRouting]   targetToRight=${targetToRight}, targetToLeft=${targetToLeft}`);
        if (isJoinTarget) {
            const verticalDominant = verticalDistance > horizontalDistance * 1.2;
            const horizontalDominant = horizontalDistance > verticalDistance * 1.2;
            const exitingVertically = outSide === "bottom" || outSide === "top";
            const significantHorizontalOffset = horizontalDistance > nodeWidth;
            const preferHorizontalDueToExit = exitingVertically && significantHorizontalOffset;
            debugLog(`[EdgeRouting]   Join: verticalDominant=${verticalDominant}, horizontalDominant=${horizontalDominant}`);
            debugLog(`[EdgeRouting]   Join: exitingVertically=${exitingVertically}, sigHOffset=${significantHorizontalOffset}, preferHDueToExit=${preferHorizontalDueToExit}`);
            if (horizontalDominant || (targetOnSameRow && targetPrimarilyToSide) || preferHorizontalDueToExit) {
                if (targetToRight || dx > 0) {
                    inSide = "left";
                    if (outSide === "bottom" && horizontalDominant && !preferHorizontalDueToExit) {
                        outSide = "right";
                    }
                    debugLog("[EdgeRouting]   Join MATCH: horizontal from left -> inSide=left");
                }
                else if (targetToLeft || dx < 0) {
                    inSide = "right";
                    if (outSide === "bottom" && horizontalDominant && !preferHorizontalDueToExit) {
                        outSide = "left";
                    }
                    debugLog("[EdgeRouting]   Join MATCH: horizontal from right -> inSide=right");
                }
                else {
                    inSide = "top";
                    debugLog("[EdgeRouting]   Join MATCH: horizontal centered -> inSide=top");
                }
            }
            else if (verticalDominant || targetBelow) {
                if (targetBelow || dy > 0) {
                    inSide = "top";
                    debugLog("[EdgeRouting]   Join MATCH: vertical from above -> inSide=top");
                }
                else {
                    inSide = "bottom";
                    debugLog("[EdgeRouting]   Join MATCH: vertical from below -> inSide=bottom");
                }
            }
            else if (Math.abs(dx) < nodeWidth * 0.3) {
                inSide = dy > 0 ? "top" : "bottom";
                debugLog(`[EdgeRouting]   Join MATCH: aligned -> inSide=${inSide}`);
            }
            else {
                if (dx > 0) {
                    inSide = "left";
                    debugLog("[EdgeRouting]   Join MATCH: mixed dx>0 -> inSide=left");
                }
                else {
                    inSide = "right";
                    debugLog("[EdgeRouting]   Join MATCH: mixed dx<0 -> inSide=right");
                }
            }
        }
        else if (outSide === "right" && targetDirectlyToRight) {
            inSide = "left";
        }
        else if (outSide === "left" && targetDirectlyToLeft) {
            inSide = "right";
        }
        else if (outSide === "bottom" && targetOnSameRow) {
            if (targetToRight) {
                outSide = "right";
                inSide = "left";
            }
            else if (targetToLeft) {
                outSide = "left";
                inSide = "right";
            }
        }
        else if (outSide === "bottom" && targetPrimarilyToSide && !blockingNode) {
            if (targetToRight) {
                outSide = "right";
                inSide = "left";
            }
            else if (targetToLeft) {
                outSide = "left";
                inSide = "right";
            }
        }
        else if (outSide === "bottom" && sourceToRightOfTarget) {
            inSide = "right";
        }
        else if (outSide === "bottom" && sourceToLeftOfTarget) {
            inSide = "left";
        }
        else if (blockingNode) {
            if (targetToLeft) {
                inSide = "right";
            }
            else if (targetToRight) {
                inSide = "left";
            }
            else {
                inSide = "left";
            }
        }
        else if (targetConn === "in" || targetConn === "in1" || targetConn === "in2") {
            inSide = "top";
        }
        else if (targetConn === "loop") {
            inSide = "top";
        }
        else if (targetConn === "left") {
            inSide = "left";
        }
        else if (targetConn === "right") {
            inSide = "right";
        }
        else if (targetConn === "bottom") {
            inSide = "bottom";
        }
        else if (targetConn) {
            inSide = "top";
        }
        else {
            if (outSide === "right") {
                if (targetToRight) {
                    inSide = "left";
                }
                else if (targetAbove) {
                    inSide = "bottom";
                }
                else {
                    inSide = "top";
                }
            }
            else if (outSide === "left") {
                if (targetToLeft) {
                    inSide = "right";
                }
                else if (targetAbove) {
                    inSide = "bottom";
                }
                else {
                    inSide = "top";
                }
            }
        }
    }
    if (targetAbove && !bendExitSide && !bendEntrySide) {
        if (outSide === "bottom") {
            outSide = "top";
        }
        if ((outSide === "right" || outSide === "left") && inSide === "top") {
            inSide = "bottom";
        }
    }
    return {
        outSide: outSide,
        inSide: inSide,
        blockingNode,
    };
}
function determineSidesFromNodeMap(edge, fromNode, toNode, nodeMap) {
    return determineSides(edge, fromNode, toNode, (id) => nodeMap[id], Object.keys(nodeMap));
}
function determineSidesFromMap(edge, fromNode, toNode, nodeMap) {
    return determineSides(edge, fromNode, toNode, (id) => nodeMap.get(id), Array.from(nodeMap.keys()));
}
