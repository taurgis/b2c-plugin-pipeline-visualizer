"use strict";
/**
 * Node layout calculation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLayout = calculateLayout;
exports.buildNodeMap = buildNodeMap;
exports.calculateBounds = calculateBounds;
const constants_1 = require("./constants");
const { nodeWidth, nodeHeight, horizontalGap, verticalGap, baseX, baseY } = constants_1.LAYOUT_CONFIG;
function calculateLayout(nodes, options) {
    let placedNodes = [];
    const preserveGrid = options?.preserveGrid === true;
    try {
        const nodeGridPositions = {};
        const occupiedCells = {};
        const topLevelBranches = {};
        for (const node of nodes) {
            const branch = node.branch;
            if (branch.indexOf("/") === -1) {
                topLevelBranches[branch] = true;
            }
        }
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const pos = node.position;
            let gridX;
            let gridY;
            const isFirstInBranch = isFirstNodeInBranchFn(node.id, nodes, i);
            const isTopLevelBranch = topLevelBranches[node.branch];
            const isNestedBranch = !isTopLevelBranch;
            const xmlX = pos?.x !== undefined ? pos.x : 0;
            const xmlY = pos?.y !== undefined ? pos.y : 1;
            if (isFirstInBranch && isTopLevelBranch) {
                gridX = xmlX;
                gridY = xmlY;
            }
            else if (isFirstInBranch && isNestedBranch) {
                const parentPos = findParentNodePosition(node, nodeGridPositions, nodes, i);
                if (parentPos) {
                    gridX = parentPos.gridX + xmlX;
                    gridY = parentPos.gridY + xmlY;
                }
                else {
                    gridX = xmlX;
                    gridY = xmlY;
                }
            }
            else {
                const prevPos = findPreviousNodePosition(node, nodeGridPositions, nodes, i);
                if (prevPos) {
                    gridX = prevPos.gridX + xmlX;
                    gridY = prevPos.gridY + xmlY;
                }
                else {
                    gridX = xmlX;
                    gridY = xmlY;
                }
            }
            nodeGridPositions[node.id] = { gridX, gridY };
            const cellKey = `${gridX},${gridY}`;
            occupiedCells[cellKey] = true;
            placedNodes.push({
                id: node.id,
                label: node.label,
                type: node.type,
                branch: node.branch,
                attributes: node.attributes || {},
                configProperties: node.configProperties || [],
                bindings: node.bindings || [],
                template: node.template || null,
                description: node.description || null,
                sourceLocation: node.sourceLocation,
                orientation: pos?.orientation ?? null,
                gridX,
                gridY,
                x: 0,
                y: 0,
            });
        }
        let minGridX = 0;
        let minGridY = 0;
        for (const n of placedNodes) {
            if (n.gridX !== undefined && n.gridX < minGridX) {
                minGridX = n.gridX;
            }
            if (n.gridY !== undefined && n.gridY < minGridY) {
                minGridY = n.gridY;
            }
        }
        for (const n of placedNodes) {
            const normalizedGridX = (n.gridX ?? 0) - minGridX;
            const normalizedGridY = (n.gridY ?? 0) - minGridY;
            n.x = baseX + (normalizedGridX * horizontalGap);
            n.y = baseY + (normalizedGridY * verticalGap);
            if (preserveGrid) {
                n.gridX = normalizedGridX;
                n.gridY = normalizedGridY;
            }
            else {
                delete n.gridX;
                delete n.gridY;
            }
        }
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error("Layout error:", e);
        placedNodes = nodes.map((node, i) => ({
            id: node.id,
            label: node.label,
            type: node.type,
            branch: node.branch,
            attributes: node.attributes || {},
            configProperties: node.configProperties || [],
            bindings: node.bindings || [],
            template: node.template || null,
            description: node.description || null,
            x: baseX + (i % 5) * horizontalGap,
            y: baseY + Math.floor(i / 5) * verticalGap,
        }));
    }
    return placedNodes;
}
function isFirstNodeInBranchFn(nodeId, allNodes, currentIndex) {
    const currentNode = allNodes[currentIndex];
    const branchPath = currentNode.branch;
    for (let i = 0; i < currentIndex; i++) {
        if (allNodes[i].branch === branchPath) {
            return false;
        }
    }
    return true;
}
function findParentNodePosition(node, nodeGridPositions, allNodes, currentIndex) {
    const branch = node.branch;
    const slashIndex = branch.lastIndexOf("/");
    if (slashIndex === -1) {
        return null;
    }
    const parentNodeId = branch.substring(0, slashIndex);
    let pos = nodeGridPositions[parentNodeId];
    if (pos) {
        return pos;
    }
    const lastColonBeforeSlash = parentNodeId.lastIndexOf(":");
    if (lastColonBeforeSlash > 0) {
        const secondLastColon = parentNodeId.lastIndexOf(":", lastColonBeforeSlash - 1);
        if (secondLastColon > 0) {
            for (let i = currentIndex - 1; i >= 0; i--) {
                const otherNode = allNodes[i];
                if (otherNode.id === parentNodeId) {
                    pos = nodeGridPositions[otherNode.id];
                    if (pos) {
                        return pos;
                    }
                }
            }
        }
    }
    for (let i = currentIndex - 1; i >= 0; i--) {
        if (allNodes[i].id === parentNodeId) {
            pos = nodeGridPositions[allNodes[i].id];
            if (pos) {
                return pos;
            }
        }
    }
    return null;
}
function findPreviousNodePosition(node, nodeGridPositions, allNodes, currentIndex) {
    for (let i = currentIndex - 1; i >= 0; i--) {
        if (allNodes[i].branch === node.branch) {
            const pos = nodeGridPositions[allNodes[i].id];
            if (pos) {
                return pos;
            }
        }
    }
    return null;
}
function buildNodeMap(placedNodes) {
    const nodeMap = {};
    for (const node of placedNodes) {
        nodeMap[node.id] = node;
    }
    return nodeMap;
}
function calculateBounds(placedNodes) {
    let maxX = baseX;
    let maxY = baseY;
    for (const n of placedNodes) {
        if (n.x + nodeWidth > maxX) {
            maxX = n.x + nodeWidth;
        }
        if (n.y + nodeHeight > maxY) {
            maxY = n.y + nodeHeight;
        }
    }
    return {
        maxX: maxX + horizontalGap,
        maxY: maxY + verticalGap,
    };
}
