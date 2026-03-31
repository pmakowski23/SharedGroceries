import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import {
  ActionCtx,
  MutationCtx,
  QueryCtx,
  mutation,
  query,
} from "./_generated/server";
import { authComponent } from "./auth";
import { authSiteUrl } from "./authSite";
import { env } from "./env";
import { decideFamilyBootstrap } from "./lib/familyBootstrap";
import { createDefaultCategories } from "./lib/groceryTaxonomy";
import { nowEpochMs } from "./lib/time";

const resendApiKey = env.RESEND_API_KEY;
const authEmailFrom = env.AUTH_EMAIL_FROM;

type AuthUser = Awaited<ReturnType<typeof authComponent.getAuthUser>>;

type ViewerContext = {
  authUser: AuthUser;
  userProfile: Doc<"userProfiles">;
  membership: Doc<"familyMembers">;
  family: Doc<"families">;
  memberProfile: Doc<"memberProfiles"> | null;
};

type QueryOrMutationCtx = QueryCtx | MutationCtx;

function normalizeEmail(email: string | undefined) {
  return email?.trim().toLowerCase();
}

function buildFamilyName(name: string | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "Shared Family";
  }
  if (trimmed.endsWith(" Family")) {
    return trimmed;
  }
  return `${trimmed.split(" ")[0]} Family`;
}

function summarizeMember(memberProfile: Doc<"memberProfiles"> | null) {
  return {
    dietPreference: memberProfile?.dietPreference ?? "none",
    preferenceNotes: memberProfile?.preferenceNotes ?? "",
    hardExclusions: [
      memberProfile?.excludeBeef ? "Beef" : null,
      memberProfile?.excludePork ? "Pork" : null,
      memberProfile?.excludeSeafood ? "Seafood" : null,
      memberProfile?.excludeDairy ? "Dairy" : null,
      memberProfile?.excludeEggs ? "Eggs" : null,
      memberProfile?.excludeGluten ? "Gluten" : null,
      memberProfile?.excludeNuts ? "Nuts" : null,
    ].filter((value): value is string => value !== null),
    hasTargets:
      memberProfile?.targetKcal !== undefined &&
      memberProfile?.targetProtein !== undefined &&
      memberProfile?.targetCarbs !== undefined &&
      memberProfile?.targetFat !== undefined,
  };
}

async function sendInviteEmail(args: {
  email: string;
  inviteUrl: string;
  familyName: string;
  inviterName?: string;
}) {
  if (!resendApiKey || !authEmailFrom) {
    return false;
  }

  const inviterLine = args.inviterName
    ? `${args.inviterName} invited you to join ${args.familyName}.`
    : `You were invited to join ${args.familyName}.`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: authEmailFrom,
      to: args.email,
      subject: `Join ${args.familyName} on Shared Groceries`,
      html: [
        `<p>${inviterLine}</p>`,
        "<p>Open the activation link below, then continue with Google.</p>",
        `<p><a href="${args.inviteUrl}">${args.inviteUrl}</a></p>`,
      ].join(""),
    }),
  });

  return response.ok;
}

async function getUserProfileByAuthUserId(
  ctx: QueryOrMutationCtx,
  betterAuthUserId: string,
) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_betterAuthUserId", (q) =>
      q.eq("betterAuthUserId", betterAuthUserId),
    )
    .first();
}

async function getMembershipByAuthUserId(
  ctx: QueryOrMutationCtx,
  betterAuthUserId: string,
) {
  return await ctx.db
    .query("familyMembers")
    .withIndex("by_betterAuthUserId", (q) =>
      q.eq("betterAuthUserId", betterAuthUserId),
    )
    .first();
}

async function getInviteByToken(ctx: QueryOrMutationCtx, token: string) {
  return await ctx.db
    .query("familyInvites")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
}

async function getOrCreateUserProfile(ctx: MutationCtx, authUser: AuthUser) {
  const existing = await getUserProfileByAuthUserId(ctx, authUser._id);
  const patch = {
    email: normalizeEmail(authUser.email),
    name: authUser.name || undefined,
    image: authUser.image || undefined,
  };

  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return {
      ...(await ctx.db.get(existing._id))!,
    };
  }

  const userProfileId = await ctx.db.insert("userProfiles", {
    betterAuthUserId: authUser._id,
    createdAt: nowEpochMs(),
    ...patch,
  });

  return (await ctx.db.get(userProfileId))!;
}

