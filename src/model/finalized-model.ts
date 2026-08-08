import type { LocalAxes } from "../geometry/local-axes.js";
import type { ElasticGeometry } from "../geometry/rigid-offset.js";
import type { UnitSystem } from "../units/unit-system.js";
import type {
  CombinationRecord,
  ConstraintRecord,
  FrameRecord,
  FrameSectionRecord,
  LoadCaseRecord,
  MaterialRecord,
  ModelSnapshot,
  NodeRecord,
  SpringRecord,
  TrussRecord,
  TrussSectionRecord,
} from "./domain-records.js";
import type { LoadContributionProvenance, ResolvedLoadRecord } from "../loads/load-types.js";
import type { PhysicalDofTable } from "./dof-topology.js";
import type { EntityId } from "./identifier.js";

type Tuple3 = readonly [number, number, number];
type Tuple9 = readonly [number, number, number, number, number, number, number, number, number];

export interface FrozenElasticGeometry extends Omit<
  ElasticGeometry,
  "referenceStart" | "referenceEnd" | "startOffset" | "endOffset" | "elasticStart" | "elasticEnd"
> {
  readonly referenceStart: Tuple3;
  readonly referenceEnd: Tuple3;
  readonly startOffset: Tuple3;
  readonly endOffset: Tuple3;
  readonly elasticStart: Tuple3;
  readonly elasticEnd: Tuple3;
}

export interface FrozenLocalAxes extends Omit<
  LocalAxes,
  "x" | "y" | "z" | "globalToLocal" | "localToGlobal"
> {
  readonly x: Tuple3;
  readonly y: Tuple3;
  readonly z: Tuple3;
  readonly globalToLocal: Tuple9;
  readonly localToGlobal: Tuple9;
}

export interface ResolvedFrameRecord {
  readonly record: FrameRecord;
  readonly startNode: NodeRecord;
  readonly endNode: NodeRecord;
  readonly material: MaterialRecord;
  readonly section: FrameSectionRecord;
  readonly geometry: FrozenElasticGeometry;
  readonly axes: FrozenLocalAxes;
}

export interface ResolvedTrussRecord {
  readonly record: TrussRecord;
  readonly startNode: NodeRecord;
  readonly endNode: NodeRecord;
  readonly material: MaterialRecord;
  readonly section: TrussSectionRecord;
  readonly geometry: FrozenElasticGeometry;
  readonly direction: Tuple3;
}

export interface ResolvedSpringRecord {
  readonly record: SpringRecord;
  readonly startNode: NodeRecord;
  readonly endNode?: NodeRecord;
}

export interface FinalizedLoadCaseRecord extends Omit<LoadCaseRecord, "loads"> {
  readonly loads: readonly ResolvedLoadRecord[];
  readonly provenance: readonly LoadContributionProvenance[];
  readonly compatibilityKey: string;
}

export interface FinalizedModel extends Omit<ModelSnapshot, "loadCases"> {
  readonly unitSystem: UnitSystem;
  readonly finalized: true;
  readonly nodes: readonly NodeRecord[];
  readonly materials: readonly MaterialRecord[];
  readonly frameSections: readonly FrameSectionRecord[];
  readonly trussSections: readonly TrussSectionRecord[];
  readonly frames: readonly FrameRecord[];
  readonly trusses: readonly TrussRecord[];
  readonly springs: readonly SpringRecord[];
  readonly constraints: readonly ConstraintRecord[];
  readonly loadCases: readonly FinalizedLoadCaseRecord[];
  readonly combinations: readonly CombinationRecord[];
  readonly resolvedFrames: readonly ResolvedFrameRecord[];
  readonly resolvedTrusses: readonly ResolvedTrussRecord[];
  readonly resolvedSprings: readonly ResolvedSpringRecord[];
  readonly physicalDofs: PhysicalDofTable;
  readonly fingerprint: string;
  readonly combinationEvaluationOrder: readonly EntityId[];
}
