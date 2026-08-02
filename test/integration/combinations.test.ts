import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { combineResults } from "../../src/results/combine-results.js";
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

it("FR-RES-006: combines compatible results without aliasing and preserves factor provenance", () => {
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

it("FR-SAFE-002: combines twelve-component truss reference actions component-wise", () => {
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

it("FR-SAFE-004: combines force polynomials before deriving a new interior extremum", () => {
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

it("FR-SAFE-004/NFR-COR-002: directly scales first frame segments for tiny, zero, and negative factors", () => {
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

it("FR-SAFE-004/NFR-COR-002: rejects non-finite sided endpoint combinations with structured context", () => {
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

it("FR-RES-006: rejects duplicate source IDs and a combination ID collision", () => {
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

it("FR-SAFE-001: rejects results from the reproduced full-model fingerprint collision", () => {
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

it("FR-RES-006/NFR-COR-002: rejects entity-order fabrication and non-finite combined output", () => {
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