async function ensureMemberProfile(
  ctx: MutationCtx,
  familyId: Id<"families">,
  authUser: AuthUser,
) {
  const existing = await ctx.db
    .query("memberProfiles")
    .withIndex("by_familyId_and_betterAuthUserId", (q) =>
      q.eq("familyId", familyId).eq("betterAuthUserId", authUser._id),
    )
    .first();

  if (existing) {
    if (authUser.name && existing.displayName !== authUser.name) {
      await ctx.db.patch(existing._id, {
        displayName: authUser.name,
      });
      return (await ctx.db.get(existing._id))!;
    }
    return existing;
  }

  const memberProfileId = await ctx.db.insert("memberProfiles", {
    familyId,
    betterAuthUserId: authUser._id,
    displayName: authUser.name || authUser.email || "Family member",
    dietPreference: "none",
    macroTolerancePct: 5,
    excludeBeef: false,
    excludePork: false,
    excludeSeafood: false,
    excludeDairy: false,
    excludeEggs: false,
    excludeGluten: false,
    excludeNuts: false,
    preferenceNotes: "",
  });

  return (await ctx.db.get(memberProfileId))!;
}

async function createFreshFamilyWorkspace(
  ctx: MutationCtx,
  authUser: AuthUser,
  userProfile: Doc<"userProfiles">,
) {
  const now = nowEpochMs();
  const familyId = await ctx.db.insert("families", {
    name: buildFamilyName(authUser.name || userProfile.name),
    createdByUserId: authUser._id,
    createdAt: now,
  });

  const storeId = await ctx.db.insert("stores", {
    familyId,
    name: "Default Store",
    isDefault: true,
    createdAt: now,
  });
  await createDefaultCategories(ctx, storeId, familyId);
  await ctx.db.patch(familyId, {
    currentStoreId: storeId,
  });
  await ctx.db.insert("familyMembers", {
    familyId,
    betterAuthUserId: authUser._id,
    role: "owner",
    joinedAt: now,
  });
  await ensureMemberProfile(ctx, familyId, authUser);

  return familyId;
}

async function acceptInviteForUser(args: {
  ctx: MutationCtx;
  authUser: AuthUser;
  invite: Doc<"familyInvites">;
  existingMembership: Doc<"familyMembers"> | null;
}) {
  const { ctx, authUser, invite, existingMembership } = args;

  if (!existingMembership) {
    await ctx.db.insert("familyMembers", {
      familyId: invite.familyId,
      betterAuthUserId: authUser._id,
      role: "member",
      joinedAt: nowEpochMs(),
    });
  }

  if (
    invite.status !== "accepted" ||
    invite.acceptedByUserId !== authUser._id
  ) {
    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedAt: nowEpochMs(),
      acceptedByUserId: authUser._id,
    });
  }

  await ensureMemberProfile(ctx, invite.familyId, authUser);
  return invite.familyId;
}

export async function requireViewer(
  ctx: QueryOrMutationCtx,
): Promise<ViewerContext> {
  const authUser = await authComponent.getAuthUser(ctx as any);
  const membership = await getMembershipByAuthUserId(ctx, authUser._id);
  if (!membership) {
    throw new ConvexError("Family workspace is not initialized");
  }

  const family = await ctx.db.get(membership.familyId);
  if (!family) {
    throw new ConvexError("Family not found");
  }

  const userProfile = await getUserProfileByAuthUserId(ctx, authUser._id);
  if (!userProfile) {
    throw new ConvexError("User profile not found");
  }

  const memberProfile = await ctx.db
    .query("memberProfiles")
    .withIndex("by_familyId_and_betterAuthUserId", (q) =>
      q.eq("familyId", family._id).eq("betterAuthUserId", authUser._id),
    )
    .first();

  return {
    authUser,
    userProfile,
    membership,
    family,
    memberProfile,
  };
}

export async function getViewerForAction(ctx: ActionCtx) {
  return await ctx.runQuery(api.families.getViewerRuntimeContext, {});
}

export async function listFamilyMemberProfiles(
  ctx: QueryCtx | MutationCtx,
  familyId: Id<"families">,
) {
  return await ctx.db
    .query("memberProfiles")
    .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
    .collect();
}

