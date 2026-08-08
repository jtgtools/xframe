import type { CompiledConstraints } from "../constraints/compile-constraints.js";
import { XFrameError } from "../errors/xframe-error.js";
import { computeResidualDiagnostics } from "../linalg/residual.js";
import type { SkylineCholeskyFactor } from "../linalg/skyline-cholesky.js";
import type { SymmetricCoordinateMatrix } from "../linalg/symmetric-coordinate-matrix.js";
import type { FinalizedModel } from "../model/finalized-model.js";
import type { CaseResult } from "../results/result-types.js";
import { createCaseResult } from "../results/result-factory.js";
import { assembleLoadCase } from "./assemble-load-case.js";

export type CaseSolution = CaseResult;

export interface AnalysisStatistics {
  readonly assemblyCount: number;
  readonly factorizationCount: number;
  readonly solveCount: number;
  readonly fullNonzeros: number;
  readonly reducedNonzeros: number;
  readonly skylineStorage: number;
  readonly skylineMaximumRowWidth: number;
  readonly skylineBandwidth: number;
}

export class PreparedAnalysis {
  public readonly model: FinalizedModel;
  public readonly fullStiffness: SymmetricCoordinateMatrix;
  public readonly reducedStiffness: SymmetricCoordinateMatrix;
  public readonly constraints: CompiledConstraints;
  public readonly factor: SkylineCholeskyFactor;
  readonly #skylineStorage: number;
  readonly #skylineMaximumRowWidth: number;
  readonly #skylineBandwidth: number;
  #solveCount = 0;

  public constructor(
    model: FinalizedModel,
    fullStiffness: SymmetricCoordinateMatrix,
    reducedStiffness: SymmetricCoordinateMatrix,
    constraints: CompiledConstraints,
    factor: SkylineCholeskyFactor,
    skylineStorage: number,
    skylineMaximumRowWidth: number,
    skylineBandwidth: number,
  ) {
    this.model = model;
    this.fullStiffness = fullStiffness;
    this.reducedStiffness = reducedStiffness;
    this.constraints = constraints;
    this.factor = factor;
    this.#skylineStorage = skylineStorage;
    this.#skylineMaximumRowWidth = skylineMaximumRowWidth;
    this.#skylineBandwidth = skylineBandwidth;
  }

  public get statistics(): AnalysisStatistics {
    return Object.freeze({
      assemblyCount: 1,
      factorizationCount: 1,
      solveCount: this.#solveCount,
      fullNonzeros: [...this.fullStiffness.entries()].length,
      reducedNonzeros: [...this.reducedStiffness.entries()].length,
      skylineStorage: this.#skylineStorage,
      skylineMaximumRowWidth: this.#skylineMaximumRowWidth,
      skylineBandwidth: this.#skylineBandwidth,
    });
  }

  public solveCase(id: string): CaseResult {
    const loadCase = this.model.loadCases.find((entry) => entry.id === id);
    if (loadCase === undefined) {
      throw new XFrameError(
        "REFERENCE_NOT_FOUND",
        "Load case does not exist in the finalized model.",
        {
          kind: "reference",
          issues: [
            {
              entityType: "analysis",
              id: this.model.fingerprint,
              path: "loadCaseId",
              referencedId: id,
              expectedType: "load case",
            },
          ],
        },
      );
    }
    const assembled = assembleLoadCase(this.model, loadCase, this.fullStiffness, this.constraints);
    const reducedDisplacements = this.factor.solve(assembled.reducedLoad);
    const fullDisplacements = this.constraints.recover(reducedDisplacements);
    const internal = this.fullStiffness.multiply(fullDisplacements);
    const fullResidual = new Float64Array(this.fullStiffness.size);
    for (let index = 0; index < fullResidual.length; index += 1) {
      fullResidual[index] = internal[index]! - assembled.fullLoad[index]!;
    }
    const residual = computeResidualDiagnostics(
      this.reducedStiffness,
      reducedDisplacements,
      assembled.reducedLoad,
    );
    this.#solveCount += 1;
    const statistics = this.statistics;
    return createCaseResult({
      model: this.model,
      loadCase,
      fullDisplacements,
      reducedDisplacements,
      fullLoad: assembled.fullLoad,
      fullResidual,
      reducedLoad: assembled.reducedLoad,
      residual,
      fullStiffness: this.fullStiffness,
      reducedStiffness: this.reducedStiffness,
      factor: this.factor,
      fullNonzeros: statistics.fullNonzeros,
      reducedNonzeros: statistics.reducedNonzeros,
      skylineStorage: statistics.skylineStorage,
      skylineMaximumRowWidth: statistics.skylineMaximumRowWidth,
      skylineBandwidth: statistics.skylineBandwidth,
    });
  }

  public solveCases(ids: readonly string[]): readonly CaseResult[] {
    return Object.freeze(ids.map((id) => this.solveCase(id)));
  }
}
