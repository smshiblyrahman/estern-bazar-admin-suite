import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('UNAUTHENTICATED');
  return session as { user: { id: string; role: 'SUPER_ADMIN'|'ADMIN'|'CUSTOMER'|'CALL_AGENT'; status: string } };
}

export function assertAdminOrSuper(role: string) {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) throw new Error('FORBIDDEN');
}

export function assertSuper(role: string) {
  if (role !== 'SUPER_ADMIN') throw new Error('FORBIDDEN');
}

export function assertCallAgent(role: string) {
  if (!['CALL_AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(role)) throw new Error('FORBIDDEN');
}

export function assertCallAgentOnly(role: string) {
  if (role !== 'CALL_AGENT') throw new Error('FORBIDDEN');
}