export const bootstrapCurrentUser = mutation({
  args: {
    inviteToken: v.optional(v.string()),
  },
  returns: v.object({
    familyId: v.id("families"),
  }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx as any);
    const userProfile = await getOrCreateUserProfile(ctx, authUser);
    const existingMembership = await getMembershipByAuthUserId(ctx, authUser._id);
    const invite = args.inviteToken
      ? await getInviteByToken(ctx, args.inviteToken)
      : null;

    if (args.inviteToken && !invite) {
      throw new ConvexError("Invite not found");
    }

    let decision;
    try {
      decision = decideFamilyBootstrap({
        authUserId: authUser._id,
        now: nowEpochMs(),
        existingMembershipFamilyId: existingMembership?.familyId ?? null,
        invite: invite
          ? {
              familyId: invite.familyId,
              status: invite.status,
              expiresAt: invite.expiresAt,
              acceptedByUserId: invite.acceptedByUserId,
            }
          : null,
      });
    } catch (error) {
      throw new ConvexError(error instanceof Error ? error.message : String(error));
    }

    if (decision.kind === "use-existing-membership") {
      const familyId = decision.familyId as Id<"families">;
      await ensureMemberProfile(ctx, familyId, authUser);
      return {
        familyId,
      };
    }

    if (decision.kind === "accept-invite") {
      if (!invite) {
        throw new ConvexError("Invite not found");
      }

      const familyId = await acceptInviteForUser({
        ctx,
        authUser,
        invite,
        existingMembership,
      });
      return { familyId };
    }

    return {
      familyId: await createFreshFamilyWorkspace(ctx, authUser, userProfile),
    };
  },
});

export const getInvitePreview = query({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      familyName: v.string(),
      email: v.union(v.string(), v.null()),
      isExpired: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const invite = await getInviteByToken(ctx, args.token);
    if (!invite) {
      return null;
    }

    const family = await ctx.db.get(invite.familyId);
    if (!family) {
      return null;
    }

    return {
      familyName: family.name,
      email: invite.email ?? null,
      isExpired: invite.status !== "pending" || invite.expiresAt < nowEpochMs(),
    };
  },
});

export const getViewerRuntimeContext = query({
  args: {},
  returns: v.object({
    familyId: v.id("families"),
    currentStoreId: v.union(v.id("stores"), v.null()),
    betterAuthUserId: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
  }),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    return {
      familyId: viewer.family._id,
      currentStoreId: viewer.family.currentStoreId ?? null,
      betterAuthUserId: viewer.authUser._id,
      role: viewer.membership.role,
    };
  },
});

