import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DAILY_LIMIT, getUsageToday } from '@/lib/usage';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const used = getUsageToday(session.user.id);
  return NextResponse.json({ used, limit: DAILY_LIMIT });
}
