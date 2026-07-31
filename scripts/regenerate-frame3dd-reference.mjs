import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const expectedBinaryHash = "53b1dc6628424b156e491e3205f13d58a0e325e33e4746d225b456ab85ac5275";
const root = resolve(import.meta.dirname, "..");
const binary = process.env.FRAME3DD_BIN;
if (!binary) throw new Error("FRAME3DD_BIN must point to the Frame3DD executable.");

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function parseMatrix(path, size = 12) {
  const values = readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim() && !line.trimStart().startsWith("%"))
    .flatMap((line) => line.trim().split(/\s+/u).map(Number));
  if (values.length !== size * size || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Expected a finite ${size}x${size} matrix in ${path}, received ${values.length} values.`);
  }
  return values;
}

function section(chunk, start, end) {
  const startIndex = chunk.indexOf(start);
  if (startIndex < 0) return "";
  const rest = chunk.slice(startIndex + start.length);
  const endIndex = rest.indexOf(end);
  return endIndex < 0 ? rest : rest.slice(0, endIndex);
}

function numericRows(text, count) {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim().split(/\s+/u))
    .filter((parts) => /^\d+$/u.test(parts[0] ?? "") && parts.length >= count)
    .map((parts) => parts.slice(0, count).map((value) => Number.parseFloat(value)));
}

function parseStaticCases(path, expectedCount, nodeCount, elementStartNodes) {
  const output = readFileSync(path, "utf8");
  const marker = /L O A D\s+C A S E\s+(\d+)\s+O F\s+(\d+)\s+\.\.\./gu;
  const matches = [...output.matchAll(marker)];
  const cases = [];
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const start = current.index ?? 0;
    const end = matches[index + 1]?.index ?? output.length;
    const chunk = output.slice(start, end);
    if (!chunk.includes("N O D E   D I S P L A C E M E N T S")) continue;
    const nodeDisplacements = Array.from({ length: nodeCount }, () => new Array(6).fill(0));
    for (const row of numericRows(
      section(
        chunk,
        "N O D E   D I S P L A C E M E N T S",
        "F R A M E   E L E M E N T   E N D   F O R C E S",
      ),
      7,
    )) {
      const node = row[0];
      if (node >= 1 && node <= nodeCount) nodeDisplacements[node - 1] = row.slice(1);
    }
    const elementEndForces = Array.from({ length: elementStartNodes.length }, () => new Array(12).fill(0));
    for (const row of numericRows(
      section(chunk, "F R A M E   E L E M E N T   E N D   F O R C E S", "R E A C T I O N S"),
      8,
    )) {
      const element = row[0];
      const node = row[1];
      if (element < 1 || element > elementStartNodes.length) continue;
      const offset = node === elementStartNodes[element - 1] ? 0 : 6;
      elementEndForces[element - 1].splice(offset, 6, ...row.slice(2));
    }
    const reactions = Array.from({ length: nodeCount }, () => new Array(6).fill(0));
    for (const row of numericRows(section(chunk, "R E A C T I O N S", "R M S"), 7)) {
      const node = row[0];
      if (node >= 1 && node <= nodeCount) reactions[node - 1] = row.slice(1);
    }
    cases.push({ id: current[1], nodeDisplacements, elementEndForces, reactions });
  }
  if (cases.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} static result cases, received ${cases.length}.`);
  }
  return cases;
}

