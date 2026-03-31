import { describe, expect, it } from "vitest";
import { buildAuthPath, parseAuthSearch } from "./authUrl";

describe("auth URL helpers", () => {
  it("preserves safe in-app redirects", () => {
    expect(parseAuthSearch("?redirect=%2Fmeal-planner")).toEqual({
      inviteToken: null,
      redirectTarget: "/meal-planner",
    });
  });

  it("falls back to root for invalid redirects", () => {
    expect(parseAuthSearch("?redirect=https://example.com")).toEqual({
      inviteToken: null,
      redirectTarget: "/",
    });
  });

  it("round-trips invite tokens in auth URLs", () => {
    expect(
      buildAuthPath({
        inviteToken: "invite_123",
        redirectTo: "/family",
      }),
    ).toBe("/auth?invite=invite_123&redirect=%2Ffamily");
  });
});
