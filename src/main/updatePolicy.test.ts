import { getUpdateUnavailableReason } from "./updatePolicy";

describe("portable update policy", () => {
  it.each(["win32", "darwin"] as const)("preserves packaged %s updates", platform => {
    expect(getUpdateUnavailableReason(true, platform)).toBeUndefined();
  });
  it.each(["win32", "darwin", "linux"] as const)("blocks development updates on %s", platform => {
    expect(getUpdateUnavailableReason(false, platform)).toContain("development mode");
  });
  it("blocks Linux archives even when packaged", () => {
    expect(getUpdateUnavailableReason(true, "linux")).toContain("manually");
  });
});