function execute(input, destination, args, files) {
  const temporary = mkdtempSync(join(tmpdir(), "xframe-frame3dd-"));
  try {
    const localInput = join(temporary, "input.3dd");
    cpSync(input, localInput);
    execFileSync(binary, args, { cwd: temporary, stdio: ["ignore", "pipe", "pipe"] });
    rmSync(destination, { recursive: true, force: true });
    mkdirSync(destination, { recursive: true });
    for (const file of files) cpSync(join(temporary, file), join(destination, file));
    return temporary;
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}

function finishTemporary(temporary) {
  rmSync(temporary, { recursive: true, force: true });
}

const binaryHash = sha256(binary);
if (binaryHash !== expectedBinaryHash) throw new Error(`Unexpected Frame3DD binary SHA-256: ${binaryHash}`);
execFileSync(binary, ["-v"], { stdio: "ignore" });

const commonOracle = (input, args, note) => ({
  name: "Frame3DD",
  version: "20140514+",
  binarySha256: binaryHash,
  inputSha256: sha256(input),
  geometricStiffness: false,
  command: ["FRAME3DD_BIN", ...args],
  ...(note === undefined ? {} : { note }),
});

const cantileverInput = join(root, "verification/reference-data/frame3dd/cantilever.3dd");
for (const [name, shear] of [
  ["euler", "Off"],
  ["timoshenko", "On"],
]) {
  const destination = join(root, `verification/reference-data/frame3dd/cantilever-${name}`);
  const args = ["-i", "input.3dd", "-o", "output.out", "-d", "-w", "-g", "Off", "-s", shear, "-q"];
  const temporary = execute(cantileverInput, destination, args, [
    "input.3dd",
    "output.out",
    "output_out.CSV",
    "k_001",
    "Ks",
  ]);
  try {
    const cases = parseStaticCases(join(temporary, "output.out"), 6, 2, [1]);
    const reference = {
      oracle: {
        ...commonOracle(cantileverInput, args),
        shearDeformation: shear === "On",
      },
      units: {
        length: "mm",
        force: "N",
        moment: "N*mm",
        modulus: "N/mm^2",
        distributedForce: "N/mm",
        density: "tonne/mm^3",
        rotation: "rad",
      },
      tolerances: {
        matrices: {
          relative: 2e-7,
          absolute: 1e-8,
          reason:
            "Frame3DD stores section and material properties as IEEE-754 single-precision floats before emitting twelve-digit debug matrices.",
        },
        results: {
          relative: 2e-5,
          absolute: 2e-7,
          reason: "Frame3DD text results are printed with approximately six decimal digits.",
        },
      },
      elementStiffness: parseMatrix(join(temporary, "k_001")),
      globalStiffness: parseMatrix(join(temporary, "Ks")),
      cases: cases.map(({ id, nodeDisplacements, elementEndForces, reactions }) => ({
        id,
        nodeDisplacements,
        localEndForces: elementEndForces[0],
        reactions,
      })),
    };
    writeFileSync(join(destination, "reference.json"), `${JSON.stringify(reference, null, 2)}\n`);
  } finally {
    finishTemporary(temporary);
  }
}

function generateSingleCase({
  inputName,
  destinationName,
  nodeCount,
  elementStartNodes,
  units,
  note,
  includeStiffness,
}) {
  const input = join(root, `verification/reference-data/frame3dd/${inputName}`);
  const destination = join(root, `verification/reference-data/frame3dd/${destinationName}`);
  const args = ["-i", "input.3dd", "-o", "output.out", "-d", "-w", "-g", "Off", "-s", "Off", "-q"];
  const matrixFiles = elementStartNodes.map((_, index) => `k_${String(index + 1).padStart(3, "0")}`);
  const temporary = execute(input, destination, args, [
    "input.3dd",
    "output.out",
    "output_out.CSV",
    "Ks",
    ...matrixFiles,
  ]);
  try {
    const result = parseStaticCases(
      join(temporary, "output.out"),
      1,
      nodeCount,
      elementStartNodes,
    )[0];
    const reference = {
      oracle: {
        ...commonOracle(input, args, note),
        shearDeformation: false,
      },
      units,
      tolerances: {
        matrices: { relative: 2e-7, absolute: 1e-8 },
        results: { relative: 2e-5, absolute: 2e-7 },
      },
      nodes: result.nodeDisplacements.map((displacements, index) => ({
        id: String(index + 1),
        displacements,
        reactions: result.reactions[index],
      })),
      elements: result.elementEndForces.map((localEndForces, index) => ({
        id: String(index + 1),
        localEndForces,
      })),
      ...(includeStiffness
        ? {
            elementStiffness: matrixFiles.map((file) => parseMatrix(join(temporary, file))),
            globalStiffness: parseMatrix(join(temporary, "Ks"), nodeCount * 6),
          }
        : {}),
    };
    writeFileSync(join(destination, "reference.json"), `${JSON.stringify(reference, null, 2)}\n`);
  } finally {
    finishTemporary(temporary);
  }
}

generateSingleCase({
  inputName: "frame-chain.3dd",
  destinationName: "frame-chain-euler",
  nodeCount: 3,
  elementStartNodes: [1, 2],
  units: {
    length: "mm",
    force: "N",
    moment: "N*mm",
    modulus: "N/mm^2",
    distributedForce: "N/mm",
    density: "tonne/mm^3",
    rotation: "rad",
  },
  note: "Two collinear frame elements with distinct properties exercise multi-member assembly.",
  includeStiffness: true,
});

generateSingleCase({
  inputName: "triangular-truss.3dd",
  destinationName: "triangular-truss",
  nodeCount: 3,
  elementStartNodes: [1, 1, 2],
  units: {
    length: "m",
    force: "N",
    moment: "N*m",
    modulus: "Pa",
    distributedForce: "N/m",
    density: "kg/m^3",
    rotation: "rad",
  },
  note: "Frame3DD approximates truss behavior with tiny positive bending and torsion properties.",
  includeStiffness: false,
});

generateSingleCase({
  inputName: "portal-frame.3dd",
  destinationName: "portal-frame-euler",
  nodeCount: 4,
  elementStartNodes: [1, 2, 4],
  units: {
    length: "mm",
    force: "N",
    moment: "N*mm",
    modulus: "N/mm^2",
    distributedForce: "N/mm",
    density: "tonne/mm^3",
    rotation: "rad",
  },
  note: "Single-bay 3D portal frame under combined lateral, vertical, and out-of-plane nodal loads.",
  includeStiffness: true,
});

generateSingleCase({
  inputName: "two-story-two-bay.3dd",
  destinationName: "two-story-two-bay-euler",
  nodeCount: 9,
  elementStartNodes: [1, 2, 3, 4, 5, 6, 4, 5, 7, 8],
  units: {
    length: "mm",
    force: "N",
    moment: "N*mm",
    modulus: "N/mm^2",
    distributedForce: "N/mm",
    density: "tonne/mm^3",
    rotation: "rad",
  },
  note: "Two-story two-bay 3D frame under combined lateral, vertical, and out-of-plane top-story loads.",
  includeStiffness: true,
});
