import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@ranklens.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user already exists — skipping seed.");
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: "Demo User",
      passwordHash: await bcrypt.hash("password123", 12),
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Demo — example.com",
      domain: "example.com",
      scanFrequency: "WEEKLY",
      memberships: { create: { userId: user.id, role: "OWNER" } },
      keywords: {
        createMany: {
          data: [
            { phrase: "seo tools", country: "us", device: "DESKTOP" },
            { phrase: "keyword rank tracker", country: "us", device: "DESKTOP" },
            { phrase: "backlink checker", country: "us", device: "MOBILE" },
            { phrase: "technical seo audit", country: "gb", device: "DESKTOP" },
          ],
        },
      },
    },
  });

  console.log(`Seeded demo account: ${email} / password123 (project ${project.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
