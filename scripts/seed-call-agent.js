const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedCallAgent() {
  try {
    console.log('🌱 Seeding CALL_AGENT user...');

    // Check if call agent already exists
    const existing = await prisma.user.findFirst({
      where: { role: 'CALL_AGENT' }
    });

    if (existing) {
      console.log('✅ CALL_AGENT user already exists:', existing.email);
      return;
    }

    // Create call agent
    const passwordHash = await bcrypt.hash('CallAgent123!', 10);
    
    const callAgent = await prisma.user.create({
      data: {
        email: 'callagent@esternbazar.com',
        name: 'Call Agent',
        phone: '+8801700000000',
        passwordHash,
        role: 'CALL_AGENT',
        status: 'ACTIVE',
      },
    });

    console.log('✅ Created CALL_AGENT user:');
    console.log('   Email: callagent@esternbazar.com');
    console.log('   Password: CallAgent123!');
    console.log('   ID:', callAgent.id);

  } catch (error) {
    console.error('❌ Error seeding call agent:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedCallAgent();
}

module.exports = { seedCallAgent };
