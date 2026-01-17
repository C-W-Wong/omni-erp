import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.local' },
    update: {},
    create: {
      email: 'admin@erp.local',
      name: 'Admin User',
      password: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create test users for each role
  const roles: { email: string; name: string; role: Role }[] = [
    { email: 'sales@erp.local', name: 'Sales User', role: Role.SALES },
    { email: 'warehouse@erp.local', name: 'Warehouse User', role: Role.WAREHOUSE },
    { email: 'purchasing@erp.local', name: 'Purchasing User', role: Role.PURCHASING },
    { email: 'accounting@erp.local', name: 'Accounting User', role: Role.ACCOUNTING },
  ];

  const testPassword = await hash('test123', 12);

  for (const userData of roles) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        password: testPassword,
        role: userData.role,
        isActive: true,
      },
    });
    console.log(`✅ ${userData.role} user created: ${user.email}`);
  }

  console.log('🌱 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
