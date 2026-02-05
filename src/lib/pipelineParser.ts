import { DOMParser } from "@xmldom/xmldom";
import type { Element as XmlElement } from "@xmldom/xmldom";
import {
  BendPoint,
  ConfigProperty,
  KeyBinding,
  ParsedPipeline,
  PipelineEdge,
  PipelineNode,
  PipelineNodeType,
  SourceLocation,
  TransitionDisplay,
} from "./types";

interface DeferredEdge {
  fromNodeId: string;
  fromBranchPath: string;
  fromSegmentIndex: number;
  targetPath: string;
  label?: string;
  sourceConnector?: string;
  targetConnector?: string;
  display?: TransitionDisplay;
  sourceLocation?: SourceLocation;
}

export function parsePipeline(xml: string, sourceName = "pipeline.xml"): ParsedPipeline {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const pipelineEl = doc.getElementsByTagName("pipeline").item(0) as XmlElement | null;

  if (!pipelineEl) {
    throw new Error("Missing <pipeline> root element");
  }

  const pipelineName = pipelineEl.getAttribute("name") || stripExtension(sourceName);
  const group = pipelineEl.getAttribute("group") || undefined;
  const type = pipelineEl.getAttribute("type") || undefined;
  const description = readFirstChildText(pipelineEl, "description");

  const nodes: PipelineNode[] = [];
  const edges: PipelineEdge[] = [];

  const segmentFirstNodeMap = new Map<string, string>();
  const deferredEdges: DeferredEdge[] = [];

  let branchOrdinal = 0;
  for (const branchEl of getElementChildren(pipelineEl, "branch")) {
    const path = branchEl.getAttribute("basename") || `branch-${branchOrdinal++}`;
    parseBranchWithEntry(branchEl, path);
  }

  processDeferredEdges();

  return { name: pipelineName, group, type, description, nodes, edges };

  function parseBranchWithEntry(
    branchEl: XmlElement,
    branchPath: string,
    parentLoopNodeId?: string
  ): { entryIds: string[] } {
    const entryIds: string[] = [];
    let segmentIndex = 0;

    for (const segmentEl of getElementChildren(branchEl, "segment")) {
      const result = parseSegment(segmentEl, branchPath, segmentIndex++, parentLoopNodeId);
      if (result.firstNodeId && entryIds.length === 0) {
        entryIds.push(result.firstNodeId);
      }
    }

    return { entryIds };
  }

  function parseSegment(
    segmentEl: XmlElement,
    branchPath: string,
    segmentIndex: number,
    parentLoopNodeId?: string
  ) {
    let lastNodeId: string | undefined;
    let firstNodeId: string | undefined;
    let pendingLabel: string | undefined;
    let pendingSourceConnector: string | undefined;
    let pendingTargetConnector: string | undefined;
    let pendingDisplay: TransitionDisplay | undefined;
    let pendingTargetPath: string | undefined;
    let pendingSourceLocation: SourceLocation | undefined;
    let nodeIndex = 0;

    for (const child of getElementChildren(segmentEl)) {
      if (child.tagName === "node") {
        const parsed = parseNode(child, branchPath, segmentIndex, nodeIndex++);

        if (!firstNodeId) {
          firstNodeId = parsed.id;
          const segmentKey = `${branchPath}:${segmentIndex}`;
          segmentFirstNodeMap.set(segmentKey, parsed.id);
        }

        if (lastNodeId) {
          if (pendingTargetPath) {
            deferredEdges.push({
              fromNodeId: lastNodeId,
              fromBranchPath: branchPath,
              fromSegmentIndex: segmentIndex,
              targetPath: pendingTargetPath,
              label: pendingLabel,
              sourceConnector: pendingSourceConnector,
              targetConnector: pendingTargetConnector,
              display: pendingDisplay,
              sourceLocation: pendingSourceLocation,
            });
          } else {
            edges.push({
              from: lastNodeId,
              to: parsed.id,
              label: pendingLabel,
              sourceConnector: pendingSourceConnector,
              targetConnector: pendingTargetConnector,
              display: pendingDisplay,
              sourceLocation: pendingSourceLocation,
            });
          }
        }

        lastNodeId = parsed.id;
        pendingLabel = undefined;
        pendingSourceConnector = undefined;
        pendingTargetConnector = undefined;
        pendingDisplay = undefined;
        pendingTargetPath = undefined;
        pendingSourceLocation = undefined;
      } else if (child.tagName === "simple-transition" || child.tagName === "transition") {
        const label = deriveTransitionLabel(child);
        const targetConnector = child.getAttribute("target-connector");
        const sourceConnector = child.getAttribute("source-connector");
        const targetPath = child.getAttribute("target-path");

        const transitionDisplay = parseTransitionDisplay(child);
        const transitionSourceLocation = getSourceLocation(child);

        if (targetConnector === "loop" && targetPath && parentLoopNodeId && lastNodeId) {
          edges.push({
            from: lastNodeId,
            to: parentLoopNodeId,
            label: "loop",
            sourceConnector: sourceConnector || undefined,
            targetConnector: targetConnector || undefined,
            display: transitionDisplay,
            sourceLocation: transitionSourceLocation,
          });
          pendingLabel = undefined;
          pendingSourceConnector = undefined;
          pendingTargetConnector = undefined;
          pendingDisplay = undefined;
          pendingTargetPath = undefined;
          pendingSourceLocation = undefined;
        } else {
          pendingLabel = label;
          pendingSourceConnector = sourceConnector || undefined;
          pendingTargetConnector = targetConnector || undefined;
          pendingDisplay = transitionDisplay;
          pendingTargetPath = targetPath || undefined;
          pendingSourceLocation = transitionSourceLocation;
        }
      }
    }

    if (lastNodeId && pendingTargetPath) {
      deferredEdges.push({
        fromNodeId: lastNodeId,
        fromBranchPath: branchPath,
        fromSegmentIndex: segmentIndex,
        targetPath: pendingTargetPath,
        label: pendingLabel,
        sourceConnector: pendingSourceConnector,
        targetConnector: pendingTargetConnector,
        display: pendingDisplay,
        sourceLocation: pendingSourceLocation,
      });
    }

    return { firstNodeId, lastNodeId };
  }

  function parseNode(nodeEl: XmlElement, branchPath: string, segmentIndex: number, nodeIndex: number): PipelineNode {
    const typeEl = findFirstElement(nodeEl, (el) => el.tagName !== "node-display" && el.tagName !== "branch");
    const displayEl = findFirstElement(nodeEl, (el) => el.tagName === "node-display");

    const position = displayEl
      ? {
          x: readNumberAttr(displayEl, "x"),
          y: readNumberAttr(displayEl, "y"),
          width: readNumberAttr(displayEl, "width"),
          orientation: displayEl.getAttribute("orientation") || undefined,
        }
      : undefined;

    const id = `${branchPath}:${segmentIndex}:${nodeIndex}`;
    const { type, label, attributes, configProperties, bindings } = describeNode(typeEl);

    const sourceLocation = typeEl ? getSourceLocation(typeEl) : getSourceLocation(nodeEl);

    const parsedNode: PipelineNode = {
      id,
      label,
      type,
      branch: branchPath,
      attributes,
      configProperties,
      bindings,
      position,
      sourceLocation,
    };

    nodes.push(parsedNode);

    const isLoopNode = type === "loop";

    for (const nestedBranch of getElementChildren(nodeEl, "branch")) {
      const connectorLabel =
        nestedBranch.getAttribute("source-connector") ||
        nestedBranch.getAttribute("target-connector") ||
        nestedBranch.getAttribute("basename") ||
        "branch";

      const branchBasename = nestedBranch.getAttribute("basename") || connectorLabel;
      const nestedPath = `${branchPath}:${segmentIndex}:${nodeIndex}/${branchBasename}`;

      const transitionEl = findFirstElement(
        nestedBranch,
        (el) => el.tagName === "transition" || el.tagName === "simple-transition"
      );
      const branchTransitionDisplay = transitionEl ? parseTransitionDisplay(transitionEl) : undefined;
      const branchTargetConnector = transitionEl?.getAttribute("target-connector") || undefined;
      const branchSourceLocation = transitionEl ? getSourceLocation(transitionEl) : getSourceLocation(nestedBranch);

      const branchResult = parseBranchWithEntry(
        nestedBranch,
        nestedPath,
        isLoopNode ? id : undefined
      );

      for (const entry of branchResult.entryIds) {
        edges.push({
          from: id,
          to: entry,
          label: connectorLabel,
          sourceConnector: connectorLabel,
          targetConnector: branchTargetConnector,
          display: branchTransitionDisplay,
          sourceLocation: branchSourceLocation,
        });
      }
    }

    return parsedNode;
  }

  function processDeferredEdges() {
    for (const deferred of deferredEdges) {
      const targetNodeId = resolveTargetPath(
        deferred.targetPath,
        deferred.fromBranchPath,
        deferred.fromSegmentIndex
      );

      if (targetNodeId) {
        edges.push({
          from: deferred.fromNodeId,
          to: targetNodeId,
          label: deferred.label,
          sourceConnector: deferred.sourceConnector,
          targetConnector: deferred.targetConnector,
          display: deferred.display,
          sourceLocation: deferred.sourceLocation,
        });
      }
    }
  }

  function resolveTargetPath(
    targetPath: string,
    currentBranchPath: string,
    currentSegmentIndex: number
  ): string | undefined {
    if (targetPath.startsWith("/")) {
      const pathWithoutSlash = targetPath.slice(1);
      const match = pathWithoutSlash.match(/^([^.]+)\.(\d+)$/);
      if (match) {
        const branchName = match[1];
        const segmentIdx = parseInt(match[2], 10);
        const segmentKey = `${branchName}:${segmentIdx}`;
        return segmentFirstNodeMap.get(segmentKey);
      }
      return undefined;
    }

    let branchPath = currentBranchPath;
    let segmentIndex = currentSegmentIndex;
    let remainingPath = targetPath;

    while (remainingPath.startsWith("../")) {
      remainingPath = remainingPath.slice(3);

      const lastSlashIndex = branchPath.lastIndexOf("/");

      if (lastSlashIndex > 0) {
        const parentPart = branchPath.slice(0, lastSlashIndex);

        const segNodeMatch = parentPart.match(/:(\d+):(\d+)$/);
        if (segNodeMatch) {
          segmentIndex = parseInt(segNodeMatch[1], 10);
          branchPath = parentPart.replace(/:(\d+):(\d+)$/, "");
        } else {
          branchPath = parentPart;
        }
      } else {
        const segNodeMatch = branchPath.match(/:(\d+):(\d+)$/);
        if (segNodeMatch) {
          segmentIndex = parseInt(segNodeMatch[1], 10);
          branchPath = branchPath.replace(/:(\d+):(\d+)$/, "");
        }
      }
    }

    if (remainingPath.startsWith("./")) {
      remainingPath = remainingPath.slice(2);
    }

    const offsetMatch = remainingPath.match(/^([+-])(\d+)$/);
    if (offsetMatch) {
      const sign = offsetMatch[1] === "+" ? 1 : -1;
      const offset = parseInt(offsetMatch[2], 10);
      const targetSegmentIndex = segmentIndex + sign * offset;
      const segmentKey = `${branchPath}:${targetSegmentIndex}`;
      return segmentFirstNodeMap.get(segmentKey);
    }

    const nestedMatch = remainingPath.match(/^([^.]+)\.(\d+)$/);
    if (nestedMatch) {
      const nestedBranchName = nestedMatch[1];
      const targetSegmentIdx = parseInt(nestedMatch[2], 10);

      for (const [key, nodeId] of segmentFirstNodeMap) {
        if (key.endsWith(`/${nestedBranchName}:${targetSegmentIdx}`)) {
          if (key.startsWith(branchPath)) {
            return nodeId;
          }
        }
      }
    }

    return undefined;
  }

  function describeNode(typeEl: XmlElement | undefined): {
    type: PipelineNodeType;
    label: string;
    attributes: Record<string, string | undefined>;
    configProperties?: ConfigProperty[];
    bindings?: KeyBinding[];
  } {
    if (!typeEl) {
      return { type: "unknown", label: "Unknown", attributes: {} };
    }

    const attrs = collectAttributes(typeEl);

    switch (typeEl.tagName) {
      case "start-node": {
        const name = attrs.name ? ` ${attrs.name}` : "";
        return { type: "start", label: `Start${name}`.trim(), attributes: attrs };
      }
      case "end-node": {
        const name = attrs.name ? ` ${attrs.name}` : "";
        return { type: "end", label: `End${name}`.trim(), attributes: attrs };
      }
      case "pipelet-node": {
        const pipeletName = attrs["pipelet-name"] || "Pipelet";
        const configProperties = collectConfigProperties(typeEl);
        const bindings = collectKeyBindings(typeEl);
        return { type: "pipelet", label: pipeletName, attributes: attrs, configProperties, bindings };
      }
      case "call-node": {
        const target = attrs["start-name-ref"] || "Call";
        return { type: "call", label: `Call ${target}`, attributes: attrs };
      }
      case "jump-node": {
        const target = attrs["start-name-ref"] || "Jump";
        return { type: "jump", label: `Jump ${target}`, attributes: attrs };
      }
      case "interaction-node": {
        const templateEl = findFirstElement(typeEl, (el) => el.tagName === "template");
        const templateName = templateEl?.getAttribute("name") || "Interaction";
        return { type: "interaction", label: templateName, attributes: attrs };
      }
      case "decision-node": {
        const condition = attrs["condition-key"];
        const label = condition ? `Decision ${truncate(condition, 50)}` : "Decision";
        return { type: "decision", label, attributes: attrs };
      }
      case "join-node": {
        return { type: "join", label: "Join", attributes: attrs };
      }
      case "loop-node": {
        const loopLabel = attrs["iterator-key"] || "Loop";
        return { type: "loop", label: `Loop ${loopLabel}`, attributes: attrs };
      }
      case "text-node": {
        const text = readFirstChildText(typeEl, "description") || "Text";
        const label = truncate(text, 60);
        return { type: "text", label, attributes: attrs };
      }
      default: {
        return { type: "unknown", label: typeEl.tagName, attributes: attrs };
      }
    }
  }
}

