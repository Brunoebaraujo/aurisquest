import { describe, expect, it } from "vitest";
import { clampGuardianStep, guardianCanAutoStart, guardianRestart, nextGuardianStatus } from "./guardianTourState";

describe("guardian tour state", () => {
  it("starts a first-time onboarding but does not restart a dismissed tutorial", () => {
    expect(guardianCanAutoStart(undefined, true)).toBe(true);
    expect(guardianCanAutoStart("dismissed", false)).toBe(false);
    expect(guardianCanAutoStart("completed", false)).toBe(false);
  });

  it("clamps progress on reload and completes only on the final step", () => {
    expect(clampGuardianStep(99, 5)).toBe(4);
    expect(clampGuardianStep(-2, 5)).toBe(0);
    expect(nextGuardianStatus(3, 5)).toBe("in_progress");
    expect(nextGuardianStatus(4, 5)).toBe("completed");
  });

  it("restarts only guidance, never business records", () => {
    expect(guardianRestart()).toEqual({ current_phase: "app", current_step: 0, status: "not_started" });
  });
});
