import { describe, expect, it } from "vitest";
import { safeAppVersion, safeReleaseNotes } from "../lib/release-context";

describe("release context", () => {
  it("normalizes and bounds non-secret configured release notes", () => {
    expect(safeReleaseNotes("  Governance\nrelease  ")).toBe("Governance release");
    expect(safeReleaseNotes(undefined)).toBe("No deployment notes were configured for this build.");
    expect(safeReleaseNotes("x".repeat(700))).toHaveLength(500);
  });

  it("does not substitute an unsafe or unavailable version", () => {
    expect(safeAppVersion("1.0.0")).toBe("1.0.0");
    expect(safeAppVersion("")).toBe("Version unavailable");
    expect(safeAppVersion("x".repeat(61))).toBe("Version unavailable");
  });
});
