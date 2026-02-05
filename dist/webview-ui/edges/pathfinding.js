"use strict";
/**
 * A* pathfinding for edge routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapToGrid = snapToGrid;
exports.aStarRoute = aStarRoute;
exports.simplifyOrthogonalPath = simplifyOrthogonalPath;
exports.flattenPoints = flattenPoints;
const collision_1 = require("./collision");
function snapToGrid(value) {
    return Math.round(value / collision_1.ROUTING_GRID_STEP) * collision_1.ROUTING_GRID_STEP;
}
function pointKey(x, y) {
    return `${x}|${y}`;
}
class MinHeap {
    constructor(fScore) {
        this.heap = [];
        this.fScore = fScore;
    }
    getScore(key) {
        return this.fScore[key] ?? Infinity;
    }
    parent(i) {
        return Math.floor((i - 1) / 2);
    }
    leftChild(i) {
        return 2 * i + 1;
    }
    rightChild(i) {
        return 2 * i + 2;
    }
    swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
    bubbleUp(i) {
        while (i > 0 && this.getScore(this.heap[i]) < this.getScore(this.heap[this.parent(i)])) {
            this.swap(i, this.parent(i));
            i = this.parent(i);
        }
    }
    bubbleDown(i) {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const left = this.leftChild(i);
            const right = this.rightChild(i);
            if (left < n && this.getScore(this.heap[left]) < this.getScore(this.heap[smallest])) {
                smallest = left;
            }
            if (right < n && this.getScore(this.heap[right]) < this.getScore(this.heap[smallest])) {
                smallest = right;
            }
            if (smallest === i) {
                break;
            }
            this.swap(i, smallest);
            i = smallest;
        }
    }
    push(key) {
        this.heap.push(key);
        this.bubbleUp(this.heap.length - 1);
    }
    pop() {
        if (this.heap.length === 0) {
            return undefined;
        }
        if (this.heap.length === 1) {
            return this.heap.pop();
        }
        const min = this.heap[0];
        const last = this.heap.pop();
        if (last !== undefined) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        return min;
    }
    isEmpty() {
        return this.heap.length === 0;
    }
    get size() {
        return this.heap.length;
    }
}
function reconstructPath(cameFrom, currentKey, nodeLookup) {
    const path = [nodeLookup[currentKey]];
    let key = currentKey;
    while (cameFrom[key]) {
        key = cameFrom[key];
        path.push(nodeLookup[key]);
    }
    return path.reverse();
}
function aStarRoute(start, end, obstacles, bounds) {
    const startX = snapToGrid(start.x);
    const startY = snapToGrid(start.y);
    const endX = snapToGrid(end.x);
    const endY = snapToGrid(end.y);
    const startKey = pointKey(startX, startY);
    const goalKey = pointKey(endX, endY);
    const cameFrom = {};
    const gScore = { [startKey]: 0 };
    const fScore = {
        [startKey]: Math.abs(startX - endX) + Math.abs(startY - endY),
    };
    const openSet = new MinHeap(fScore);
    const inOpenSet = new Set([startKey]);
    openSet.push(startKey);
    const nodeLookup = {
        [startKey]: { x: startX, y: startY },
    };
    const maxIterations = 12000;
    let iterations = 0;
    while (!openSet.isEmpty() && iterations < maxIterations) {
        iterations += 1;
        const current = openSet.pop();
        if (!current) {
            break;
        }
        inOpenSet.delete(current);
        if (current === goalKey) {
            nodeLookup[goalKey] = { x: endX, y: endY };
            return reconstructPath(cameFrom, current, nodeLookup);
        }
        const currentPoint = nodeLookup[current];
        const neighbors = [
            { x: currentPoint.x + collision_1.ROUTING_GRID_STEP, y: currentPoint.y },
            { x: currentPoint.x - collision_1.ROUTING_GRID_STEP, y: currentPoint.y },
            { x: currentPoint.x, y: currentPoint.y + collision_1.ROUTING_GRID_STEP },
            { x: currentPoint.x, y: currentPoint.y - collision_1.ROUTING_GRID_STEP },
        ];
        for (const nb of neighbors) {
            if (nb.x < bounds.minX ||
                nb.x > bounds.maxX ||
                nb.y < bounds.minY ||
                nb.y > bounds.maxY) {
                continue;
            }
            if ((0, collision_1.isInsideObstacle)(nb.x, nb.y, obstacles)) {
                continue;
            }
            const nbKey = pointKey(nb.x, nb.y);
            const tentativeG = (gScore[current] ?? Infinity) + collision_1.ROUTING_GRID_STEP;
            if (tentativeG >= (gScore[nbKey] ?? Infinity)) {
                continue;
            }
            cameFrom[nbKey] = current;
            gScore[nbKey] = tentativeG;
            const heuristic = Math.abs(nb.x - endX) + Math.abs(nb.y - endY);
            fScore[nbKey] = tentativeG + heuristic * 1.1;
            nodeLookup[nbKey] = nb;
            if (!inOpenSet.has(nbKey)) {
                openSet.push(nbKey);
                inOpenSet.add(nbKey);
            }
        }
    }
    return null;
}
function simplifyOrthogonalPath(path) {
    if (path.length < 3) {
        return path;
    }
    const simplified = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
        const prev = simplified[simplified.length - 1];
        const curr = path[i];
        const next = path[i + 1];
        const dirPrev = { x: curr.x - prev.x, y: curr.y - prev.y };
        const dirNext = { x: next.x - curr.x, y: next.y - curr.y };
        const collinear = dirPrev.x === 0 && dirNext.x === 0;
        const horizontal = dirPrev.y === 0 && dirNext.y === 0;
        if (collinear || horizontal) {
            continue;
        }
        simplified.push(curr);
    }
    simplified.push(path[path.length - 1]);
    return simplified;
}
function flattenPoints(points) {
    const result = [];
    for (const p of points) {
        result.push(p.x, p.y);
    }
    return result;
}
