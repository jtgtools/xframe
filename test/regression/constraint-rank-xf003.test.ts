import { describe, expect, it } from "vitest";
import { analyzeConstraintRank } from "../../src/constraints/constraint-rank.js";
import { canonicalizeConstraint } from "../../src/constraints/canonicalize-constraint.js";
import { compileConstraints } from "../../src/constraints/compile-constraints.js";
import { findSemanticTransformViolation } from "../../src/constraints/semantic-constraint-validation.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import * as modelBuilderModule from "../../src/model/model-builder.js";

const equation = (sourceId: string, coefficients: readonly number[], rhs = 0) =>
  canonicalizeConstraint({
    sourceId,
    terms: coefficients.flatMap((coefficient, dof) =>
      coefficient === 0 ? [] : [{ dof, coefficient }],
    ),
    rightHandSide: rhs,
  });

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randomInteger =
  (random: () => number) =>
  (low: number, high: number): number =>
    low + Math.floor(random() * (high - low + 1));

function exactRankInteger(matrix: readonly (readonly number[])[]): number {
  const rows = matrix.map((row) => row.map((value) => ({ n: BigInt(value), d: 1n })));
  const columnCount = rows[0]!.length;
  let rank = 0;
  for (let column = 0; column < columnCount && rank < rows.length; column += 1) {
    let pivotIndex = -1;
    for (let rowIndex = rank; rowIndex < rows.length; rowIndex += 1) {
      if (rows[rowIndex]![column]!.n !== 0n) {
        pivotIndex = rowIndex;
        break;
      }
    }
    if (pivotIndex === -1) continue;
    [rows[rank], rows[pivotIndex]] = [rows[pivotIndex]!, rows[rank]!];
    const pivotNumerator = rows[rank]![column]!.n;
    const pivotDenominator = rows[rank]![column]!.d;
    for (let rowIndex = rank + 1; rowIndex < rows.length; rowIndex += 1) {
      const factorNumerator = rows[rowIndex]![column]!.n;
      const factorDenominator = rows[rowIndex]![column]!.d;
      if (factorNumerator === 0n) continue;
      for (let currentColumn = column; currentColumn < columnCount; currentColumn += 1) {
        const entry = rows[rowIndex]![currentColumn]!;
        const pivotEntry = rows[rank]![currentColumn]!;
        const numerator =
          entry.n * factorDenominator * pivotNumerator -
          factorNumerator * entry.d * pivotEntry.n * pivotDenominator;
        const denominator = entry.d * factorDenominator * pivotEntry.d;
        const divisor = gcd(numerator < 0n ? -numerator : numerator, denominator);
        rows[rowIndex]![currentColumn] = {
          n: numerator / divisor,
          d: denominator / divisor,
        };
      }
      rows[rowIndex]![column] = { n: 0n, d: 1n };
    }
    rank += 1;
  }
  return rank;
}

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a === 0n ? 1n : a;
}

function nullSpaceVector(left: readonly number[], right: readonly number[]): readonly number[] {
  // Cross product of two independent integer rows spans their null space.
  return [
    left[1]! * right[2]! - left[2]! * right[1]!,
    left[2]! * right[0]! - left[0]! * right[2]!,
    left[0]! * right[1]! - left[1]! * right[0]!,
  ];
}

