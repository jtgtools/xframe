import { expect, it } from "vitest";
import { runBasicTrussExample } from "../../examples/basic-truss.js";
import { runJsonRoundtripExample } from "../../examples/json-roundtrip.js";

it("the documented truss example solves through the public API", () => {
  const output = runBasicTrussExample();
  expect(output.tipDisplacement).toBeCloseTo(1e-5, 14);
  expect(output.axialForce).toBeCloseTo(10_000, 10);
  expect(output.supportReaction).toBeCloseTo(-10_000, 10);
  expect(output.diagnosticStatus).toBe("pass");
});

it("the documented JSON example round-trips canonically", async () => {
  const output = await runJsonRoundtripExample();
  expect(output.sameCanonicalJson).toBe(true);
  expect(output.hash).toMatch(/^[0-9a-f]{64}$/);
  expect(output.displacement).toBeCloseTo(0.05, 14);
});
