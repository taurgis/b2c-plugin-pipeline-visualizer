/**
 * Source location in the XML file for deep linking
 */
export interface SourceLocation {
  line: number;
  column?: number;
}

export type PipelineNodeType =
  | "start"
  | "end"
  | "pipelet"
  | "call"
  | "jump"
  | "interaction"
  | "decision"
  | "join"
  | "loop"
  | "text"
  | "unknown";

/**
 * Represents a key binding within a pipelet node
 */
export interface KeyBinding {
  key: string;
  alias: string;
  sourceLocation?: SourceLocation;
}

/**
 * Represents a config property within a pipelet node
 */
export interface ConfigProperty {
  key: string;
  value: string;
  sourceLocation?: SourceLocation;
}

/**
 * Represents a template configuration in interaction nodes
 */
export interface TemplateConfig {
  name: string;
  buffered?: boolean;
  dynamic?: boolean;
}

export interface PipelineNode {
  id: string;
  label: string;
  type: PipelineNodeType;
  branch: string;
  attributes: Record<string, string | undefined>;
  configProperties?: ConfigProperty[];
  bindings?: KeyBinding[];
  template?: TemplateConfig;
  description?: string;
  position?: {
    x?: number;
    y?: number;
    width?: number;
    orientation?: string;
  };
  sourceLocation?: SourceLocation;
}

/**
 * Represents a bend point in a transition line
 */
export interface BendPoint {
  relativeTo: "source" | "target";
  x: number;
  y: number;
}

/**
 * Represents additional display information for a transition
 */
export interface TransitionDisplay {
  bendPoints: BendPoint[];
}

export interface PipelineEdge {
  from: string;
  to: string;
  label?: string;
  sourceConnector?: string;
  targetConnector?: string;
  display?: TransitionDisplay;
  sourceLocation?: SourceLocation;
}

export interface ParsedPipeline {
  name: string;
  group?: string;
  type?: string;
  description?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}
