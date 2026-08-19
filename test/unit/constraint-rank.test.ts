import { describe, expect, it } from "vitest";
import { analyzeConstraintRank } from "../../src/constraints/constraint-rank.js";
import { canonicalizeConstraint } from "../../src/constraints/canonicalize-constraint.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

const equation = (sourceId: string, coefficients: readonly number[], rhs: number) =>
  canonicalizeConstraint({
    sourceId,
    terms: coefficients.flatMap((coefficient, dof) =>
      coefficient === 0 ? [] : [{ dof, coefficient }],
    ),
    rightHandSide: rhs,
  });

const numericRows = (result: ReturnType<typeof analyzeConstraintRank>) =>
  result.rows.map((row) => ({
    pivotDof: row.pivotDof,
    coefficients: [...row.coefficients.entries()],
    rightHandSide: row.rightHandSide,
  }));

describe("constraint rank", () => {
  it("FR-CON-002: identifies independent pivots and harmless redundancy", () => {
    const result = analyzeConstraintRank([
      equation("c1", [1, -1, 0], 0),
      equation("c2", [0, 1, -1], 0),
      equation("c3", [1, 0, -1], 0),
    ]);
    expect(result.rank).toBe(2);
    expect(result.redundantSourceIds).toEqual(["c3"]);
  });

  it("FR-CON-002: rejects conflicting dependent right-hand sides", () => {
    expect(() =>
      analyzeConstraintRank([equation("c1", [1, -1], 0), equation("c2", [2, -2], 1)]),
    ).toThrow(XFrameError);
  });

  it("FR-CON-002: classifies valid canonical zero-identity rows as redundant", () => {
    const zero = equation("zero", [], 0);
    const identityOnly = analyzeConstraintRank([zero]);
    expect(identityOnly.rank).toBe(0);
    expect(identityOnly.rows).toEqual([]);
    expect(identityOnly.redundantSourceIds).toEqual(["zero"]);

    const fix = equation("fix", [1], 2);
    for (const equations of [
      [zero, fix],
      [fix, zero],
    ]) {
      const mixed = analyzeConstraintRank(equations);
      expect(mixed.rank).toBe(1);
      expect(mixed.rows[0]!.pivotDof).toBe(0);
      expect(mixed.rows[0]!.sourceId).toBe("fix");
      expect(mixed.rows[0]!.rightHandSide).toBe(2);
      expect(mixed.redundantSourceIds).toEqual(["zero"]);
    }
  });

  it("FR-CON-002: empty constraint with nonzero RHS fails closed as a contradiction", () => {
    let thrown: unknown;
    try {
      analyzeConstraintRank([{ sourceId: "bad", terms: [], rightHandSide: 1 }]);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(XFrameError);
    expect((thrown as XFrameError).code).toBe("CONSTRAINT_CONTRADICTION");
    expect((thrown as XFrameError).context).toMatchObject({
      kind: "analysis",
      stage: "constraint-rank",
      entityId: "bad",
    });
  });

  it.each([1e-300, -1e-300, 1e300, -1e300])(
    "FR-SAFE-003: retains independent rows after small coefficient cancellation at scale %s",
    (scale) => {
      const result = analyzeConstraintRank([
        equation("a", [scale, scale * 2e-14], 0),
        equation("b", [scale, scale * 3e-14], 0),
      ]);
      expect(result.rank).toBe(2);
      expect(result.redundantSourceIds).toEqual([]);
      expect(result.rows.map(({ pivotDof }) => pivotDof)).toEqual([0, 1]);
    },
  );

  it.each([1e-300, -1e-300, 1e300, -1e300])(
    "FR-SAFE-003: reports a scaled contradictory dependent row at scale %s",
    (scale) => {
      let thrown: unknown;
      try {
        analyzeConstraintRank([
          equation("a", [scale, scale * 2e-14], scale * 1e-14),
          equation("b", [scale, scale * 2e-14], scale * 2e-14),
        ]);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(XFrameError);
      const context = (thrown as XFrameError).context;
      expect(context).toMatchObject({ kind: "analysis", entityId: "b" });
    },
  );

  it("XF-001: pivot strength beats minimum DOF", () => {
    const result = analyzeConstraintRank([equation("strong", [1e-12, 1], 0)]);
    expect(result.rank).toBe(1);
    expect(result.rows[0]!.pivotDof).toBe(1);
  });

  it("XF-001: source-ID rename invariance preserves the numeric echelon", () => {
    const base = analyzeConstraintRank([
      equation("c1", [1, -1, 0], 0),
      equation("c2", [0, 1, -1], 0),
      equation("c3", [1, 0, -1], 0),
    ]);
    const renamed = analyzeConstraintRank([
      equation("cc-100", [1, -1, 0], 0),
      equation("cc-099", [0, 1, -1], 0),
      equation("cc-101", [1, 0, -1], 0),
    ]);
    expect(renamed.rank).toBe(base.rank);
    expect(numericRows(renamed)).toEqual(numericRows(base));
    expect(renamed.redundantSourceIds).toEqual(["cc-101"]);
  });

  it("XF-001: equation-order invariance preserves the numeric echelon", () => {
    const equations = [
      equation("c1", [1, -1, 0], 0),
      equation("c2", [0, 1, -1], 0),
      equation("c3", [1, 0, -1], 0),
    ];
    const forward = analyzeConstraintRank(equations);
    const reversed = analyzeConstraintRank(equations.toReversed());
    expect(reversed.rank).toBe(forward.rank);
    expect(numericRows(reversed)).toEqual(numericRows(forward));
    expect(reversed.redundantSourceIds).toEqual(forward.redundantSourceIds);
  });

  it.each([7, -3, 1e-6, 1e6, -1])("XF-001: row scale and sign invariance at scale %s", (scale) => {
    const base = analyzeConstraintRank([
      equation("c1", [1, -1, 0], 0),
      equation("c2", [0, 1, -1], 0),
      equation("c3", [1, 0, -1], 0),
    ]);
    const scaled = analyzeConstraintRank([
      equation("c1", [scale, -scale, 0], 0),
      equation("c2", [0, scale, -scale], 0),
      equation("c3", [scale, 0, -scale], 0),
    ]);
    expect(scaled.rank).toBe(base.rank);
    expect(numericRows(scaled)).toEqual(numericRows(base));
    expect(scaled.redundantSourceIds).toEqual(base.redundantSourceIds);
  });

  it("XF-001: sparse-row tie at equal pivot strength chooses fewer nonzeros", () => {
    const result = analyzeConstraintRank([
      equation("dense", [0, 0, 1, 1e-9], 0),
      equation("sparse", [0, 0, 1, 0], 0),
    ]);
    expect(result.rank).toBe(2);
    expect(result.rows[0]!.sourceId).toBe("sparse");
    expect(result.rows[0]!.pivotDof).toBe(2);
    expect(result.rows[1]!.sourceId).toBe("dense");
    expect(result.rows[1]!.pivotDof).toBe(3);
  });

  it("XF-001: deterministic complete-row numeric tie-break by coefficient sequence", () => {
    const result = analyzeConstraintRank([
      equation("row-b", [1, 2e-8], 0),
      equation("row-a", [1, 1e-8], 0),
    ]);
    expect(result.rank).toBe(2);
    expect(result.rows[0]!.sourceId).toBe("row-a");
    expect(result.rows[0]!.pivotDof).toBe(0);
    expect(result.rows[1]!.sourceId).toBe("row-b");
    expect(result.rows[1]!.pivotDof).toBe(1);
    expect(result.rows[0]!.coefficients.get(1)).toBe(1e-8);
    expect(result.rows[1]!.coefficients.get(1)).toBe(1);
  });

  it("XF-001: identical numeric rows use sourceId for attribution only", () => {
    const result = analyzeConstraintRank([
      equation("row-b", [1, 1, 0], 0),
      equation("row-a", [1, 1, 0], 0),
    ]);
    expect(result.rank).toBe(1);
    expect(result.rows[0]!.sourceId).toBe("row-a");
    expect(result.redundantSourceIds).toEqual(["row-b"]);

    const flipped = analyzeConstraintRank([
      equation("row-b", [1, 1, 0], 0),
      equation("row-aa", [1, 1, 0], 0),
    ]);
    expect(flipped.rows[0]!.sourceId).toBe("row-aa");
    expect(flipped.redundantSourceIds).toEqual(["row-b"]);
  });

  it.each([
    ["ids-a", ["couple-a", "fix-b"]],
    ["ids-b", ["fix-a", "couple-b"]],
  ] as const)(
    "XF-001: direct rank canary picks the strong ux = 2 row first for %s",
    (_label, [coupleId, fixId]) => {
      for (const reversed of [false, true]) {
        const equations = [equation(coupleId, [2e-14, 1], 1), equation(fixId, [1, 0], 2)];
        if (reversed) equations.reverse();
        const result = analyzeConstraintRank(equations);
        expect(result.rank).toBe(2);
        expect(result.rows.map(({ pivotDof }) => pivotDof)).toEqual([0, 1]);
        expect(result.rows[0]!.sourceId).toBe(fixId);
        expect([...result.rows[0]!.coefficients.entries()]).toEqual([[0, 1]]);
        expect(result.rows[0]!.rightHandSide).toBe(2);
        expect([...result.rows[1]!.coefficients.entries()]).toEqual([[1, 1]]);
        expect(result.rows[1]!.rightHandSide).toBeCloseTo(1 - 4e-14, 14);
      }
    },
  );

  const q = 3.2515731794557063e-14;
  const f = 3.251573179455313e-14;

  it("FR-SAFE-003 XF-001: forward-echelon invariants and local cancellation keep a meaningful tiny residual", () => {
    const result = analyzeConstraintRank([
      equation("b", [1, 0, f, 0], 0),
      equation("a", [1, 0, q, 0, 1], 0),
    ]);
    expect(result.rank).toBe(2);
    expect(result.rows.map(({ pivotDof }) => pivotDof)).toEqual([0, 4]);
    const previous: number[] = [];
    for (const row of result.rows) {
      for (const dof of row.coefficients.keys()) {
        expect(previous.includes(dof)).toBe(false);
      }
      previous.push(row.pivotDof);
    }
    const second = result.rows[1]!;
    expect(second.coefficients.get(4)).toBe(1);
    const residual = second.coefficients.get(2)!;
    expect(residual).toBe(q - f);
    expect(residual).toBeGreaterThan(0);
    expect(residual).toBeLessThan(2e-14);
  });

  it.each([1, 2 ** 45])(
    "XF-001: backward-tail chain ranks to 25 pivots with exactly one free DOF at tail scale %s",
    (tailScale) => {
      const r = 0.999999999999943;
      const equations = [
        ...Array.from({ length: 23 }, (_, index) =>
          equation(
            `a${String(index).padStart(2, "0")}`,
            (() => {
              const coefficients = Array.from({ length: 26 }, () => 0);
              coefficients[index] = 1;
              coefficients[index + 1] = q;
              return coefficients;
            })(),
            0,
          ),
        ),
        equation(
          "a23",
          (() => {
            const coefficients = Array.from({ length: 26 }, () => 0);
            coefficients[23] = 1;
            coefficients[24] = tailScale;
            coefficients[25] = tailScale * r;
            return coefficients;
          })(),
          0,
        ),
        equation(
          "z",
          (() => {
            const coefficients = Array.from({ length: 26 }, () => 0);
            coefficients[24] = 1;
            coefficients[25] = 1;
            return coefficients;
          })(),
          0,
        ),
      ];
      const result = analyzeConstraintRank(equations);
      expect(result.redundantSourceIds).toEqual([]);
      expect(result.rank).toBe(25);
      const pivotSet = new Set(result.rows.map(({ pivotDof }) => pivotDof));
      expect(pivotSet.size).toBe(25);
      const freeDofs = Array.from({ length: 26 }, (_, dof) => dof).filter(
        (dof) => !pivotSet.has(dof),
      );
      expect(freeDofs).toHaveLength(1);
    },
  );

  it("XF-001: 3003-DOF cumulative-tiny system ranks to full rank with every DOF as pivot", () => {
    const count = 3000;
    const masterDof = count + 2;
    const specialDof = count + 1;
    const fullDofCount = count + 3;
    const equations = [
      ...Array.from({ length: count + 1 }, (_, dof) =>
        equation(
          `eq${String(dof).padStart(4, "0")}`,
          (() => {
            const coefficients = Array.from({ length: fullDofCount }, () => 0);
            coefficients[dof] = 1;
            coefficients[masterDof] = -1;
            return coefficients;
          })(),
          0,
        ),
      ),
      equation(
        "eq-special",
        (() => {
          const coefficients = Array.from({ length: fullDofCount }, () => 0);
          coefficients[specialDof] = 1;
          coefficients[masterDof] = -2;
          return coefficients;
        })(),
        0,
      ),
      equation(
        "z-semantic",
        (() => {
          const coefficients = Array.from({ length: fullDofCount }, () => 0);
          coefficients[0] = 2;
          coefficients[specialDof] = -1;
          for (let dof = 1; dof <= count; dof += 1) coefficients[dof] = 1e-16;
          return coefficients;
        })(),
        0,
      ),
    ];
    expect(equations).toHaveLength(fullDofCount);
    const started = performance.now();
    const result = analyzeConstraintRank(equations);
    const elapsed = performance.now() - started;
    console.log(`[2c-3003-rank] elapsed ${elapsed.toFixed(1)}ms for ${fullDofCount} DOFs`);
    expect(result.rank).toBe(fullDofCount);
    expect(result.redundantSourceIds).toEqual([]);
    expect(new Set(result.rows.map(({ pivotDof }) => pivotDof))).toEqual(
      new Set(Array.from({ length: fullDofCount }, (_, dof) => dof)),
    );
  }, 30_000);
});
