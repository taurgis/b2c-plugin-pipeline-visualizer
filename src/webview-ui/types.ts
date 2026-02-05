/**
 * Type declarations for the ASCII pipeline previewer
 */

export interface SourceLocation {
  line: number;
  column?: number;
}

export interface ConfigProperty {
  key: string;
  value: string;
  sourceLocation?: SourceLocation;
}

export interface Binding {
  key: string;
  alias: string | null;
  sourceLocation?: SourceLocation;
}

export interface Template {
  name: string;
  buffered?: boolean;
  dynamic?: boolean;
}

export interface NodePosition {
  x?: number;
  y?: number;
  orientation?: string;
}

export interface PipelineNode {
  id: string;
  label: string;
  type: string;
  branch: string;
  attributes: Record<string, string>;
  configProperties: ConfigProperty[];
  bindings: Binding[];
  template: Template | null;
  description: string | null;
  position?: NodePosition;
  sourceLocation?: SourceLocation;
}

export interface PlacedNode extends PipelineNode {
  x: number;
  y: number;
  orientation?: string | null;
  gridX?: number;
  gridY?: number;
}

export interface PipelineEdge {
  from: string;
  to: string;
  label?: string;
  sourceConnector?: string;
  targetConnector?: string;
  display?: {
    bendPoints?: BendPoint[];
  };
  sourceLocation?: SourceLocation;
}

export interface BendPoint {
  x: number;
  y: number;
  relativeTo?: "source" | "target";
}

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  maxX: number;
  maxY: number;
}

export interface SideDetermination {
  outSide: "top" | "bottom" | "left" | "right";
  inSide: "top" | "bottom" | "left" | "right";
  blockingNode: PlacedNode | null;
}
