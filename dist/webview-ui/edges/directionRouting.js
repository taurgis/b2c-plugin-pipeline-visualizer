"use strict";
/**
 * Direction-specific routing functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeBottomToTop = routeBottomToTop;
exports.routeRightToTop = routeRightToTop;
exports.routeLeftToTop = routeLeftToTop;
exports.routeLeftToLeft = routeLeftToLeft;
exports.routeBottomToRight = routeBottomToRight;
exports.routeBottomToLeft = routeBottomToLeft;
exports.routeRightToBottom = routeRightToBottom;
exports.routeLeftToBottom = routeLeftToBottom;
exports.routeRightToLeft = routeRightToLeft;
exports.routeLeftToRight = routeLeftToRight;
exports.routeTopToBottom = routeTopToBottom;
const constants_1 = require("../constants");
const collision_1 = require("./collision");
const { nodeWidth, nodeHeight } = constants_1.LAYOUT_CONFIG;
function routeBottomToTop(points, start, end, dx, _dy, fromNode, toNode, nodeMap) {
    if (Math.abs(dx) > 5) {
        const midY = (start.y + end.y) / 2;
        const blocker = (0, collision_1.lineIntersectsNode)(start.x, midY, end.x, midY, nodeMap, fromNode.id, toNode.id);
        if (blocker) {
            const clearanceY = Math.min(start.y + 30, blocker.y - 25);
            if (start.x > blocker.x + nodeWidth) {
                const clearX = blocker.x + nodeWidth + 25;
                points.push(start.x, clearanceY);
                points.push(clearX, clearanceY);
                points.push(clearX, end.y);
            }
            else if (start.x < blocker.x) {
                const clearX = blocker.x - 25;
                points.push(start.x, clearanceY);
                points.push(clearX, clearanceY);
                points.push(clearX, end.y);
            }
            else {
                const goRight = end.x > start.x;
                const clearX = goRight ? blocker.x + nodeWidth + 25 : blocker.x - 25;
                points.push(start.x, clearanceY);
                points.push(clearX, clearanceY);
                points.push(clearX, end.y);
            }
        }
        else {
            const vertBlocker1 = (0, collision_1.lineIntersectsNode)(start.x, start.y, start.x, midY, nodeMap, fromNode.id, toNode.id);
            const vertBlocker2 = (0, collision_1.lineIntersectsNode)(end.x, midY, end.x, end.y, nodeMap, fromNode.id, toNode.id);
            if (vertBlocker1 || vertBlocker2) {
                const blocker = (vertBlocker1 || vertBlocker2);
                const clearX = blocker.x + nodeWidth + 25;
                points.push(clearX, start.y);
                points.push(clearX, end.y);
            }
            else {
                points.push(start.x, midY);
                points.push(end.x, midY);
            }
        }
    }
    else {
        const vertBlocker = (0, collision_1.lineIntersectsNode)(start.x, start.y, end.x, end.y, nodeMap, fromNode.id, toNode.id);
        if (vertBlocker) {
            const clearanceX = vertBlocker.x + nodeWidth + 25;
            points.push(clearanceX, start.y);
            points.push(clearanceX, end.y);
        }
    }
}
function routeRightToTop(points, start, end, dy, startOffset, toNode, nodeMap, _blockingNode) {
    const dx = end.x - start.x;
    const laneSpacing = Math.abs(startOffset) * 7.5;
    let baseClearance = 30;
    if (dx < 0) {
        baseClearance = 50;
    }
    const distanceOffset = Math.min(Math.abs(dy) / 7, 90);
    let clearanceX = start.x + nodeWidth / 2 + baseClearance + laneSpacing + distanceOffset;
    let aboveTargetY = end.y - 25;
    const vertBlocker = (0, collision_1.lineIntersectsNode)(clearanceX, start.y, clearanceX, aboveTargetY, nodeMap, "", toNode.id);
    if (vertBlocker) {
        clearanceX = vertBlocker.x + nodeWidth + 25;
    }
    const horizBlocker = (0, collision_1.lineIntersectsNode)(clearanceX, aboveTargetY, end.x, aboveTargetY, nodeMap, "", toNode.id);
    if (horizBlocker) {
        aboveTargetY = horizBlocker.y - 25;
    }
    points.push(clearanceX, start.y);
    points.push(clearanceX, aboveTargetY);
    points.push(end.x, aboveTargetY);
}
function routeLeftToTop(points, start, end, dx, dy, startOffset, toNode, nodeMap, blockingNode) {
    const laneSpacing = Math.abs(startOffset) * 7.5;
    let baseClearance = 30;
    if (dx > 0) {
        baseClearance = 50;
    }
    const distanceOffset = Math.min(Math.abs(dy) / 7, 90);
    let clearanceX = start.x - nodeWidth / 2 - baseClearance - laneSpacing - distanceOffset;
    let aboveTargetY = end.y - 25;
    if (blockingNode) {
        const blockerLeft = blockingNode.x - 25;
        if (clearanceX > blockerLeft) {
            clearanceX = blockerLeft;
        }
        const blockerTop = blockingNode.y;
        const blockerBottom = blockingNode.y + nodeHeight;
        if (aboveTargetY > blockerTop - 10 && aboveTargetY < blockerBottom + 10) {
            aboveTargetY = blockerBottom + 25;
        }
    }
    const vertBlocker = (0, collision_1.lineIntersectsNode)(clearanceX, start.y, clearanceX, aboveTargetY, nodeMap, "", toNode.id);
    if (vertBlocker) {
        clearanceX = vertBlocker.x - 25;
    }
    const horizBlocker = (0, collision_1.lineIntersectsNode)(clearanceX, aboveTargetY, end.x, aboveTargetY, nodeMap, "", toNode.id);
    if (horizBlocker) {
        aboveTargetY = horizBlocker.y + nodeHeight + 25;
    }
    points.push(clearanceX, start.y);
    points.push(clearanceX, aboveTargetY);
    points.push(end.x, aboveTargetY);
}
function routeLeftToLeft(points, start, end, dy, startOffset, toNode, blockingNode) {
    const laneSpacing = Math.abs(startOffset) * 7.5;
    const baseClearance = 30;
    const distanceOffset = Math.min(Math.abs(dy) / 7, 90);
    let clearanceX = start.x - nodeWidth / 2 - baseClearance - laneSpacing - distanceOffset;
    if (blockingNode) {
        const blockerLeft = blockingNode.x - 25;
        if (clearanceX > blockerLeft) {
            clearanceX = blockerLeft;
        }
    }
    const targetLeftX = toNode.x - 25;
    if (clearanceX > targetLeftX) {
        clearanceX = targetLeftX - 25;
    }
    points.push(clearanceX, start.y);
    points.push(clearanceX, end.y);
}
function routeBottomToRight(points, start, end) {
    points.push(start.x, end.y);
}
function routeBottomToLeft(points, start, end) {
    points.push(start.x, end.y);
}
function routeRightToBottom(points, start, end, fromNode, toNode, nodeMap) {
    const dy = end.y - start.y;
    const targetAbove = dy < 0;
    if (targetAbove) {
        const clearanceX = Math.max(start.x + 30, end.x + nodeWidth / 2 + 30);
        const belowTargetY = end.y + 30;
        points.push(clearanceX, start.y);
        points.push(clearanceX, belowTargetY);
        points.push(end.x, belowTargetY);
    }
    else {
        const horizBlocker = (0, collision_1.lineIntersectsNode)(start.x, start.y, end.x, start.y, nodeMap, fromNode.id, toNode.id);
        if (horizBlocker) {
            const belowY = horizBlocker.y + nodeHeight + 25;
            points.push(start.x, belowY);
            points.push(end.x, belowY);
        }
        else {
            points.push(end.x, start.y);
        }
    }
}
function routeLeftToBottom(points, start, end, fromNode, toNode, nodeMap) {
    const dy = end.y - start.y;
    const targetAbove = dy < 0;
    if (targetAbove) {
        const clearanceX = Math.min(start.x - 30, end.x - nodeWidth / 2 - 30);
        const belowTargetY = end.y + 30;
        points.push(clearanceX, start.y);
        points.push(clearanceX, belowTargetY);
        points.push(end.x, belowTargetY);
    }
    else {
        const horizBlocker = (0, collision_1.lineIntersectsNode)(start.x, start.y, end.x, start.y, nodeMap, fromNode.id, toNode.id);
        if (horizBlocker) {
            const belowY = horizBlocker.y + nodeHeight + 25;
            points.push(start.x, belowY);
            points.push(end.x, belowY);
        }
        else {
            points.push(end.x, start.y);
        }
    }
}
function routeRightToLeft(points, start, end, dy, startOffset, endOffset, fromNode, toNode, nodeMap) {
    if (Math.abs(dy) > 10) {
        let midX = (start.x + end.x) / 2;
        const routeY = start.y + startOffset;
        const vertBlocker = (0, collision_1.lineIntersectsNode)(midX, Math.min(start.y, end.y), midX, Math.max(start.y, end.y), nodeMap, fromNode.id, toNode.id);
        if (vertBlocker) {
            midX = vertBlocker.x + nodeWidth + 25;
        }
        points.push(midX, routeY);
        points.push(midX, end.y + endOffset);
    }
}
function routeLeftToRight(points, start, end, dy, startOffset, endOffset, fromNode, toNode, nodeMap) {
    if (Math.abs(dy) > 10) {
        let midX = (start.x + end.x) / 2;
        const routeY = start.y + startOffset;
        const vertBlocker = (0, collision_1.lineIntersectsNode)(midX, Math.min(start.y, end.y), midX, Math.max(start.y, end.y), nodeMap, fromNode.id, toNode.id);
        if (vertBlocker) {
            midX = vertBlocker.x - 25;
        }
        points.push(midX, routeY);
        points.push(midX, end.y + endOffset);
    }
}
function routeTopToBottom(points, start, end, dx, startOffset, endOffset) {
    if (Math.abs(dx) > 5) {
        const midY = (start.y + end.y) / 2;
        const routeX = start.x + startOffset;
        points.push(routeX, midY);
        points.push(end.x + endOffset, midY);
    }
}
