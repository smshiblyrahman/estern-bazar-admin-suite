const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SQLite database...');
  
  // Create SUPER_ADMIN user
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@esternbazar.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';
  
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });
  
  if (!existingSuperAdmin) {
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        name: 'Super Administrator',
        passwordHash: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
    
    console.log(`✅ Created SUPER_ADMIN: ${superAdmin.email}`);
  } else {
    console.log(`✅ SUPER_ADMIN already exists: ${existingSuperAdmin.email}`);
  }
  
  // Create sample ADMIN user
  const adminEmail = 'admin@example.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Sample Admin',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    
    console.log(`✅ Created ADMIN: ${admin.email}`);
  } else {
    console.log(`✅ ADMIN already exists: ${existingAdmin.email}`);
  }
  
  console.log('🌱 Seeding completed!');
  console.log('🔑 Login credentials:');
  console.log(`   SUPER_ADMIN: ${superAdminEmail} / ${superAdminPassword}`);
  console.log(`   ADMIN: ${adminEmail} / Admin123!`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
