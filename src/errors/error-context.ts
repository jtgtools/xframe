export interface InputErrorContext {
  readonly kind: "input";
  readonly path: string;
  readonly expected: string;
  readonly actual?: string;
}

export interface IdentifierErrorContext {
  readonly kind: "identifier";
  readonly path: string;
  readonly reason:
    | "type"
    | "empty"
    | "whitespace"
    | "control-character"
    | "formula-prefix"
    | "too-long";
  readonly value?: string;
  readonly maximumCodePoints?: number;
}

export interface DuplicateIdentifierContext {
  readonly kind: "duplicate-identifier";
  readonly entityType: string;
  readonly id: string;
}

export interface ReferenceIssueContext {
  readonly entityType: string;
  readonly id: string;
  readonly path: string;
  readonly referencedId: string;
  readonly expectedType: string;
}

export interface ReferenceErrorContext {
  readonly kind: "reference";
  readonly issues: readonly ReferenceIssueContext[];
}

export interface NumericErrorContext {
  readonly kind: "numeric";
  readonly path: string;
  readonly value: string;
  readonly expected: string;
}

export interface UnitErrorContext {
  readonly kind: "units";
  readonly path: string;
  readonly reason: string;
  readonly expectedKeys?: readonly string[];
  readonly actualKeys?: readonly string[];
  readonly actual?: string;
}

export interface GeometryErrorContext {
  readonly kind: "geometry";
  readonly path: string;
  readonly reason: string;
  readonly value?: string;
  readonly referenceScale?: number;
}

export interface MaterialDependencyErrorContext {
  readonly kind: "material-dependency";
  readonly loadCaseId: string;
  readonly missingMaterialIds: readonly string[];
  readonly affectedElementIds: readonly string[];
  readonly reason: string;
}

export interface MemoryErrorContext {
  readonly kind: "memory";
  readonly operation: string;
  readonly estimatedBytes: number;
  readonly limitBytes: number;
}

export interface AnalysisErrorContext {
  readonly kind: "analysis";
  readonly stage: string;
  readonly detail: string;
  readonly entityId?: string;
  readonly equation?: number;
  readonly violation?: "constant" | "transform-column";
  readonly normalizedResidual?: number;
  readonly tolerance?: number;
  readonly dof?: number;
}

export interface SchemaErrorContext {
  readonly kind: "schema";
  readonly path: string;
  readonly expected: string;
  readonly actual?: string;
  readonly schemaVersion?: string;
}

export interface ResultErrorContext {
  readonly kind: "result";
  readonly resultIds: readonly string[];
  readonly reason: string;
}

export interface UnsupportedFeatureContext {
  readonly kind: "unsupported-feature";
  readonly feature: string;
  readonly reason: string;
}

export type XFrameErrorContext =
  | InputErrorContext
  | IdentifierErrorContext
  | DuplicateIdentifierContext
  | ReferenceErrorContext
  | NumericErrorContext
  | UnitErrorContext
  | GeometryErrorContext
  | MaterialDependencyErrorContext
  | MemoryErrorContext
  | AnalysisErrorContext
  | SchemaErrorContext
  | ResultErrorContext
  | UnsupportedFeatureContext;

export interface CauseSummary {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
}
