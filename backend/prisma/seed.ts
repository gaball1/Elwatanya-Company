import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@elwataniya.com' },
    update: {},
    create: {
      email: 'admin@elwataniya.com',
      passwordHash,
      name: 'System Administrator',
      role: UserRole.CEO,
      status: 'ACTIVE',
    },
  });

  console.log('Seed completed: admin@elwataniya.com / Admin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
