import { prisma } from "@/lib/prisma";
import { getProjectOr404 } from "@/lib/projects";
import ProjectSettings from "@/components/ProjectSettings";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, role, userId } = await getProjectOr404(id);

  const [members, googleCred] = await Promise.all([
    prisma.membership.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.googleCredential.findUnique({ where: { userId } }),
  ]);

  return (
    <ProjectSettings
      project={{
        id: project.id,
        name: project.name,
        domain: project.domain,
        gscSiteUrl: project.gscSiteUrl,
        ga4PropertyId: project.ga4PropertyId,
        scanFrequency: project.scanFrequency,
        emailAlerts: project.emailAlerts,
      }}
      members={members.map((m) => ({
        id: m.id,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
        isSelf: m.user.id === userId,
      }))}
      role={role}
      googleConnected={!!googleCred}
    />
  );
}
