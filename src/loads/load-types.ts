import type { EntityId } from "../model/identifier.js";

export type LoadVectorInput = readonly [number, number, number] | readonly number[];
export type LoadVector = readonly [number, number, number];
export type CoordinateSystem = "local" | "global";

export interface NodalLoadInput {
  readonly kind: "nodal";
  readonly nodeId: unknown;
  readonly force?: LoadVectorInput;
  readonly moment?: LoadVectorInput;
}

interface MemberPointBaseInput {
  readonly frameId: unknown;
  readonly coordinateSystem: CoordinateSystem;
  readonly distanceFromElasticStart?: number;
  readonly positionRatio?: number;
}

export interface MemberPointForceInput extends MemberPointBaseInput {
  readonly kind: "member-point-force";
  readonly force: LoadVectorInput;
}

export interface MemberPointMomentInput extends MemberPointBaseInput {
  readonly kind: "member-point-moment";
  readonly moment: LoadVectorInput;
}

export type MemberPointLoadInput = MemberPointForceInput | MemberPointMomentInput;

export interface DistributedLoadInput {
  readonly kind: "member-distributed";
  readonly frameId: unknown;
  readonly coordinateSystem: CoordinateSystem;
  readonly startDistanceFromElasticStart?: number;
  readonly endDistanceFromElasticStart?: number;
  readonly startPositionRatio?: number;
  readonly endPositionRatio?: number;
  readonly startIntensity: LoadVectorInput;
  readonly endIntensity: LoadVectorInput;
}

export interface SelfWeightLoadInput {
  readonly kind: "self-weight";
  readonly gravity: LoadVectorInput;
  readonly frameIds?: readonly unknown[];
  readonly trussIds?: readonly unknown[];
}

export type LoadInput = NodalLoadInput | MemberPointLoadInput | DistributedLoadInput | SelfWeightLoadInput;

export interface NodalLoadRecord {
  readonly kind: "nodal";
  readonly nodeId: EntityId;
  readonly force?: LoadVector;
  readonly moment?: LoadVector;
}

export type MemberLocation =
  | { readonly kind: "distance"; readonly distanceFromElasticStart: number }
  | { readonly kind: "ratio"; readonly positionRatio: number };

export interface MemberPointForceRecord {
  readonly kind: "member-point-force";
  readonly frameId: EntityId;
  readonly coordinateSystem: CoordinateSystem;
  readonly location: MemberLocation;
  readonly force: LoadVector;
}

export interface MemberPointMomentRecord {
  readonly kind: "member-point-moment";
  readonly frameId: EntityId;
  readonly coordinateSystem: CoordinateSystem;
  readonly location: MemberLocation;
  readonly moment: LoadVector;
}

export type MemberPointLoadRecord = MemberPointForceRecord | MemberPointMomentRecord;

export type MemberSpan =
  | { readonly kind: "full" }
  | {
      readonly kind: "distance";
      readonly startDistanceFromElasticStart: number;
      readonly endDistanceFromElasticStart: number;
    }
  | { readonly kind: "ratio"; readonly startPositionRatio: number; readonly endPositionRatio: number };

export interface DistributedLoadRecord {
  readonly kind: "member-distributed";
  readonly frameId: EntityId;
  readonly coordinateSystem: CoordinateSystem;
  readonly span: MemberSpan;
  readonly startIntensity: LoadVector;
  readonly endIntensity: LoadVector;
}

export interface SelfWeightLoadRecord {
  readonly kind: "self-weight";
  readonly gravity: LoadVector;
  readonly frameIds?: readonly EntityId[];
  readonly trussIds?: readonly EntityId[];
}

export type LoadRecord = NodalLoadRecord | MemberPointLoadRecord | DistributedLoadRecord | SelfWeightLoadRecord;

export interface ResolvedMemberPointForceLoad {
  readonly kind: "member-point-force";
  readonly frameId: EntityId;
  readonly coordinateSystem: CoordinateSystem;
  readonly distanceFromElasticStart: number;
  readonly force: LoadVector;
  readonly sourceLocation: MemberLocation;
}

export interface ResolvedMemberPointMomentLoad {
  readonly kind: "member-point-moment";
  readonly frameId: EntityId;
  readonly coordinateSystem: CoordinateSystem;
  readonly distanceFromElasticStart: number;
  readonly moment: LoadVector;
  readonly sourceLocation: MemberLocation;
}

export interface ResolvedDistributedLoad {
  readonly kind: "member-distributed";
  readonly frameId: EntityId;
  readonly coordinateSystem: CoordinateSystem;
  readonly startDistanceFromElasticStart: number;
  readonly endDistanceFromElasticStart: number;
  readonly startIntensity: LoadVector;
  readonly endIntensity: LoadVector;
  readonly sourceSpan: MemberSpan;
  readonly discontinuities: readonly [number, number];
}

export interface ResolvedSelfWeightLoad {
  readonly kind: "self-weight";
  readonly gravity: LoadVector;
  readonly frameIds: readonly EntityId[];
  readonly trussIds: readonly EntityId[];
}

export type ResolvedLoadRecord =
  | NodalLoadRecord
  | ResolvedMemberPointForceLoad
  | ResolvedMemberPointMomentLoad
  | ResolvedDistributedLoad
  | ResolvedSelfWeightLoad;

export interface LoadContributionProvenance {
  readonly loadCaseId: EntityId;
  readonly loadIndex: number;
  readonly kind: ResolvedLoadRecord["kind"];
  readonly targetIds: readonly EntityId[];
}
