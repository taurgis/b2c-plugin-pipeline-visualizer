import type {
  PipelineEdge as ParsedEdge,
  PipelineNode as ParsedNode,
} from "./types";
import type {
  PipelineEdge as WebviewEdge,
  PipelineNode as WebviewNode,
} from "../webview-ui/types";

export function toWebviewNodes(nodes: ParsedNode[]): WebviewNode[] {
  return nodes.map((node) => ({
    id: node.id,
    label: node.label,
    type: node.type,
    branch: node.branch,
    attributes: Object.fromEntries(
      Object.entries(node.attributes || {}).filter(([, value]) => value !== undefined)
    ) as Record<string, string>,
    configProperties: node.configProperties ?? [],
    bindings: node.bindings ?? [],
    template: node.template
      ? {
          name: node.template.name,
          buffered: node.template.buffered,
          dynamic: node.template.dynamic,
        }
      : null,
    description: node.description ?? null,
    position: node.position
      ? {
          x: node.position.x,
          y: node.position.y,
          orientation: node.position.orientation,
        }
      : undefined,
    sourceLocation: node.sourceLocation,
  }));
}

export function toWebviewEdges(edges: ParsedEdge[]): WebviewEdge[] {
  return edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    label: edge.label,
    sourceConnector: edge.sourceConnector,
    targetConnector: edge.targetConnector,
    display: edge.display
      ? {
          bendPoints: edge.display.bendPoints.map((bend) => ({
            relativeTo: bend.relativeTo,
            x: bend.x,
            y: bend.y,
          })),
        }
      : undefined,
    sourceLocation: edge.sourceLocation,
  }));
}

export function filterByBranch(
  nodes: ParsedNode[],
  edges: ParsedEdge[],
  branchFilter: string
): { nodes: ParsedNode[]; edges: ParsedEdge[] } {
  const branchPath = resolveBranchPath(nodes, branchFilter);
  const filteredNodeIds = new Set<string>();

  for (const node of nodes) {
    if (
      node.branch === branchPath ||
      node.branch.startsWith(`${branchPath}:`) ||
      node.branch.startsWith(`${branchPath}/`)
    ) {
      filteredNodeIds.add(node.id);
    }
  }

  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const adjacency = buildAdjacency(edges);
  const stack = Array.from(filteredNodeIds);

  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (!nodeId) {
      continue;
    }

    const targets = adjacency.get(nodeId);
    if (!targets) {
      continue;
    }

    for (const target of targets) {
      if (!nodeIdSet.has(target)) {
        continue;
      }
      if (!filteredNodeIds.has(target)) {
        filteredNodeIds.add(target);
        stack.push(target);
      }
    }
  }

  const filteredNodes = nodes.filter((n) => filteredNodeIds.has(n.id));
  const filteredEdges = edges.filter(
    (e) => filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to)
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}

export function getAvailableBranches(nodes: ParsedNode[]): string[] {
  const branches = new Set<string>();

  for (const node of nodes) {
    const branch = node.branch;
    const topLevel = branch.split(/[:/]/)[0];
    branches.add(topLevel);

    if (node.type === "start" && node.label.startsWith("Start ")) {
      branches.add(node.label.replace("Start ", ""));
    }
  }

  return Array.from(branches).sort();
}

function resolveBranchPath(nodes: ParsedNode[], branchFilter: string): string {
  const startNode = nodes.find(
    (n) =>
      n.type === "start" &&
      (n.label === `Start ${branchFilter}` || n.label === branchFilter)
  );

  return startNode ? startNode.branch : branchFilter;
}

function buildAdjacency(edges: ParsedEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    const existing = adjacency.get(edge.from);
    if (existing) {
      existing.push(edge.to);
    } else {
      adjacency.set(edge.from, [edge.to]);
    }
  }

  return adjacency;
}
