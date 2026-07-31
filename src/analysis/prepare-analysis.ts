import { XFrameError } from "../errors/xframe-error.js";
import { buildAdjacency } from "../linalg/adjacency.js";
import { reverseCuthillMcKee } from "../linalg/reverse-cuthill-mckee.js";
import { factorSkylineCholesky } from "../linalg/skyline-cholesky.js";
import { createSkylineProfile } from "../linalg/skyline-profile.js";
import type { FinalizedModel } from "../model/finalized-model.js";
import { assembleStiffness } from "./assemble-stiffness.js";
import { PreparedAnalysis } from "./prepared-analysis.js";

export interface PrepareAnalysisOptions {
  readonly skylineMemoryLimitBytes?: number;
}

export function prepareAnalysis(model: FinalizedModel, options: PrepareAnalysisOptions = {}): PreparedAnalysis {
  const assembled = assembleStiffness(model);
  const ordering = reverseCuthillMcKee(buildAdjacency(assembled.reduced));
  const profile = createSkylineProfile(assembled.reduced, ordering, options.skylineMemoryLimitBytes);
  try {
    const factor = factorSkylineCholesky(profile);
    const maximumRowWidth = Math.max(0, ...profile.firstColumns.map((first, row) => row - first + 1));
    return new PreparedAnalysis(
      model,
      assembled.full,
      assembled.reduced,
      assembled.constraints,
      factor,
      profile.storageCount,
      maximumRowWidth,
      maximumRowWidth,
    );
  } catch (error) {
    if (error instanceof XFrameError && error.code === "FACTORIZATION_FAILED") {
      const equation = error.context.kind === "analysis" ? error.context.equation : undefined;
      throw new XFrameError("GLOBAL_MECHANISM", "The reduced structural stiffness is singular or not positive definite.", {
        kind: "analysis",
        stage: "global-factorization",
        detail: error.message,
        ...(equation === undefined ? {} : { equation }),
      }, { cause: error });
    }
    throw error;
  }
}
