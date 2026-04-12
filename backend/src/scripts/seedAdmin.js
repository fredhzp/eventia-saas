require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@admin.com' } });
  if (existing) {
    console.log('✅ Admin already exists — nothing to do.');
    return;
  }
  const passwordHash = await bcrypt.hash('admin', 10);
  await prisma.user.create({
    data: { email: 'admin@admin.com', passwordHash, role: 'ADMIN' }
  });
  console.log('✅ Admin user created: admin@admin.com / admin');
}

main().catch(console.error).finally(() => prisma.$disconnect());
