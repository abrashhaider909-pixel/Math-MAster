import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const dataDir = process.cwd();
  const dbFile = `${dataDir}/data/db.json`;
  let initialStudents: any[] = [];
  if (fs.existsSync(dbFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
      initialStudents = parsed.students || [];
    } catch (e) {
      console.warn('Could not read local db.json for seed, using none');
    }
  }

  // Create or update admin
  const adminUser = {
    id: 1,
    username: process.env.ADMIN_USERNAME || 'abrash',
    password: process.env.ADMIN_PASSWORD || 'CHANGE_ME',
    name: process.env.ADMIN_NAME || 'Abrash (Educator Admin)',
  };

  await prisma.admin.upsert({
    where: { id: 1 },
    update: { username: adminUser.username, password: adminUser.password, name: adminUser.name },
    create: adminUser,
  });

  for (const s of initialStudents) {
    await prisma.student.upsert({
      where: { id: s.id },
      update: { username: s.username, data: s },
      create: { id: s.id, username: s.username, data: s },
    });
  }

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