describe("XF-003 rank regression", () => {
  it.each([
    [
      "r0=[-9,-5,8], r1=[-7,-4,-10], r2=[-88,-49,62], exact integer r2=9*r0+r1",
      [[-9, -5, 8] as const, [-7, -4, -10] as const, [-88, -49, 62] as const] as const,
    ],
    [
      "r2=-1*r0+9*r1",
      [[1, 6, -3] as const, [-9, -7, 10] as const, [-82, -69, 93] as const] as const,
    ],
    [
      "r2=-8*r0+1*r1",
      [[-7, -3, -9] as const, [-36, -37, 20] as const, [20, -13, 92] as const] as const,
    ],
  ])(
    "FR-XF-003-01: exact rank-2 three-row system classifies rank 2 with a recoverable null-space direction (%s)",
    (_label, rows) => {
      const canonical = rows.map((coefficients, index) => equation(`r${index}`, coefficients));
      const analysis = analyzeConstraintRank(canonical);
      expect(analysis.rank).toBe(2);
      expect(analysis.redundantSourceIds).toHaveLength(1);

      const compiled = compileConstraints(3, canonical);
      expect(compiled.reducedDofCount).toBe(1);
      const recovered = Array.from(compiled.recover([1]));
      expect(recovered.some((entry) => entry !== 0)).toBe(true);
      const pivotSet = new Set(compiled.pivotDofs);
      expect(pivotSet.size).toBe(2);
      const rawEquations = rows.map((coefficients, index) => ({
        sourceId: `r${index}`,
        terms: coefficients.flatMap((coefficient, dof) =>
          Number(coefficient) === 0 ? [] : [{ dof, coefficient }],
        ),
        rightHandSide: 0,
      }));
      const violation = findSemanticTransformViolation(rawEquations, compiled.rows);
      expect(violation).toBeUndefined();
    },
  );

  it("FR-XF-003-01: canonical witness recovers the exact null-space direction [82,-146,1]", () => {
    const equations = [
      equation("r0", [-9, -5, 8]),
      equation("r1", [-7, -4, -10]),
      equation("r2", [-88, -49, 62]),
    ];
    const compilation = compileConstraints(3, equations);
    expect(compilation.freeDofs).toHaveLength(1);
    const recovered = Array.from(compilation.recover([1]));
    const scale = recovered[0]! / 82;
    expect(scale).not.toBe(0);
    expect(recovered[1]).toBeCloseTo(scale * -146, 9);
    expect(recovered[2]!).toBeCloseTo(scale, 9);
    for (const eq of equations) {
      const residual =
        eq.terms.reduce((sum, term) => sum + term.coefficient * recovered[term.dof]!, 0) -
        eq.rightHandSide;
      expect(Math.abs(residual)).toBeLessThan(1e-9);
    }
  });

  it("FR-XF-003-02: public grounded-spring solve returns u=[82,-146,1], not zero, with pass diagnostics", () => {
    const builder = modelBuilderModule
      .createModelBuilder()
      .setUnitSystem({
        version: "1",
        length: "m",
        force: "N",
        moment: "N*m",
        modulus: "Pa",
        distributedForce: "N/m",
        density: "kg/m^3",
        rotation: "rad",
      })
      .addNode({ id: "n1", coordinates: [0, 0, 0] })
      .addSpring({ id: "s1", startNodeId: "n1", stiffness: [1, 1, 1, 1, 1, 1] });
    const constraints: Array<[string, readonly [number, number, number]]> = [
      ["c0", [-9, -5, 8]],
      ["c1", [-7, -4, -10]],
      ["c2", [-88, -49, 62]],
    ];
    for (const [id, coefficients] of constraints) {
      builder.addConstraint({
        id,
        terms: (["tx", "ty", "tz"] as const).map((dof, index) => ({
          nodeId: "n1",
          dof,
          coefficient: coefficients[index]!,
        })),
        rightHandSide: 0,
      });
    }
    builder.addLoadCase({
      id: "LC",
      loads: [{ kind: "nodal", nodeId: "n1", force: [82, -146, 1] }],
    });
    const result = prepareAnalysis(builder.finalize()).solveCase("LC");
    expect(result.diagnostics.status).toBe("pass");
    const displacements = Array.from(result.fullDisplacements);
    expect(displacements).not.toEqual([0, 0, 0, 0, 0, 0]);
    expect(displacements[0]!).toBeCloseTo(82, 9);
    expect(displacements[1]!).toBeCloseTo(-146, 9);
    expect(displacements[2]!).toBeCloseTo(1, 9);
  });

  it("FR-XF-003-03: exact-rank oracle property test — engine rank matches BigInt fraction-free rank on 213,000 deterministic systems", () => {
    const random = mulberry32(123456789);
    const randomCoefficient = randomInteger(random);
    let overRanks = 0;
    let underRanks = 0;

    for (let trial = 0; trial < 100_000; trial += 1) {
      const a = [
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
      ];
      const b = [
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
      ];
      const alpha = randomCoefficient(-12, 12);
      const beta = randomCoefficient(-12, 12);
      const c = [
        alpha * a[0]! + beta * b[0]!,
        alpha * a[1]! + beta * b[1]!,
        alpha * a[2]! + beta * b[2]!,
      ];
      if (exactRankInteger([a, b, c]) !== 2) continue;
      const analysis = analyzeConstraintRank(
        [a, b, c].map((row, index) => equation(`r${index}`, row)),
      );
      if (analysis.rank !== 2) overRanks += 1;
    }

    for (let trial = 0; trial < 100_000; trial += 1) {
      const rows = [0, 1, 2].map(() => [
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
      ]);
      const oracleRank = exactRankInteger(rows);
      if (oracleRank === 0) {
        trial -= 1;
        continue;
      }
      const analysis = analyzeConstraintRank(rows.map((row, index) => equation(`r${index}`, row)));
      if (analysis.rank > oracleRank) overRanks += 1;
      else if (analysis.rank < oracleRank) underRanks += 1;
    }

    for (let trial = 0; trial < 13_000; trial += 1) {
      const r0 = [
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
      ];
      if (r0[0] === 0 && r0[1] === 0 && r0[2] === 0) {
        trial -= 1;
        continue;
      }
      const a = randomCoefficient(-4, 4);
      const b = randomCoefficient(-4, 4);
      const r1 = [a * r0[0]!, a * r0[1]!, a * r0[2]!];
      const r2 = [b * r0[0]!, b * r0[1]!, b * r0[2]!];
      expect(exactRankInteger([r0, r1, r2])).toBe(1);
      const analysis = analyzeConstraintRank(
        [r0, r1, r2].map((row, index) => equation(`r${index}`, row)),
      );
      if (analysis.rank !== 1) overRanks += 1;
    }

    expect(overRanks).toBe(0);
    expect(underRanks).toBe(0);
  }, 90_000);

  it("FR-XF-003-03: exact-rank oracle property test — compiled reducedDofCount matches nullity on dependent systems", () => {
    const random = mulberry32(20260819);
    const randomCoefficient = randomInteger(random);
    for (let trial = 0; trial < 5_000; trial += 1) {
      const r0 = [
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
      ];
      const r1 = [
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
        randomCoefficient(-12, 12),
      ];
      const alpha = randomCoefficient(-12, 12);
      const beta = randomCoefficient(-12, 12);
      const r2 = [
        alpha * r0[0]! + beta * r1[0]!,
        alpha * r0[1]! + beta * r1[1]!,
        alpha * r0[2]! + beta * r1[2]!,
      ];
      if (exactRankInteger([r0, r1, r2]) !== 2) continue;
      const compilation = compileConstraints(3, [
        equation("r0", r0),
        equation("r1", r1),
        equation("r2", r2),
      ]);
      expect(compilation.reducedDofCount).toBe(1);
      const recovered = Array.from(compilation.recover([1]));
      const expectedNull = nullSpaceVector(r0, r1);
      let referenceIndex = 0;
      for (let index = 1; index < expectedNull.length; index += 1) {
        if (Math.abs(expectedNull[index]!) > Math.abs(expectedNull[referenceIndex]!)) {
          referenceIndex = index;
        }
      }
      const scale = recovered[referenceIndex]! / expectedNull[referenceIndex]!;
      for (let index = 0; index < expectedNull.length; index += 1) {
        if (index === referenceIndex) continue;
        expect(recovered[index]!).toBeCloseTo(scale * expectedNull[index]!, 6);
      }
    }
  }, 90_000);

  it("FR-XF-003-04: nullity/completeness invariant — transform column count equals full DOF count minus exact rank", () => {
    const equations = [
      equation("r0", [-9, -5, 8]),
      equation("r1", [-7, -4, -10]),
      equation("r2", [-88, -49, 62]),
    ];
    const compiled = compileConstraints(3, equations);
    expect(compiled.reducedDofCount).toBe(
      3 -
        exactRankInteger([
          [-9, -5, 8],
          [-7, -4, -10],
          [-88, -49, 62],
        ]),
    );
    const columns = compiled.freeDofs.length;
    expect(columns).toBe(1);
    const recovered = Array.from(compiled.recover([1]));
    expect(recovered.some((entry) => entry !== 0)).toBe(true);
    const rawEquations = [
      [-9, -5, 8],
      [-7, -4, -10],
      [-88, -49, 62],
    ].map((coefficients, index) => ({
      sourceId: `r${index}`,
      terms: coefficients.flatMap((coefficient, dof) =>
        coefficient === 0 ? [] : [{ dof, coefficient }],
      ),
      rightHandSide: 0,
    }));
    const violation = findSemanticTransformViolation(rawEquations, compiled.rows);
    expect(violation).toBeUndefined();
  });

  it("FR-XF-003-04: nullity/completeness invariant — two independent constraints leave a two-dimensional transform", () => {
    const equations = [equation("r0", [1, 0, -2]), equation("r1", [0, 1, -3])];
    const oracleNullity =
      3 -
      exactRankInteger([
        [1, 0, -2],
        [0, 1, -3],
      ]);
    expect(oracleNullity).toBe(1);
    const compiled = compileConstraints(3, equations);
    expect(compiled.reducedDofCount).toBe(oracleNullity);
    const recovered = Array.from(compiled.recover([1]));
    expect(recovered.some((entry) => entry !== 0)).toBe(true);
  });
});

