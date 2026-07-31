import { multiSystemSelfLiteratureValidationCases } from "./multi-system-self-literature-cases.js";
import { offsetGeometrySupportValidationCases } from "./offset-geometry-support-cases.js";
import { singleMemberValidationCases } from "./single-member-cases.js";
import { springReleaseLoadValidationCases } from "./spring-release-load-cases.js";

export const requestedValidationCases = Object.freeze([
  ...singleMemberValidationCases,
  ...offsetGeometrySupportValidationCases,
  ...springReleaseLoadValidationCases,
  ...multiSystemSelfLiteratureValidationCases,
]);
