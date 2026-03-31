import { describe, expect, it } from "vitest";
import { decideFamilyBootstrap } from "./familyBootstrap";

describe("decideFamilyBootstrap", () => {
  it("reuses an existing membership when there is no invite", () => {
    expect(
      decideFamilyBootstrap({
        authUserId: "user_1",
        now: 100,
        existingMembershipFamilyId: "family_1",
      }),
    ).toEqual({
      kind: "use-existing-membership",
      familyId: "family_1",
    });
  });

  it("creates a family for a first login without invite", () => {
    expect(
      decideFamilyBootstrap({
        authUserId: "user_1",
        now: 100,
      }),
    ).toEqual({
      kind: "create-family",
    });
  });

  it("accepts a valid invite for a user without membership", () => {
    expect(
      decideFamilyBootstrap({
        authUserId: "user_1",
        now: 100,
        invite: {
          familyId: "family_2",
          status: "pending",
          expiresAt: 101,
        },
      }),
    ).toEqual({
      kind: "accept-invite",
      familyId: "family_2",
    });
  });

  it("treats the same accepted invite as idempotent for the same user and family", () => {
    expect(
      decideFamilyBootstrap({
        authUserId: "user_1",
        now: 100,
        existingMembershipFamilyId: "family_2",
        invite: {
          familyId: "family_2",
          status: "accepted",
          expiresAt: 50,
          acceptedByUserId: "user_1",
        },
      }),
    ).toEqual({
      kind: "use-existing-membership",
      familyId: "family_2",
    });
  });

  it("fails when the account already belongs to a different family", () => {
    expect(() =>
      decideFamilyBootstrap({
        authUserId: "user_1",
        now: 100,
        existingMembershipFamilyId: "family_1",
        invite: {
          familyId: "family_2",
          status: "pending",
          expiresAt: 101,
        },
      }),
    ).toThrow("This account already belongs to another family");
  });

  it("fails for expired invites", () => {
    expect(() =>
      decideFamilyBootstrap({
        authUserId: "user_1",
        now: 100,
        invite: {
          familyId: "family_2",
          status: "pending",
          expiresAt: 99,
        },
      }),
    ).toThrow("Invite has expired");
  });

  it("fails for revoked invites", () => {
    expect(() =>
      decideFamilyBootstrap({
        authUserId: "user_1",
        now: 100,
        invite: {
          familyId: "family_2",
          status: "revoked",
          expiresAt: 101,
        },
      }),
    ).toThrow("Invite has expired");
  });

  it("fails for an accepted invite that belongs to another user", () => {
    expect(() =>
      decideFamilyBootstrap({
        authUserId: "user_1",
        now: 100,
        existingMembershipFamilyId: "family_2",
        invite: {
          familyId: "family_2",
          status: "accepted",
          expiresAt: 101,
          acceptedByUserId: "user_2",
        },
      }),
    ).toThrow("Invite has already been used");
  });
});
