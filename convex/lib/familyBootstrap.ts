export type BootstrapInviteRecord = {
  familyId: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: number;
  acceptedByUserId?: string;
};

export type FamilyBootstrapDecision =
  | {
      kind: "use-existing-membership";
      familyId: string;
    }
  | {
      kind: "accept-invite";
      familyId: string;
    }
  | {
      kind: "create-family";
    };

export function decideFamilyBootstrap(args: {
  authUserId: string;
  now: number;
  existingMembershipFamilyId?: string | null;
  invite?: BootstrapInviteRecord | null;
}): FamilyBootstrapDecision {
  const { authUserId, existingMembershipFamilyId, invite, now } = args;

  if (!invite) {
    if (existingMembershipFamilyId) {
      return {
        kind: "use-existing-membership",
        familyId: existingMembershipFamilyId,
      };
    }
    return { kind: "create-family" };
  }

  if (
    existingMembershipFamilyId &&
    existingMembershipFamilyId !== invite.familyId
  ) {
    throw new Error("This account already belongs to another family");
  }

  if (invite.status === "pending") {
    if (invite.expiresAt < now) {
      throw new Error("Invite has expired");
    }

    return {
      kind: "accept-invite",
      familyId: invite.familyId,
    };
  }

  if (
    invite.status === "accepted" &&
    invite.acceptedByUserId === authUserId &&
    existingMembershipFamilyId === invite.familyId
  ) {
    return {
      kind: "use-existing-membership",
      familyId: invite.familyId,
    };
  }

  if (invite.status === "accepted") {
    throw new Error("Invite has already been used");
  }

  throw new Error("Invite has expired");
}
