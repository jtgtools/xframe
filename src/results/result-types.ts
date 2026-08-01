import type { DofName } from "../model/domain-records.js";
import type { EntityId } from "../model/identifier.js";
import type { UnitSystem } from "../units/unit-system.js";

export interface DofValueResult {
  readonly dof: DofName;
  readonly value: number;
}

export interface NodeResult {
  readonly id: EntityId;
  readonly coordinates: readonly [number, number, number];
  readonly displacements: readonly DofValueResult[];
  readonly reactions: readonly DofValueResult[];
}

export interface FrameInternalForceStation {
  readonly x: number;
  readonly side: "single" | "left" | "right";
  readonly axial: number;
  readonly shearY: number;
  readonly shearZ: number;
  readonly torsion: number;
  readonly bendingY: number;
  readonly bendingZ: number;
}

export interface FrameResult {
  readonly id: EntityId;
  readonly localEndDisplacements: readonly number[];
  readonly globalEndDisplacements: readonly number[];
  readonly localEndForces: readonly number[];
  readonly globalEndForces: readonly number[];
  readonly internalForces: readonly FrameInternalForceStation[];
}

export interface TrussElementResult {
  readonly id: EntityId;
  readonly extension: number;
  readonly strain: number;
  readonly axialForce: number;
  readonly globalEndForces: readonly number[];
}

export interface SpringElementResult {
  readonly id: EntityId;
  readonly grounded: boolean;
  readonly globalEndForces: readonly number[];
}

export type DiagnosticStatus = "pass" | "warn" | "fail" | "not-applicable";

export interface CaseDiagnostics {
  readonly status: DiagnosticStatus;
  readonly maximumAbsoluteResidual: number;
  readonly normalizedResidual: number;
  readonly forceEquilibrium: readonly [number, number, number];
  readonly momentEquilibrium: readonly [number, number, number];
  readonly normalizedForceEquilibrium: number;
  readonly normalizedMomentEquilibrium: number;
  readonly strainEnergy: number;
  readonly externalWork: number;
  readonly relativeEnergyError: number;
  readonly minimumNormalizedPivot: number;
  readonly minimumPivotEquation: number;
  readonly equationCount: number;
  readonly fullEquationCount: number;
  readonly fullNonzeros: number;
  readonly reducedNonzeros: number;
  readonly skylineStorage: number;
  readonly skylineMaximumRowWidth: number;
  readonly skylineBandwidth: number;
  readonly assemblyReused: boolean;
  readonly factorizationReused: boolean;
}

export interface ResultConventions {
  readonly coordinateSystem: "global-node-local-member";
  readonly rotations: "radians-right-hand-rule";
  readonly frameEndForces: "element-on-node";
  readonly internalForces: "positive-local-cut-face";
}

interface StructuralResultBase {
  readonly id: EntityId;
  readonly modelFingerprint: string;
  readonly unitSystem: UnitSystem;
  readonly conventions: ResultConventions;
  readonly fullDisplacements: readonly number[];
  readonly reducedDisplacements: readonly number[];
  readonly fullLoad: readonly number[];
  readonly fullResidual: readonly number[];
  readonly nodes: readonly NodeResult[];
  readonly frames: readonly FrameResult[];
  readonly trusses: readonly TrussElementResult[];
  readonly springs: readonly SpringElementResult[];
  readonly diagnostics: CaseDiagnostics;
}

export interface CaseResult extends StructuralResultBase {
  readonly kind: "case";
  readonly provenance: readonly {
    readonly loadIndex: number;
    readonly kind: string;
    readonly targetIds: readonly EntityId[];
  }[];
}

export interface CombinationResult extends StructuralResultBase {
  readonly kind: "combination";
  readonly factors: readonly { readonly resultId: EntityId; readonly factor: number }[];
}

export type StructuralResult = CaseResult | CombinationResult;

export interface EnvelopeComponent {
  readonly component: string;
  readonly entityId: string;
  readonly location?: number;
}

export interface EnvelopeCompatibility {
  readonly modelFingerprint: string;
  readonly unitSystem: UnitSystem;
  readonly conventions: ResultConventions;
  readonly components: readonly EnvelopeComponent[];
}

export interface EnvelopeInputRecord {
  readonly resultId: string;
  readonly resultKind: StructuralResult["kind"];
  readonly compatibility: EnvelopeCompatibility;
  readonly values: ArrayLike<number>;
}

export interface EnvelopeGoverning {
  readonly resultId: EntityId;
  readonly resultKind: StructuralResult["kind"];
  readonly component: string;
  readonly entityId: string;
  readonly location?: number;
  readonly extremum: "minimum" | "maximum";
}

export interface EnvelopeExtreme {
  readonly value: number;
  readonly governing: readonly EnvelopeGoverning[];
}

export interface StreamingEnvelope {
  readonly count: number;
  readonly components: readonly EnvelopeComponent[];
  readonly minimum: readonly EnvelopeExtreme[];
  readonly maximum: readonly EnvelopeExtreme[];
}
