# Security Reporting

Report suspected vulnerabilities privately to the repository maintainer through the hosting platform's private security-advisory channel. Do not publish an exploit before a fix is available.

Include the affected xframe version and schema version, runtime/browser, minimal reproducer, expected and actual behavior, impact, and whether hostile JSON or identifiers are involved. Remove confidential structural models and credentials from the report.

Security-relevant boundaries include parsed JSON, identifiers, canonical serialization, artifact hashing, memory preflight, non-finite numeric rejection, package exports, and browser-safe runtime imports. Structural-analysis disagreement without an adversarial trigger is usually a numerical correctness issue, but should still be reported with a complete reproducible model.

The project does not accept security-by-obscurity fixes, silent input coercion, swallowed failures, or prototype-backed registries for untrusted identifiers.
