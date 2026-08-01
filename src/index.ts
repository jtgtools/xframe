/** Package version. Schema compatibility is controlled separately by schemaVersion. */
export const XFRAME_VERSION = "0.0.1";

export { XFRAME_ERROR_CODES } from "./errors/error-code.js";
export type { XFrameErrorCode } from "./errors/error-code.js";
export type { XFrameErrorContext } from "./errors/error-context.js";
export { XFrameError } from "./errors/xframe-error.js";

export { createModelBuilder } from "./model/model-builder.js";
export type { ModelBatchInput, ModelBuilder, RigidDiaphragmInput } from "./model/model-builder.js";
export type {
  CombinationInput,
  ConstraintInput,
  ConstraintTermInput,
  DofName,
  FrameInput,
  FrameReleaseInput,
  FrameSectionInput,
  FrameTheoryInput,
  LoadCaseInput,
  MaterialInput,
  NodeInput,
  RigidOffsetInput,
  SpringInput,
  TrussInput,
  TrussSectionInput,
} from "./model/domain-records.js";
export type { FinalizedModel } from "./model/finalized-model.js";
export type {
  DistributedLoadInput,
  LoadInput,
  MemberPointForceInput,
  MemberPointMomentInput,
  NodalLoadInput,
  SelfWeightLoadInput,
} from "./loads/load-types.js";
export type { UnitSystem } from "./units/unit-system.js";

export { prepareAnalysis } from "./analysis/prepare-analysis.js";
export type { PrepareAnalysisOptions } from "./analysis/prepare-analysis.js";
export { PreparedAnalysis } from "./analysis/prepared-analysis.js";
export type { AnalysisStatistics, CaseSolution } from "./analysis/prepared-analysis.js";

export { combineResults } from "./results/combine-results.js";
export type { ResultFactor } from "./results/combine-results.js";
export { createEnvelopeCompatibility, streamEnvelope } from "./results/stream-envelope.js";
export type {
  CaseDiagnostics,
  CaseResult,
  CombinationResult,
  EnvelopeCompatibility,
  EnvelopeComponent,
  EnvelopeExtreme,
  EnvelopeGoverning,
  EnvelopeInputRecord,
  FrameInternalForceStation,
  FrameResult,
  NodeResult,
  ResultConventions,
  SpringElementResult,
  StreamingEnvelope,
  StructuralResult,
  TrussElementResult,
} from "./results/result-types.js";

export { canonicalJson } from "./serialization/canonical-json.js";
export { artifactHash } from "./serialization/artifact-hash.js";
export { MODEL_SCHEMA_VERSION, modelToJsonValue } from "./serialization/model-schema.js";
export type { ModelJsonV1 } from "./serialization/model-schema.js";
export { parseModelJson } from "./serialization/parse-model-json.js";
export { RESULT_SCHEMA_VERSION, resultToJsonValue } from "./serialization/result-schema.js";
export type { ResultJsonV1 } from "./serialization/result-schema.js";
export { parseResultJson } from "./serialization/parse-result-json.js";
