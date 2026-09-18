import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { combineResults } from "../../src/results/combine-results.js";
import { deriveFrameInternalForceStations } from "../../src/results/frame-internal-forces.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

const units = {
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
} as const;

function collisionModel(area: number) {
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [1, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addTrussSection({ id: "s", area })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" });
  for (const [id, nodeId, dof] of [
    ["c1", "a", "tx"],
    ["c2", "a", "ty"],
    ["c3", "a", "tz"],
    ["c4", "b", "ty"],
    ["c5", "b", "tz"],
  ] as const) {
    builder.addConstraint({ id, terms: [{ nodeId, dof, coefficient: 1 }], rightHandSide: 0 });
  }
  return builder.addLoadCase({
    id: "L",
    loads: [{ kind: "nodal", nodeId: "b", force: [1, 0, 0] }],
  });
}

function frameCombinationModel() {
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [10, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "s",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 2e-5,
    })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    });
  for (const dof of ["tx", "ty", "tz", "rx", "ry"] as const)
    builder.addConstraint({
      id: `a:${dof}`,
      terms: [{ nodeId: "a", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  for (const dof of ["ty", "tz", "rx", "ry"] as const)
    builder.addConstraint({
      id: `b:${dof}`,
      terms: [{ nodeId: "b", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  return builder
    .addLoadCase({
      id: "U",
      loads: [
        {
          kind: "member-distributed",
          frameId: "f",
          coordinateSystem: "local",
          startIntensity: [0, -1000, 0],
          endIntensity: [0, -1000, 0],
        },
      ],
    })
    .addLoadCase({
      id: "T",
      loads: [
        {
          kind: "member-distributed",
          frameId: "f",
          coordinateSystem: "local",
          startIntensity: [0, 0, 0],
          endIntensity: [0, -1000, 0],
        },
      ],
    })
    .finalize();
}

function axialCoefficients(axial: readonly [number, number, number, number]) {
  return [axial, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] as const;
}

function incompatibility(action: () => unknown): XFrameError {
  try {
    action();
  } catch (error) {
    if (error instanceof XFrameError) return error;
    throw error;
  }
  throw new Error("Expected a result incompatibility.");
}

it("combines compatible results without aliasing and preserves factor provenance", () => {
  const model = createModelBuilder()
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
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "A", loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] })
    .addLoadCase({ id: "B", loads: [{ kind: "nodal", nodeId: "n", force: [-4, 0, 0] }] })
    .finalize();
  const prepared = prepareAnalysis(model);
  const [a, b] = prepared.solveCases(["A", "B"]);
  const result = combineResults("C", [
    { result: a!, factor: 1.2 },
    { result: b!, factor: 0.5 },
  ]);
  expect(result.kind).toBe("combination");
  expect(result.fullDisplacements[0]).toBeCloseTo(0.1, 14);
  expect(result.factors).toEqual([
    { resultId: "A", factor: 1.2 },
    { resultId: "B", factor: 0.5 },
  ]);
  expect(result.fullDisplacements).not.toBe(a!.fullDisplacements);
});

it("combines twelve-component truss reference actions component-wise", () => {
  const prepared = prepareAnalysis(
    collisionModel(1)
      .addLoadCase({ id: "M", loads: [{ kind: "nodal", nodeId: "b", force: [3, 0, 0] }] })
      .finalize(),
  );
  const [first, second] = prepared.solveCases(["L", "M"]);
  const combined = combineResults("C", [
    { result: first!, factor: 2 },
    { result: second!, factor: 0.5 },
  ]);

  expect(combined.trusses[0]!.globalReferenceEndForces).toEqual([
    -3.5, 0, 0, 0, 0, 0, 3.5, 0, 0, 0, 0, 0,
  ]);
});

it("combines force polynomials before deriving a new interior extremum", () => {
  const prepared = prepareAnalysis(frameCombinationModel());
  const [uniform, triangular] = prepared.solveCases(["U", "T"]);
  const combined = combineResults("C", [
    { result: uniform!, factor: 1 },
    { result: triangular!, factor: 1 },
  ]);
  const sourceLocations = [
    ...uniform!.frames[0]!.internalForces.map(({ x }) => x),
    ...triangular!.frames[0]!.internalForces.map(({ x }) => x),
  ];
  const extremum = combined.frames[0]!.internalForces.find(({ x }) => x > 0 && x < 10);

  expect(extremum).toBeDefined();
  expect(extremum!.x).toBeCloseTo((-20 + Math.sqrt(2800 / 3)) / 2, 12);
  expect(extremum!.shearY).toBeCloseTo(0, 9);
  expect(sourceLocations).not.toContain(extremum!.x);
});

it("directly scales first frame segments for tiny, zero, and negative factors", () => {
  const source = prepareAnalysis(frameCombinationModel()).solveCase("U");
  const sourceFrame = source.frames[0]!;
  const sourceSegment = sourceFrame.internalForceSegments[0]!;
  for (const [id, factor] of [
    ["CT", 1e-20],
    ["CZ", 0],
    ["CN", -2],
  ] as const) {
    const frame = combineResults(id, [{ result: source, factor }]).frames[0]!;
    const segment = frame.internalForceSegments[0]!;
    for (let component = 0; component < segment.coefficients.length; component += 1) {
      for (let term = 0; term < segment.coefficients[component]!.length; term += 1) {
        const expected = sourceSegment.coefficients[component]![term]! * factor;
        expect(segment.coefficients[component]![term]).toBe(expected === 0 ? 0 : expected);
      }
    }
    expect(segment.coefficients[1][0]).toBe(frame.localEndForces[1]);
    expect(frame.internalForces[0]!.shearY).toBe(frame.localEndForces[1]);
    expect(Object.isFrozen(frame.internalForceSegments)).toBe(true);
    expect(Object.isFrozen(segment)).toBe(true);
    expect(Object.isFrozen(segment.coefficients)).toBe(true);
  }
});

it("preserves exact continuity and genuine jumps while scaling multiple segments", () => {
  const segments = [
    {
      start: 0,
      end: 1,
      coefficients: axialCoefficients([1e16, -9999999999999998, 0, 0]),
      startLeft: [1e16, 0, 0, 0, 0, 0],
    },
    { start: 1, end: 2, coefficients: axialCoefficients([2, 0, 0, 0]) },
    {
      start: 2,
      end: 3,
      coefficients: axialCoefficients([3, 0, 0, 0]),
      endRight: [3, 0, 0, 0, 0, 0],
    },
  ] as const;
  const base = prepareAnalysis(frameCombinationModel()).solveCase("U");
  const source = {
    ...base,
    frames: [
      {
        ...base.frames[0]!,
        internalForceSegments: segments,
        internalForces: deriveFrameInternalForceStations(segments),
      },
    ],
  } as unknown as typeof base;
  expect(source.frames[0]!.internalForces.filter(({ x }) => x === 1)).toMatchObject([
    { side: "single", axial: 2 },
  ]);

  const frame = combineResults("CC", [{ result: source, factor: 1e-20 }]).frames[0]!;
  const scaled = frame.internalForceSegments;
  const carried = scaled[0]!.coefficients[0][0] + scaled[0]!.coefficients[0][1];

  expect(carried).toBe(1.3552527156068805e-20);
  expect(scaled[1]!.coefficients[0][0]).toBe(carried);
  expect(frame.internalForces.filter(({ x }) => x === 1)).toMatchObject([
    { side: "single", axial: carried },
  ]);
  expect(frame.internalForces.filter(({ x }) => x === 2)).toMatchObject([
    { side: "left", axial: carried },
    { side: "right", axial: 2.9999999999999997e-20 },
  ]);
});

it("rejects non-finite sided endpoint combinations with structured context", () => {
  const source = prepareAnalysis(frameCombinationModel()).solveCase("U");
  const frame = source.frames[0]!;
  const segment = frame.internalForceSegments[0]!;
  const startLeft = segment.startLeft!;
  const fabricated = {
    ...source,
    frames: [
      {
        ...frame,
        internalForceSegments: [
          {
            ...segment,
            startLeft: [
              Number.MAX_VALUE,
              startLeft[1],
              startLeft[2],
              startLeft[3],
              startLeft[4],
              startLeft[5],
            ],
          },
          ...frame.internalForceSegments.slice(1),
        ],
      },
    ],
  } as unknown as typeof source;

  let error: unknown;
  try {
    combineResults("CO", [{ result: fabricated, factor: 2 }]);
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(XFrameError);
  expect(error).toMatchObject({
    code: "NON_FINITE_VALUE",
    context: {
      kind: "numeric",
      path: "frameForce.segments[0].startLeft[0]",
      value: "Infinity",
      expected: "finite number",
    },
  });
});

it("rejects overflow from adding individually finite sided endpoints", () => {
  const prepared = prepareAnalysis(frameCombinationModel());
  const first = prepared.solveCase("U");
  const second = prepared.solveCase("T");
  const withMaximumStartAxial = (source: typeof first): typeof first => {
    const frame = source.frames[0]!;
    const segment = frame.internalForceSegments[0]!;
    const startLeft = segment.startLeft!;
    return {
      ...source,
      frames: [
        {
          ...frame,
          internalForceSegments: [
            {
              ...segment,
              startLeft: [
                Number.MAX_VALUE,
                startLeft[1],
                startLeft[2],
                startLeft[3],
                startLeft[4],
                startLeft[5],
              ],
            },
            ...frame.internalForceSegments.slice(1),
          ],
        },
      ],
    } as unknown as typeof first;
  };
  expect(Number.isFinite(Number.MAX_VALUE * 0.75)).toBe(true);

  let error: unknown;
  try {
    combineResults("CA", [
      { result: withMaximumStartAxial(first), factor: 0.75 },
      { result: withMaximumStartAxial(second), factor: 0.75 },
    ]);
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(XFrameError);
  expect(error).toMatchObject({
    code: "NON_FINITE_VALUE",
    context: {
      kind: "numeric",
      path: "frameForce.segments[0].startLeft[0]",
      value: "Infinity",
      expected: "finite number",
    },
  });
});

it("rejects duplicate source IDs and a combination ID collision", () => {
  const model = createModelBuilder()
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
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "A", loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] })
    .finalize();
  const result = prepareAnalysis(model).solveCase("A");
  for (const action of [
    () =>
      combineResults("C", [
        { result, factor: 1 },
        { result, factor: 2 },
      ]),
    () => combineResults("A", [{ result, factor: 1 }]),
  ]) {
    expect(action).toThrowError(XFrameError);
    let error: unknown;
    try {
      action();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("RESULT_INCOMPATIBLE");
  }
});

it("rejects results from the reproduced full-model fingerprint collision", () => {
  const first = prepareAnalysis(collisionModel(0.00015793100000000002).finalize()).solveCase("L");
  const second = prepareAnalysis(collisionModel(0.000164232).finalize()).solveCase("L");
  const secondWithDistinctId = { ...second, id: "L2" as typeof second.id };
  expect(first.id).toBe("L");
  expect(secondWithDistinctId.id).toBe("L2");
  expect(secondWithDistinctId.modelFingerprint).toBe(second.modelFingerprint);
  expect(first.modelFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
  expect(second.modelFingerprint).not.toBe(first.modelFingerprint);

  let error: unknown;
  try {
    combineResults("C", [
      { result: first, factor: 1 },
      { result: secondWithDistinctId, factor: 1 },
    ]);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(XFrameError);
  expect((error as XFrameError).code).toBe("RESULT_INCOMPATIBLE");
  expect((error as XFrameError).context).toMatchObject({ reason: "model fingerprints differ" });
});

it("rejects entity-order fabrication and non-finite combined output", () => {
  const model = createModelBuilder()
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
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [1, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "A", loads: [{ kind: "nodal", nodeId: "n", force: [2, 0, 0] }] })
    .finalize();
  const result = prepareAnalysis(model).solveCase("A");
  const fabricated = {
    ...result,
    id: "B",
    nodes: [{ ...result.nodes[0]!, id: "other" }],
  } as unknown as typeof result;
  expect(() =>
    combineResults("C", [
      { result, factor: 1 },
      { result: fabricated, factor: 1 },
    ]),
  ).toThrowError(XFrameError);
  expect(() => combineResults("C", [{ result, factor: Number.MAX_VALUE }])).toThrowError(
    XFrameError,
  );
});

it("rejects incompatible result layouts before combining values", () => {
  const source = prepareAnalysis(collisionModel(1).finalize()).solveCase("L");
  const other = { ...source, id: "OTHER" as typeof source.id };
  const cases = [
    {
      action: () => combineResults("C", []),
      reason: "at least one factor is required",
    },
    {
      action: () => combineResults("C", [{ result: source, factor: Number.NaN }]),
      reason: "factor is nonfinite",
    },
    {
      action: () =>
        combineResults("C", [
          { result: source, factor: 1 },
          { result: { ...other, unitSystem: { ...other.unitSystem, length: "mm" } }, factor: 1 },
        ]),
      reason: "unit systems differ",
    },
    {
      action: () =>
        combineResults("C", [
          { result: source, factor: 1 },
          {
            result: {
              ...other,
              conventions: {
                ...other.conventions,
                internalForces: "other",
              } as unknown as typeof other.conventions,
            },
            factor: 1,
          },
        ]),
      reason: "result conventions differ",
    },
    {
      action: () =>
        combineResults("C", [
          { result: source, factor: 1 },
          { result: { ...other, fullDisplacements: [] }, factor: 1 },
        ]),
      reason: "equation layouts differ",
    },
    {
      action: () =>
        combineResults("C", [
          { result: source, factor: 1 },
          { result: { ...other, nodes: [] }, factor: 1 },
        ]),
      reason: "nodes counts differ",
    },
    {
      action: () =>
        combineResults("C", [
          { result: source, factor: 1 },
          {
            result: {
              ...other,
              nodes: other.nodes.map((node, index) =>
                index === 0 ? { ...node, coordinates: [1, 0, 0] as const } : node,
              ),
            },
            factor: 1,
          },
        ]),
      reason: "node coordinates differ",
    },
  ];

  for (const { action, reason } of cases) {
    const error = incompatibility(action);
    expect(error.code).toBe("RESULT_INCOMPATIBLE");
    expect(error.context).toMatchObject({ reason });
  }
});

it("validates frame segment layouts and canonicalizes negative-zero factors", () => {
  const source = prepareAnalysis(frameCombinationModel()).solveCase("U");
  const other = { ...source, id: "OTHER" as typeof source.id };
  const frame = other.frames[0]!;
  const segment = frame.internalForceSegments[0]!;
  const error = incompatibility(() =>
    combineResults("C", [
      { result: source, factor: 1 },
      {
        result: {
          ...other,
          frames: [
            {
              ...frame,
              internalForceSegments: [{ ...segment, start: segment.start + 0.5 }],
            },
          ],
        },
        factor: 1,
      },
    ]),
  );
  expect(error.context).toMatchObject({ reason: "frame segment layouts differ" });

  const zero = combineResults("ZERO", [{ result: source, factor: -0 }]);
  expect(zero.factors).toEqual([{ resultId: "U", factor: 0 }]);
  expect(Object.is(zero.fullLoad[0], -0)).toBe(false);
});

it("fails closed for every distinct result layout before summing arrays", () => {
  const source = prepareAnalysis(collisionModel(1).finalize()).solveCase("L");
  const other = { ...source, id: "OTHER" as typeof source.id };
  const framed = prepareAnalysis(frameCombinationModel()).solveCase("U");
  const malformedFrame = {
    ...framed,
    id: "FRAME_OTHER" as typeof framed.id,
    frames: [{ ...framed.frames[0]!, internalForceSegments: [] }, ...framed.frames.slice(1)],
  };
  const spring = prepareAnalysis(
    createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "n", coordinates: [0, 0, 0] })
      .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
      .addLoadCase({ id: "A", loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] })
      .finalize(),
  ).solveCase("A");
  const malformedSpring = {
    ...spring,
    id: "SPRING_OTHER" as typeof spring.id,
    springs: spring.springs.map((entry) => ({ ...entry, grounded: false })),
  };
  const cases = [
    {
      action: () =>
        combineResults("C", [
          { result: source, factor: 1 },
          {
            result: {
              ...other,
              nodes: other.nodes.map((node, index) =>
                index === 0 ? { ...node, displacements: [] } : node,
              ),
            },
            factor: 1,
          },
        ]),
      reason: "node displacement layouts differ",
    },
    {
      action: () =>
        combineResults("C", [
          { result: source, factor: 1 },
          {
            result: {
              ...other,
              nodes: other.nodes.map((node, index) =>
                index === 0 ? { ...node, reactions: [] } : node,
              ),
            },
            factor: 1,
          },
        ]),
      reason: "node reaction layouts differ",
    },
    {
      action: () =>
        combineResults("C", [
          { result: framed, factor: 1 },
          { result: malformedFrame, factor: 1 },
        ]),
      reason: "frame segment counts differ",
    },
    {
      action: () =>
        combineResults("C", [
          { result: spring, factor: 1 },
          { result: malformedSpring, factor: 1 },
        ]),
      reason: "spring kinds differ",
    },
    {
      action: () =>
        combineResults("C", [
          { result: source, factor: 1 },
          { result: { ...other, fullLoad: [] }, factor: 1 },
        ]),
      reason: "fullLoad lengths differ",
    },
  ];
  for (const { action, reason } of cases)
    expect(incompatibility(action).context).toMatchObject({ reason });
});
