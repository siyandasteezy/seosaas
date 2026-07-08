import { getProjectOr404 } from "@/lib/projects";
import ProjectTabs from "@/components/ProjectTabs";
import RunScanButton from "@/components/RunScanButton";
import { Badge } from "@/components/ui";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project, role } = await getProjectOr404(id);
  const canScan = role !== "VIEWER";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge color="gray">{role.toLowerCase()}</Badge>
          </div>
          <a
            href={`https://${project.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:underline"
          >
            {project.domain}
          </a>
          {project.lastScanAt && (
            <span className="ml-3 text-xs text-slate-400">
              Last scan {project.lastScanAt.toLocaleString()}
            </span>
          )}
        </div>
        {canScan && <RunScanButton projectId={project.id} />}
      </div>
      <ProjectTabs projectId={project.id} />
      {children}
    </div>
  );
}
