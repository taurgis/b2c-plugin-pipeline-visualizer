"use strict";
/**
 * Edge utility functions for label normalization and edge type detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLabel = normalizeLabel;
exports.isErrorEdge = isErrorEdge;
exports.inferExitSideFromBendpoints = inferExitSideFromBendpoints;
exports.inferEntrySideFromBendpoints = inferEntrySideFromBendpoints;
exports.getSourceBendpoints = getSourceBendpoints;
exports.getTargetBendpoints = getTargetBendpoints;
function normalizeLabel(label) {
    if (!label) {
        return "";
    }
    return String(label).toLowerCase().replace(/[\s-]/g, "_");
}
function isErrorEdge(label) {
    const l = normalizeLabel(label);
    return l === "error" || l.indexOf("error") !== -1 || l === "pipelet_error";
}
function inferExitSideFromBendpoints(bendPoints) {
    if (!bendPoints || bendPoints.length === 0) {
        return null;
    }
    const sourceBend = bendPoints.find((bp) => bp.relativeTo === "source");
    if (!sourceBend) {
        return null;
    }
    const absX = Math.abs(sourceBend.x);
    const absY = Math.abs(sourceBend.y);
    if (absX > absY) {
        return sourceBend.x > 0 ? "right" : "left";
    }
    else if (absY > absX) {
        return sourceBend.y > 0 ? "bottom" : "top";
    }
    else if (absX > 0) {
        return sourceBend.x > 0 ? "right" : "left";
    }
    return null;
}
function inferEntrySideFromBendpoints(bendPoints) {
    if (!bendPoints || bendPoints.length === 0) {
        return null;
    }
    const targetBends = bendPoints.filter((bp) => bp.relativeTo === "target");
    if (targetBends.length === 0) {
        return null;
    }
    let targetBend = targetBends[0];
    let minDistance = Math.abs(targetBend.x) + Math.abs(targetBend.y);
    for (let i = 1; i < targetBends.length; i++) {
        const dist = Math.abs(targetBends[i].x) + Math.abs(targetBends[i].y);
        if (dist < minDistance) {
            minDistance = dist;
            targetBend = targetBends[i];
        }
    }
    const absX = Math.abs(targetBend.x);
    const absY = Math.abs(targetBend.y);
    if (absX > absY) {
        return targetBend.x > 0 ? "right" : "left";
    }
    else if (absY > absX) {
        return targetBend.y > 0 ? "bottom" : "top";
    }
    else if (absY > 0) {
        return targetBend.y > 0 ? "bottom" : "top";
    }
    return null;
}
function getSourceBendpoints(bendPoints) {
    if (!bendPoints || bendPoints.length === 0) {
        return [];
    }
    return bendPoints
        .filter((bp) => bp.relativeTo === "source")
        .sort((a, b) => {
        const distA = Math.abs(a.x) + Math.abs(a.y);
        const distB = Math.abs(b.x) + Math.abs(b.y);
        return distA - distB;
    });
}
function getTargetBendpoints(bendPoints) {
    if (!bendPoints || bendPoints.length === 0) {
        return [];
    }
    return bendPoints
        .filter((bp) => bp.relativeTo === "target")
        .sort((a, b) => {
        const distA = Math.abs(a.x) + Math.abs(a.y);
        const distB = Math.abs(b.x) + Math.abs(b.y);
        return distA - distB;
    });
}
