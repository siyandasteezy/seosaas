import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

const ROLE_ORDER: Record<Role, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function roleAtLeast(role: Role, min: Role) {
  return ROLE_ORDER[role] >= ROLE_ORDER[min];
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Not authenticated");
  return session.user;
}

/**
 * Ensures the current user is a member of the project with at least
 * `minRole`. Returns the user and their membership.
 */
export async function requireProjectRole(projectId: string, minRole: Role = "VIEWER") {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
  });
  if (!membership) throw new ApiError(404, "Project not found");
  if (!roleAtLeast(membership.role, minRole)) {
    throw new ApiError(403, "Insufficient permissions");
  }
  return { user, membership };
}
