import { PrismaClient, Role, NormalBalance } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Chart of Accounts data
const accountCategories = [
  { code: '1', name: 'Assets', normalBalance: NormalBalance.DEBIT, displayOrder: 1 },
  { code: '2', name: 'Liabilities', normalBalance: NormalBalance.CREDIT, displayOrder: 2 },
  { code: '3', name: 'Equity', normalBalance: NormalBalance.CREDIT, displayOrder: 3 },
  { code: '4', name: 'Revenue', normalBalance: NormalBalance.CREDIT, displayOrder: 4 },
  { code: '5', name: 'Expenses', normalBalance: NormalBalance.DEBIT, displayOrder: 5 },
];

const chartOfAccounts = [
  // Assets (1xxx)
  { accountCode: '1000', name: 'Assets', categoryCode: '1', level: 1, isDetail: false },
  { accountCode: '1100', name: 'Current Assets', categoryCode: '1', parentCode: '1000', level: 2, isDetail: false },
  { accountCode: '1101', name: 'Cash', categoryCode: '1', parentCode: '1100', level: 3, isDetail: true },
  { accountCode: '1102', name: 'Bank', categoryCode: '1', parentCode: '1100', level: 3, isDetail: true },
  { accountCode: '1110', name: 'Accounts Receivable', categoryCode: '1', parentCode: '1100', level: 3, isDetail: true },
  { accountCode: '1120', name: 'Inventory', categoryCode: '1', parentCode: '1100', level: 3, isDetail: true },
  { accountCode: '1130', name: 'Prepaid Expenses', categoryCode: '1', parentCode: '1100', level: 3, isDetail: true },

  // Liabilities (2xxx)
  { accountCode: '2000', name: 'Liabilities', categoryCode: '2', level: 1, isDetail: false },
  { accountCode: '2100', name: 'Current Liabilities', categoryCode: '2', parentCode: '2000', level: 2, isDetail: false },
  { accountCode: '2110', name: 'Accounts Payable', categoryCode: '2', parentCode: '2100', level: 3, isDetail: true },
  { accountCode: '2120', name: 'Accrued Expenses', categoryCode: '2', parentCode: '2100', level: 3, isDetail: true },
  { accountCode: '2130', name: 'Tax Payable', categoryCode: '2', parentCode: '2100', level: 3, isDetail: true },

  // Equity (3xxx)
  { accountCode: '3000', name: 'Equity', categoryCode: '3', level: 1, isDetail: false },
  { accountCode: '3100', name: 'Capital Stock', categoryCode: '3', parentCode: '3000', level: 2, isDetail: true },
  { accountCode: '3200', name: 'Retained Earnings', categoryCode: '3', parentCode: '3000', level: 2, isDetail: true },

  // Revenue (4xxx)
  { accountCode: '4000', name: 'Revenue', categoryCode: '4', level: 1, isDetail: false },
  { accountCode: '4110', name: 'Sales Revenue', categoryCode: '4', parentCode: '4000', level: 2, isDetail: true },
  { accountCode: '4120', name: 'Service Revenue', categoryCode: '4', parentCode: '4000', level: 2, isDetail: true },
  { accountCode: '4900', name: 'Other Income', categoryCode: '4', parentCode: '4000', level: 2, isDetail: true },

  // Expenses (5xxx)
  { accountCode: '5000', name: 'Expenses', categoryCode: '5', level: 1, isDetail: false },
  { accountCode: '5100', name: 'Cost of Goods Sold', categoryCode: '5', parentCode: '5000', level: 2, isDetail: true },
  { accountCode: '5200', name: 'Operating Expenses', categoryCode: '5', parentCode: '5000', level: 2, isDetail: false },
  { accountCode: '5210', name: 'Salaries Expense', categoryCode: '5', parentCode: '5200', level: 3, isDetail: true },
  { accountCode: '5220', name: 'Rent Expense', categoryCode: '5', parentCode: '5200', level: 3, isDetail: true },
  { accountCode: '5230', name: 'Utilities Expense', categoryCode: '5', parentCode: '5200', level: 3, isDetail: true },
  { accountCode: '5240', name: 'Office Supplies', categoryCode: '5', parentCode: '5200', level: 3, isDetail: true },
  { accountCode: '5300', name: 'Freight & Shipping', categoryCode: '5', parentCode: '5000', level: 2, isDetail: true },
];

async function main() {
  console.log('Starting seed...');

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

  // Seed Account Categories
  console.log('Creating account categories...');
  const categoryMap: Record<string, string> = {};

  for (const category of accountCategories) {
    const created = await prisma.accountCategory.upsert({
      where: { code: category.code },
      update: {},
      create: category,
    });
    categoryMap[category.code] = created.id;
  }
  console.log(`Created ${accountCategories.length} account categories`);

  // Seed Chart of Accounts (in order to respect parent relationships)
  console.log('Creating chart of accounts...');
  const accountMap: Record<string, string> = {};

  for (const account of chartOfAccounts) {
    const { categoryCode, parentCode, ...accountData } = account;
    const created = await prisma.chartOfAccount.upsert({
      where: { accountCode: account.accountCode },
      update: {},
      create: {
        ...accountData,
        categoryId: categoryMap[categoryCode],
        parentId: parentCode ? accountMap[parentCode] : null,
      },
    });
    accountMap[account.accountCode] = created.id;
  }
  console.log(`Created ${chartOfAccounts.length} accounts`);

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
