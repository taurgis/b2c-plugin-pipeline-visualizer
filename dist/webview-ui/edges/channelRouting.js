"use strict";
/**
 * Channel-based edge routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelRegistry = void 0;
exports.buildMergedChannelPath = buildMergedChannelPath;
const constants_1 = require("../constants");
class ChannelRegistry {
    constructor() {
        this.channels = [];
    }
    registerEdge(segments, targetNodeId, targetSide) {
        for (const seg of segments) {
            const isVertical = Math.abs(seg.x1 - seg.x2) < 5;
            const isHorizontal = Math.abs(seg.y1 - seg.y2) < 5;
            if (isVertical) {
                const x = (seg.x1 + seg.x2) / 2;
                const minY = Math.min(seg.y1, seg.y2);
                const maxY = Math.max(seg.y1, seg.y2);
                const existingChannel = this.findMatchingChannel(x, "vertical", targetNodeId, targetSide);
                if (existingChannel) {
                    existingChannel.start = Math.min(existingChannel.start, minY);
                    existingChannel.end = Math.max(existingChannel.end, maxY);
                    existingChannel.edgeCount++;
                    existingChannel.sourceSegments.push(seg);
                }
                else {
                    this.channels.push({
                        position: x,
                        start: minY,
                        end: maxY,
                        direction: "vertical",
                        targetNodeId,
                        targetSide,
                        edgeCount: 1,
                        sourceSegments: [seg],
                    });
                }
            }
            else if (isHorizontal) {
                const y = (seg.y1 + seg.y2) / 2;
                const minX = Math.min(seg.x1, seg.x2);
                const maxX = Math.max(seg.x1, seg.x2);
                const existingChannel = this.findMatchingChannel(y, "horizontal", targetNodeId, targetSide);
                if (existingChannel) {
                    existingChannel.start = Math.min(existingChannel.start, minX);
                    existingChannel.end = Math.max(existingChannel.end, maxX);
                    existingChannel.edgeCount++;
                    existingChannel.sourceSegments.push(seg);
                }
                else {
                    this.channels.push({
                        position: y,
                        start: minX,
                        end: maxX,
                        direction: "horizontal",
                        targetNodeId,
                        targetSide,
                        edgeCount: 1,
                        sourceSegments: [seg],
                    });
                }
            }
        }
    }
    findMatchingChannel(position, direction, targetNodeId, targetSide) {
        const tolerance = constants_1.EDGE_SPACING * 2;
        return this.channels.find((ch) => ch.direction === direction &&
            ch.targetNodeId === targetNodeId &&
            ch.targetSide === targetSide &&
            Math.abs(ch.position - position) < tolerance);
    }
    findMergeableVerticalChannel(targetNodeId, targetSide, approachY, _sourceX) {
        const candidates = this.channels.filter((ch) => ch.direction === "vertical" &&
            ch.targetNodeId === targetNodeId &&
            ch.targetSide === targetSide &&
            approachY >= ch.start - 50 &&
            approachY <= ch.end + 50);
        if (candidates.length === 0) {
            return null;
        }
        const bestChannel = candidates[0];
        const offsetDirection = targetSide === "right" ? 1 : -1;
        const offset = bestChannel.edgeCount * constants_1.EDGE_SPACING * offsetDirection;
        const mergePoint = {
            x: bestChannel.position + offset,
            y: Math.max(bestChannel.start, Math.min(approachY, bestChannel.end)),
        };
        return { channel: bestChannel, mergePoint, offset };
    }
    findMergeableHorizontalChannel(targetNodeId, targetSide, approachX, _sourceY) {
        const candidates = this.channels.filter((ch) => ch.direction === "horizontal" &&
            ch.targetNodeId === targetNodeId &&
            ch.targetSide === targetSide &&
            approachX >= ch.start - 50 &&
            approachX <= ch.end + 50);
        if (candidates.length === 0) {
            return null;
        }
        const bestChannel = candidates[0];
        const offsetDirection = targetSide === "bottom" ? 1 : -1;
        const offset = bestChannel.edgeCount * constants_1.EDGE_SPACING * offsetDirection;
        const mergePoint = {
            x: Math.max(bestChannel.start, Math.min(approachX, bestChannel.end)),
            y: bestChannel.position + offset,
        };
        return { channel: bestChannel, mergePoint, offset };
    }
    clear() {
        this.channels = [];
    }
    getChannels() {
        return this.channels;
    }
}
exports.ChannelRegistry = ChannelRegistry;
function buildMergedChannelPath(start, mergePoint, end, outSide, channelDirection) {
    const points = [start.x, start.y];
    if (channelDirection === "vertical") {
        if (outSide === "bottom" || outSide === "top") {
            if (Math.abs(start.x - mergePoint.x) > 5) {
                const initialOffset = outSide === "bottom" ? 30 : -30;
                const turnY = start.y + initialOffset;
                points.push(start.x, turnY);
                points.push(mergePoint.x, turnY);
            }
            points.push(mergePoint.x, end.y);
        }
        else {
            points.push(mergePoint.x, start.y);
            points.push(mergePoint.x, end.y);
        }
    }
    else {
        if (outSide === "left" || outSide === "right") {
            if (Math.abs(start.y - mergePoint.y) > 5) {
                const initialOffset = outSide === "right" ? 30 : -30;
                const turnX = start.x + initialOffset;
                points.push(turnX, start.y);
                points.push(turnX, mergePoint.y);
            }
            points.push(end.x, mergePoint.y);
        }
        else {
            points.push(start.x, mergePoint.y);
            points.push(end.x, mergePoint.y);
        }
    }
    points.push(end.x, end.y);
    return points;
}
