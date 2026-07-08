import { prisma } from "@/lib/prisma";
import { getProjectOr404 } from "@/lib/projects";
import KeywordManager from "@/components/KeywordManager";

export const metadata = { title: "Keywords" };

export default async function KeywordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getProjectOr404(id);

  const keywords = await prisma.keyword.findMany({
    where: { projectId: id },
    include: { rankings: { orderBy: { checkedAt: "desc" }, take: 10 } },
    orderBy: { phrase: "asc" },
  });

  const rows = keywords.map((k) => ({
    id: k.id,
    phrase: k.phrase,
    country: k.country,
    device: k.device,
    history: k.rankings
      .map((r) => ({ position: r.position, checkedAt: r.checkedAt.toISOString() }))
      .reverse(),
  }));

  return <KeywordManager projectId={id} initialKeywords={rows} canEdit={role !== "VIEWER"} />;
}