function getElementChildren(parent: XmlElement, tagFilter?: string): XmlElement[] {
  const elements: XmlElement[] = [];

  for (let i = 0; i < parent.childNodes.length; i += 1) {
    const node = parent.childNodes.item(i);
    if (node && node.nodeType === 1) {
      const el = node as XmlElement;
      if (!tagFilter || el.tagName === tagFilter) {
        elements.push(el);
      }
    }
  }

  return elements;
}

function findFirstElement(parent: XmlElement, predicate: (el: XmlElement) => boolean): XmlElement | undefined {
  for (let i = 0; i < parent.childNodes.length; i += 1) {
    const node = parent.childNodes.item(i);
    if (node && node.nodeType === 1) {
      const el = node as XmlElement;
      if (predicate(el)) {
        return el;
      }
    }
  }

  return undefined;
}

function readNumberAttr(el: XmlElement, name: string): number | undefined {
  const raw = el.getAttribute(name);
  if (raw === null || raw === undefined) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isNaN(value) ? undefined : value;
}

function readFirstChildText(parent: XmlElement, tagName: string): string | undefined {
  const child = findFirstElement(parent, (el) => el.tagName === tagName);
  if (!child) {
    return undefined;
  }
  return child.textContent?.trim() || undefined;
}

function collectAttributes(el: XmlElement): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (let i = 0; i < el.attributes.length; i += 1) {
    const attr = el.attributes.item(i);
    if (attr) {
      result[attr.name] = attr.value ?? undefined;
    }
  }

  return result;
}

