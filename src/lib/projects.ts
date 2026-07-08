import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server-component helper: loads a project the current user is a member of,
 * redirecting to /login or 404ing as appropriate.
 */
export async function getProjectOr404(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
    include: { project: true },
  });
  if (!membership) notFound();

  return { project: membership.project, role: membership.role, userId: session.user.id };
}
