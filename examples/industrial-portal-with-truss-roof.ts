import { createModelBuilder, prepareAnalysis } from "../src/index.js";

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

/**
 * Single-bay industrial portal with a truss roof: a warehouse slice.
 * Columns pinned at grade via end releases, rafter with eave rigid offsets,
 * roof truss diagonals, crane point load, snow UDL, and self-weight.
 */
export function runIndustrialPortalExample() {
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "base-l", coordinates: [0, 0, 0] })
    .addNode({ id: "eave-l", coordinates: [0, 6, 0] })
    .addNode({ id: "ridge", coordinates: [6, 7.5, 0] })
    .addNode({ id: "eave-r", coordinates: [12, 6, 0] })
    .addNode({ id: "base-r", coordinates: [12, 0, 0] })
    .addMaterial({ id: "steel", elasticModulus: 200e9, shearModulus: 76.92e9, density: 7850 })
    .addFrameSection({
      id: "col",
      area: 0.02,
      torsionalConstant: 8e-6,
      momentOfInertiaY: 10e-6,
      momentOfInertiaZ: 18e-6,
    })
    .addFrameSection({
      id: "rafter",
      area: 0.016,
      torsionalConstant: 6e-6,
      momentOfInertiaY: 8e-6,
      momentOfInertiaZ: 14e-6,
    })
    .addTrussSection({ id: "tie", area: 0.004 })
    // Pinned bases: release all three end moments at the column feet.
    .addFrame({
      id: "col-l",
      startNodeId: "base-l",
      endNodeId: "eave-l",
      materialId: "steel",
      sectionId: "col",
      theory: { kind: "euler-bernoulli" },
      orientation: [1, 0, 0],
      releases: { start: ["rx", "ry", "rz"] },
    })
    .addFrame({
      id: "col-r",
      startNodeId: "base-r",
      endNodeId: "eave-r",
      materialId: "steel",
      sectionId: "col",
      theory: { kind: "euler-bernoulli" },
      orientation: [1, 0, 0],
      releases: { start: ["rx", "ry", "rz"] },
    })
    .addFrame({
      id: "rafter-l",
      startNodeId: "eave-l",
      endNodeId: "ridge",
      materialId: "steel",
      sectionId: "rafter",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
      rigidOffsets: { start: [0, 0.2, 0], end: [0, 0.2, 0] },
    })
    .addFrame({
      id: "rafter-r",
      startNodeId: "ridge",
      endNodeId: "eave-r",
      materialId: "steel",
      sectionId: "rafter",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
      rigidOffsets: { start: [0, 0.2, 0], end: [0, 0.2, 0] },
    })
    .addTruss({
      id: "tie",
      startNodeId: "eave-l",
      endNodeId: "eave-r",
      materialId: "steel",
      sectionId: "tie",
    });

  for (const n of ["base-l", "base-r"])
    for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const)
      builder.addConstraint({
        id: `pin:${n}:${dof}`,
        terms: [{ nodeId: n, dof, coefficient: 1 }],
        rightHandSide: 0,
      });
  // Out-of-plane restraint so the 2D slice stays stable in 3D.
  for (const n of ["eave-l", "ridge", "eave-r"])
    builder.addConstraint({
      id: `brace:${n}:tz`,
      terms: [{ nodeId: n, dof: "tz", coefficient: 1 }],
      rightHandSide: 0,
    });

  const result = prepareAnalysis(
    builder
      .addLoadCase({
        id: "service",
        loads: [
          {
            kind: "member-distributed",
            frameId: "rafter-l",
            coordinateSystem: "local",
            startIntensity: [0, -3000, 0],
            endIntensity: [0, -3000, 0],
          },
          {
            kind: "member-distributed",
            frameId: "rafter-r",
            coordinateSystem: "local",
            startIntensity: [0, -3000, 0],
            endIntensity: [0, -3000, 0],
          },
          {
            kind: "member-point-force",
            frameId: "col-l",
            coordinateSystem: "local",
            distanceFromElasticStart: 4,
            force: [5000, 0, 0],
          },
          { kind: "self-weight", gravity: [0, -9.80665, 0] },
        ],
      })
      .finalize(),
  ).solveCase("service");

  const node = (id: string) => result.nodes.find((n) => n.id === id)!;
  const pinnedBaseMoment = node("base-l").reactions.find((r) => r.dof === "rz")?.value ?? 0;
  const eaveDisplacement = node("eave-l").displacements.find((d) => d.dof === "tx")!.value;
  const trussAxial = result.trusses[0]!.axialForce;

  return Object.freeze({
    eaveDisplacement,
    pinnedBaseMoment,
    trussAxial,
    ridgeSettlement: node("ridge").displacements.find((d) => d.dof === "ty")!.value,
    diagnosticStatus: result.diagnostics.status,
  });
}