function collectConfigProperties(el: XmlElement): ConfigProperty[] {
  const properties: ConfigProperty[] = [];

  for (let i = 0; i < el.childNodes.length; i += 1) {
    const node = el.childNodes.item(i);
    if (node && node.nodeType === 1) {
      const child = node as XmlElement;
      if (child.tagName === "config-property") {
        const key = child.getAttribute("key");
        const value = child.getAttribute("value");
        if (key !== null) {
          properties.push({ key, value: value ?? "", sourceLocation: getSourceLocation(child) });
        }
      }
    }
  }

  return properties;
}

function collectKeyBindings(el: XmlElement): KeyBinding[] {
  const bindings: KeyBinding[] = [];

  for (let i = 0; i < el.childNodes.length; i += 1) {
    const node = el.childNodes.item(i);
    if (node && node.nodeType === 1) {
      const child = node as XmlElement;
      if (child.tagName === "key-binding") {
        const key = child.getAttribute("key");
        const alias = child.getAttribute("alias");
        if (key !== null) {
          bindings.push({ key, alias: alias ?? "", sourceLocation: getSourceLocation(child) });
        }
      }
    }
  }

  return bindings;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function deriveTransitionLabel(el: XmlElement): string | undefined {
  return (
    el.getAttribute("source-connector") ||
    el.getAttribute("target-connector") ||
    el.getAttribute("condition-key") ||
    el.getAttribute("name") ||
    undefined
  );
}

function parseTransitionDisplay(transitionEl: XmlElement): TransitionDisplay | undefined {
  const displayEl = findFirstElement(transitionEl, (el) => el.tagName === "transition-display");
  if (!displayEl) {
    return undefined;
  }

  const bendPoints: BendPoint[] = [];

  for (const child of getElementChildren(displayEl, "bend-point")) {
    const relativeTo = child.getAttribute("relative-to");
    const x = readNumberAttr(child, "x");
    const y = readNumberAttr(child, "y");

    if ((relativeTo === "source" || relativeTo === "target") && x !== undefined && y !== undefined) {
      bendPoints.push({
        relativeTo,
        x,
        y,
      });
    }
  }

  return bendPoints.length > 0 ? { bendPoints } : undefined;
}

function stripExtension(fileName: string): string {
  const parts = fileName.split("/").pop();
  if (!parts) {
    return fileName;
  }
  const lastDot = parts.lastIndexOf(".");
  return lastDot > 0 ? parts.slice(0, lastDot) : parts;
}

function getSourceLocation(el: XmlElement): SourceLocation | undefined {
  const lineNumber = (el as unknown as { lineNumber?: number }).lineNumber;
  const columnNumber = (el as unknown as { columnNumber?: number }).columnNumber;

  if (typeof lineNumber === "number" && lineNumber > 0) {
    return {
      line: lineNumber,
      column: typeof columnNumber === "number" ? columnNumber : undefined,
    };
  }
  return undefined;
}
