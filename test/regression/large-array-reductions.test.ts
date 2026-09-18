import { describe, expect, it } from "vitest";
import { analyzeConstraintRank } from "../../src/constraints/constraint-rank.js";
import { canonicalizeConstraint } from "../../src/constraints/canonicalize-constraint.js";
import { compileConstraints } from "../../src/constraints/compile-constraints.js";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { reverseCuthillMcKee } from "../../src/linalg/reverse-cuthill-mckee.js";
import { maximumSkylineRowWidth } from "../../src/linalg/skyline-profile.js";

const TERM_COUNT = 250_000;

describe("large array reductions", () => {
  it("canonicalizes and ranks one sparse row with 250000 unique terms", () => {
    const terms = Array.from({ length: TERM_COUNT }, (_, dof) => ({
      dof,
      coefficient: dof % 2 === 0 ? 1 : -1,
    }));
    const canonical = canonicalizeConstraint({ sourceId: "wide", terms, rightHandSide: 0 });
    expect(canonical.terms.length).toBe(TERM_COUNT);
    const analysis = analyzeConstraintRank([canonical]);
    expect(analysis.rank).toBe(1);
    expect(analysis.rows[0]!.pivotDof).toBe(0);
    expect(analysis.rows[0]!.coefficients.size).toBe(TERM_COUNT);
    expect(analysis.redundantSourceIds).toEqual([]);
  });

  it("reports an equal-DOF cycle of 250000 terms as CONSTRAINT_CYCLE", () => {
    const size = TERM_COUNT / 2;
    const equations = Array.from({ length: size }, (_, index) => ({
      sourceId: `cycle-${index}`,
      terms: [
        { dof: index, coefficient: 1 },
        { dof: (index + 1) % size, coefficient: -1 },
      ],
      rightHandSide: 0,
    }));
    let thrown: unknown;
    try {
      compileConstraints(size, equations);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(XFrameError);
    expect((thrown as XFrameError).code).toBe("CONSTRAINT_CYCLE");
  });

  it("computes the maximum skyline row width over 250000 rows by loop", () => {
    const firstColumns = Array.from({ length: TERM_COUNT }, (_, row) =>
      row % 1024 === 0 ? 0 : row,
    );
    expect(maximumSkylineRowWidth(firstColumns)).toBe(249_857);
  });

  it("reorders a single 250000-node connected component without a native RangeError", () => {
    const adjacency = Array.from({ length: TERM_COUNT }, (_, node) => {
      if (node === 0) return [1];
      if (node === TERM_COUNT - 1) return [TERM_COUNT - 2];
      return [node - 1, node + 1];
    });
    const ordering = reverseCuthillMcKee(adjacency);
    expect(ordering.permutation).toHaveLength(TERM_COUNT);
  });
});