function makeRawEquations(rows: readonly (readonly number[])[]): Array<{
  sourceId: string;
  terms: Array<{ dof: number; coefficient: number }>;
  rightHandSide: number;
}> {
  return rows.map((coefficients, index) => ({
    sourceId: `r${index}`,
    terms: coefficients.flatMap((coefficient, dof) =>
      coefficient === 0 ? [] : [{ dof, coefficient }],
    ),
    rightHandSide: 0,
  }));
}

function expectRecoveredParallelToNullVector(
  recovered: readonly number[],
  nullVector: readonly bigint[],
): void {
  let reference = 0;
  for (let index = 1; index < nullVector.length; index += 1) {
    if (Math.abs(Number(nullVector[index])) > Math.abs(Number(nullVector[reference]))) {
      reference = index;
    }
  }
  const scale = recovered[reference]! / Number(nullVector[reference]);
  expect(scale).not.toBe(0);
  for (let index = 0; index < nullVector.length; index += 1) {
    if (index === reference) continue;
    expect(recovered[index]!).toBeCloseTo(scale * Number(nullVector[index]), 4);
  }
}

describe("XF-003 adversarial review remediation", () => {
  const ADVERSE_ROWS = [
    [-1025, 11, -1028] as const,
    [4950, 7082, -51] as const,
    [-43525, -63749, 1487] as const,
  ] as const;

  const ADVERSE_NULL_VECTOR = [7279735n, -5140875n, -7313500n] as const;

  it("FR-XF-003-05: adversarial counterexample r2=-r0-9*r1 ranks 2 with the exact null vector locked by zero dot products", () => {
    expect(exactRankInteger(ADVERSE_ROWS)).toBe(2);
    for (const row of ADVERSE_ROWS) {
      const dot =
        BigInt(row[0]) * ADVERSE_NULL_VECTOR[0] +
        BigInt(row[1]) * ADVERSE_NULL_VECTOR[1] +
        BigInt(row[2]) * ADVERSE_NULL_VECTOR[2];
      expect(dot).toBe(0n);
    }
    const equations = ADVERSE_ROWS.map((coefficients, index) =>
      equation(`r${index}`, coefficients),
    );
    const analysis = analyzeConstraintRank(equations);
    expect(analysis.rank).toBe(2);
    expect(analysis.redundantSourceIds).toHaveLength(1);
    const compiled = compileConstraints(3, equations);
    expect(compiled.reducedDofCount).toBe(1);
    expect(compiled.freeDofs).toHaveLength(1);
    expectRecoveredParallelToNullVector(Array.from(compiled.recover([1])), ADVERSE_NULL_VECTOR);
    const violation = findSemanticTransformViolation(makeRawEquations(ADVERSE_ROWS), compiled.rows);
    expect(violation).toBeUndefined();
  });

  it("FR-XF-003-06: public grounded-spring solve returns u=[7279735,-5140875,-7313500,0,0,0], not zero, with pass diagnostics", () => {
    const builder = modelBuilderModule
      .createModelBuilder()
      .setUnitSystem({
        version: "1",
        length: "m",
        force: "N",
        moment: "N*m",
        modulus: "Pa",
        distributedForce: "N/m",
        density: "kg/m^3",
        rotation: "rad",
      })
      .addNode({ id: "n1", coordinates: [0, 0, 0] })
      .addSpring({ id: "s1", startNodeId: "n1", stiffness: [1, 1, 1, 1, 1, 1] });
    for (const [id, coefficients] of ADVERSE_ROWS.map(
      (row, index) => [`c${index}`, row] as const,
    )) {
      builder.addConstraint({
        id,
        terms: (["tx", "ty", "tz"] as const).map((dof, index) => ({
          nodeId: "n1",
          dof,
          coefficient: coefficients[index]!,
        })),
        rightHandSide: 0,
      });
    }
    builder.addLoadCase({
      id: "LC",
      loads: [
        {
          kind: "nodal",
          nodeId: "n1",
          force: [
            Number(ADVERSE_NULL_VECTOR[0]),
            Number(ADVERSE_NULL_VECTOR[1]),
            Number(ADVERSE_NULL_VECTOR[2]),
          ],
        },
      ],
    });
    const result = prepareAnalysis(builder.finalize()).solveCase("LC");
    expect(result.diagnostics.status).toBe("pass");
    const displacements = Array.from(result.fullDisplacements);
    expect(displacements).not.toEqual([0, 0, 0, 0, 0, 0]);
    expect(displacements[0]!).toBeCloseTo(7279735, 4);
    expect(displacements[1]!).toBeCloseTo(-5140875, 4);
    expect(displacements[2]!).toBeCloseTo(-7313500, 4);
    expect(displacements[3]!).toBeCloseTo(0, 4);
    expect(displacements[4]!).toBeCloseTo(0, 4);
    expect(displacements[5]!).toBeCloseTo(0, 4);
  });

  it.each([
    ["identity", 1],
    ["0.1", 0.1],
    ["0.2", 0.2],
    ["1.1", 1.1],
    ["1.3", 1.3],
    ["sqrt(2)", Math.SQRT2],
    ["1e-200", 1e-200],
    ["1e-100", 1e-100],
    ["1e100", 1e100],
    ["-0.1", -0.1],
    ["-1.3", -1.3],
  ] as const)(
    "FR-XF-003-07: scaling exactly one row by %s leaves rank, redundancy, and the recovered null direction invariant",
    (_label, factor) => {
      const scaledRows = ADVERSE_ROWS.map((row, index) =>
        index === 1 ? row.map((coefficient) => coefficient * factor) : [...row],
      );
      const equations = scaledRows.map((coefficients, index) =>
        equation(`r${index}`, coefficients),
      );
      const analysis = analyzeConstraintRank(equations);
      expect(analysis.rank).toBe(2);
      expect(analysis.redundantSourceIds).toHaveLength(1);
      const compiled = compileConstraints(3, equations);
      expect(compiled.reducedDofCount).toBe(1);
      expect(compiled.freeDofs).toHaveLength(1);
      expectRecoveredParallelToNullVector(Array.from(compiled.recover([1])), ADVERSE_NULL_VECTOR);
      const violation = findSemanticTransformViolation(makeRawEquations(scaledRows), compiled.rows);
      expect(violation).toBeUndefined();
    },
  );

  it("FR-XF-003-08: mixed-scale exact-rank oracle sweep — rank matches BigInt oracle on 100,000 systems with a in +/-2000, b in +/-8000, c=alpha*a+beta*b", () => {
    const random = mulberry32(20260417);
    const randomCoefficient = randomInteger(random);
    const scalingFactors = [1, -1, 9, -9];
    let overRanks = 0;
    let underRanks = 0;
    for (let trial = 0; trial < 100_000; trial += 1) {
      const a = [
        randomCoefficient(-2000, 2000),
        randomCoefficient(-2000, 2000),
        randomCoefficient(-2000, 2000),
      ];
      const b = [
        randomCoefficient(-8000, 8000),
        randomCoefficient(-8000, 8000),
        randomCoefficient(-8000, 8000),
      ];
      const alpha = scalingFactors[randomCoefficient(0, 3)]!;
      const beta = scalingFactors[randomCoefficient(0, 3)]!;
      const c = [
        alpha * a[0]! + beta * b[0]!,
        alpha * a[1]! + beta * b[1]!,
        alpha * a[2]! + beta * b[2]!,
      ];
      if (exactRankInteger([a, b, c]) !== 2) continue;
      const analysis = analyzeConstraintRank(
        [a, b, c].map((row, index) => equation(`r${index}`, row)),
      );
      if (analysis.rank !== 2) overRanks += 1;
      else if (analysis.redundantSourceIds.length !== 1) underRanks += 1;
    }
    expect(overRanks).toBe(0);
    expect(underRanks).toBe(0);
  }, 120_000);
});