export const getFamilyHub = query({
  args: {},
  returns: v.object({
    family: v.object({
      _id: v.id("families"),
      name: v.string(),
      currentStoreId: v.union(v.id("stores"), v.null()),
    }),
    viewer: v.object({
      betterAuthUserId: v.string(),
      role: v.union(v.literal("owner"), v.literal("member")),
      email: v.union(v.string(), v.null()),
      name: v.union(v.string(), v.null()),
    }),
    members: v.array(
      v.object({
        betterAuthUserId: v.string(),
        role: v.union(v.literal("owner"), v.literal("member")),
        joinedAt: v.number(),
        displayName: v.string(),
        email: v.union(v.string(), v.null()),
        dietPreference: v.string(),
        hardExclusions: v.array(v.string()),
        preferenceNotes: v.string(),
        hasTargets: v.boolean(),
      }),
    ),
    invites: v.array(
      v.object({
        _id: v.id("familyInvites"),
        email: v.union(v.string(), v.null()),
        status: v.string(),
        expiresAt: v.number(),
        token: v.string(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId", (q) => q.eq("familyId", viewer.family._id))
      .collect();
    const memberProfiles = await ctx.db
      .query("memberProfiles")
      .withIndex("by_familyId", (q) => q.eq("familyId", viewer.family._id))
      .collect();
    const userProfiles = await Promise.all(
      members.map((member) =>
        getUserProfileByAuthUserId(ctx, member.betterAuthUserId),
      ),
    );
    const memberProfileByUserId = new Map(
      memberProfiles.map((profile) => [profile.betterAuthUserId, profile]),
    );
    const userProfileByUserId = new Map(
      userProfiles
        .filter((profile): profile is Doc<"userProfiles"> => profile !== null)
        .map((profile) => [profile.betterAuthUserId, profile]),
    );
    const invites = await ctx.db
      .query("familyInvites")
      .withIndex("by_familyId", (q) => q.eq("familyId", viewer.family._id))
      .collect();

    return {
      family: {
        _id: viewer.family._id,
        name: viewer.family.name,
        currentStoreId: viewer.family.currentStoreId ?? null,
      },
      viewer: {
        betterAuthUserId: viewer.authUser._id,
        role: viewer.membership.role,
        email: normalizeEmail(viewer.authUser.email) ?? null,
        name: viewer.authUser.name || null,
      },
      members: members
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((member) => {
          const profile =
            memberProfileByUserId.get(member.betterAuthUserId) ?? null;
          const userProfile = userProfileByUserId.get(member.betterAuthUserId);
          return {
            betterAuthUserId: member.betterAuthUserId,
            role: member.role,
            joinedAt: member.joinedAt,
            displayName:
              profile?.displayName ||
              userProfile?.name ||
              userProfile?.email ||
              "Family member",
            email: userProfile?.email ?? null,
            ...summarizeMember(profile),
          };
        }),
      invites: invites
        .filter((invite) => invite.status === "pending")
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((invite) => ({
          _id: invite._id,
          email: invite.email ?? null,
          status: invite.status,
          expiresAt: invite.expiresAt,
          token: invite.token,
        })),
    };
  },
});

export const createInvite = mutation({
  args: {
    email: v.optional(v.string()),
  },
  returns: v.object({
    inviteId: v.id("familyInvites"),
    inviteUrl: v.string(),
    emailSent: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    if (viewer.membership.role !== "owner") {
      throw new ConvexError("Only the family owner can create invites");
    }

    const token = crypto.randomUUID().replaceAll("-", "");
    const inviteId = await ctx.db.insert("familyInvites", {
      familyId: viewer.family._id,
      email: normalizeEmail(args.email),
      token,
      createdByUserId: viewer.authUser._id,
      status: "pending",
      expiresAt: nowEpochMs() + 1000 * 60 * 60 * 24 * 7,
      createdAt: nowEpochMs(),
    });
    const inviteUrl = `${authSiteUrl}/auth?invite=${token}`;
    const emailSent =
      args.email !== undefined
        ? await sendInviteEmail({
            email: args.email,
            inviteUrl,
            familyName: viewer.family.name,
            inviterName: viewer.authUser.name || undefined,
          })
        : false;

    return {
      inviteId,
      inviteUrl,
      emailSent,
    };
  },
});

export const revokeInvite = mutation({
  args: {
    inviteId: v.id("familyInvites"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    if (viewer.membership.role !== "owner") {
      throw new ConvexError("Only the family owner can revoke invites");
    }
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.familyId !== viewer.family._id) {
      throw new ConvexError("Invite not found");
    }
    await ctx.db.patch(invite._id, {
      status: "revoked",
    });
    return null;
  },
});

export const updateFamilyName = mutation({
  args: {
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    if (viewer.membership.role !== "owner") {
      throw new ConvexError("Only the family owner can rename the family");
    }
    await ctx.db.patch(viewer.family._id, {
      name: args.name.trim(),
    });
    return null;
  },
});

export const removeMember = mutation({
  args: {
    betterAuthUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    if (viewer.membership.role !== "owner") {
      throw new ConvexError("Only the family owner can remove members");
    }
    if (args.betterAuthUserId === viewer.authUser._id) {
      throw new ConvexError("The owner cannot remove themselves");
    }

    const membership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_betterAuthUserId", (q) =>
        q
          .eq("familyId", viewer.family._id)
          .eq("betterAuthUserId", args.betterAuthUserId),
      )
      .first();

    if (!membership) {
      throw new ConvexError("Member not found");
    }

    const memberProfile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_familyId_and_betterAuthUserId", (q) =>
        q
          .eq("familyId", viewer.family._id)
          .eq("betterAuthUserId", args.betterAuthUserId),
      )
      .first();

    await ctx.db.delete(membership._id);
    if (memberProfile) {
      await ctx.db.delete(memberProfile._id);
    }
    return null;
  },
});
