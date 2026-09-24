import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { canonicalJson } from "../../src/serialization/canonical-json.js";
import { sha256Hex } from "../../src/serialization/sha-256.js";
import { computeModelFingerprint } from "../../src/model/model-fingerprint.js";
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
    ["c1", "a", "ux"],
    ["c2", "a", "uy"],
    ["c3", "a", "uz"],
    ["c4", "b", "uy"],
    ["c5", "b", "uz"],
  ] as const) {
    builder.addConstraint({ id, terms: [{ nodeId, dof, coefficient: 1 }], rightHandSide: 0 });
  }
  return builder.addLoadCase({
    id: "L",
    loads: [{ kind: "nodal", nodeId: "b", force: [1, 0, 0] }],
  });
}

function legacyFnv(value: unknown): string {
  const text = canonicalJson(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

async function webCryptoSha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

it("matches the published SHA-256 empty-string vector", () => {
  expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

it("matches the published SHA-256 abc vector", () => {
  expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

it("rejects SHA-256 inputs that exceed the memory limit", () => {
  expect(() => sha256Hex("abc", 2)).toThrowError(XFrameError);
  expect(failureCode(() => sha256Hex("abc", 2))).toBe("MEMORY_LIMIT_EXCEEDED");
});

function failureCode(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    if (error instanceof XFrameError) return error.code;
    throw error;
  }
  throw new Error("expected failure");
}

it.each([
  [55, "9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318"],
  [56, "b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a"],
  [63, "7d3e74a05d7db15bce4ad9ec0658ea98e3f06eeecf16b4c6fff2da457ddc2f34"],
  [64, "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb"],
  [65, "635361c48bb9eab14198e76ea8ab7f1a41685d6ad62aa9146d301d4f17eb0ae0"],
] as const)("FR-SAFE-001: handles the %d-byte SHA-256 block boundary", (length, expected) => {
  expect(sha256Hex("a".repeat(length))).toBe(expected);
});

it("hashes UTF-8 Unicode exactly as Web Crypto", async () => {
  const text = "Zażółć gęślą jaźń 😀";
  expect(sha256Hex(text)).toBe(await webCryptoSha256Hex(text));
  expect(computeModelFingerprint({ text })).toBe(
    `sha256:${await webCryptoSha256Hex(canonicalJson({ text }))}`,
  );
});

it("emits an exact lowercase SHA-256 model identity", () => {
  expect(computeModelFingerprint({ value: "model" })).toMatch(/^sha256:[0-9a-f]{64}$/u);
  expect(computeModelFingerprint({ value: "model" })).toBe(
    computeModelFingerprint({ value: "model" }),
  );
});

it("separates the reproduced full-model FNV collision", () => {
  const collisionAreas = [0.00018774158742744477, 0.00017468842144589873] as const;
  const builders = collisionAreas.map(collisionModel);
  const snapshots = builders.map((builder) => builder.snapshot());
  const firstSnapshot = snapshots[0]!;
  const secondSnapshot = snapshots[1]!;
  expect({
    ...firstSnapshot,
    trussSections: firstSnapshot.trussSections.map((section, index) => ({
      ...section,
      area: secondSnapshot.trussSections[index]!.area,
    })),
  }).toEqual(secondSnapshot);
  expect(legacyFnv(firstSnapshot)).toBe("fnv1a32:f39ba120");
  expect(legacyFnv(secondSnapshot)).toBe("fnv1a32:f39ba120");
  const models = builders.map((builder) => builder.finalize());
  expect(models[0]!.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
  expect(models[1]!.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
  expect(models[0]!.fingerprint).not.toBe(models[1]!.fingerprint);
});
