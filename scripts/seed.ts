import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL!;
  const password = process.env.SUPER_ADMIN_PASSWORD!;
  if (!email || !password) {
    console.error('Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD');
    process.exit(1);
  }

  const existingSuper = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (existingSuper) {
    console.log('SUPER_ADMIN already exists:', existingSuper.email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      name: 'Estern Bazar Owner',
    },
  });
  console.log('Created SUPER_ADMIN:', user.email);
}

main().then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1);});


