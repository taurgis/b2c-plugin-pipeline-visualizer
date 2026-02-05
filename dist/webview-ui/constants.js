"use strict";
/**
 * Shared constants for layout and routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BENDPOINT_INDICATOR_COLOR = exports.THEME = exports.EDGE_COLORS = exports.NODE_COLORS = exports.EDGE_SPACING = exports.EDGE_PAD = exports.LAYOUT_CONFIG = void 0;
exports.getEdgeColor = getEdgeColor;
exports.isLoopBackEdge = isLoopBackEdge;
exports.LAYOUT_CONFIG = {
    nodeWidth: 180,
    nodeHeight: 80,
    horizontalGap: 220,
    verticalGap: 110,
    baseX: 60,
    baseY: 60,
};
exports.EDGE_PAD = 26;
exports.EDGE_SPACING = 12;
exports.NODE_COLORS = {
    start: "#6be8c7",
    end: "#ff8a7a",
    pipelet: "#6dd3ff",
    call: "#f2c078",
    jump: "#f2c078",
    interaction: "#9c6dff",
    decision: "#f2c078",
    join: "#93a4c8",
    loop: "#6be8c7",
    text: "#93a4c8",
    unknown: "#93a4c8",
};
exports.EDGE_COLORS = {
    default: "#6dd3ff",
    next: "#6dd3ff",
    error: "#ff8a7a",
    pipelet_error: "#ff8a7a",
    loop: "#f2c078",
    do: "#f2c078",
    iterate: "#f2c078",
    yes: "#6be8c7",
    true: "#6be8c7",
    no: "#ff8a7a",
    false: "#ff8a7a",
    success: "#6be8c7",
    pipelet_next: "#6be8c7",
    ok: "#6be8c7",
};
exports.THEME = {
    nodeFill: "#0d1328",
    nodeOverlay: "rgba(255,255,255,0.03)",
    edgeColor: "#6dd3ff",
    gridColor: "#1a2340",
    textColor: "#d8e2ff",
    mutedColor: "#93a4c8",
    darkBg: "#0b1021",
    fontFamily: "IBM Plex Sans, system-ui, sans-serif",
};
exports.BENDPOINT_INDICATOR_COLOR = "#ff4444";
function getEdgeColor(label) {
    if (!label) {
        return exports.EDGE_COLORS.default;
    }
    const lowerLabel = label.toLowerCase().replace(/[_-]/g, "_");
    if (lowerLabel.indexOf("error") !== -1) {
        return exports.EDGE_COLORS.error;
    }
    if (lowerLabel === "pipelet_error") {
        return exports.EDGE_COLORS.pipelet_error;
    }
    if (lowerLabel === "do") {
        return exports.EDGE_COLORS.do;
    }
    if (lowerLabel === "loop") {
        return exports.EDGE_COLORS.loop;
    }
    if (lowerLabel.indexOf("iterate") !== -1) {
        return exports.EDGE_COLORS.iterate;
    }
    if (lowerLabel === "next_iteration") {
        return exports.EDGE_COLORS.loop;
    }
    if (lowerLabel === "yes" || lowerLabel === "true") {
        return exports.EDGE_COLORS.yes;
    }
    if (lowerLabel === "no" || lowerLabel === "false") {
        return exports.EDGE_COLORS.no;
    }
    if (lowerLabel.indexOf("success") !== -1) {
        return exports.EDGE_COLORS.success;
    }
    if (lowerLabel === "pipelet_next") {
        return exports.EDGE_COLORS.pipelet_next;
    }
    if (lowerLabel === "ok") {
        return exports.EDGE_COLORS.ok;
    }
    if (lowerLabel === "next") {
        return exports.EDGE_COLORS.next;
    }
    return exports.EDGE_COLORS.default;
}
function isLoopBackEdge(label) {
    if (!label) {
        return false;
    }
    const lowerLabel = label.toLowerCase();
    return lowerLabel === "loop" || lowerLabel === "next_iteration";
}
