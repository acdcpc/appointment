import { describe, expect, it } from "vitest";
import { environmentLabel, resolveAppEnvironment } from "../lib/app-environment";

describe("build environment indicator", () => {
  it("labels explicit production values as the live environment", () => { expect(resolveAppEnvironment("production")).toBe("live"); expect(environmentLabel("live")).toBe("Live environment"); });
  it("keeps the default non-live context visibly staging", () => { expect(environmentLabel(undefined)).toBe("Staging"); });
  it("does not infer production from an unknown value", () => { expect(environmentLabel("preview-42")).toBe("Local"); });
});
