import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setTicketStatus } from '@/lib/support';

function isAdmin(session) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return Boolean(adminEmail && session?.user?.email === adminEmail);
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { ticketId } = params;
    const { status } = await req.json();

    if (status !== 'aberto' && status !== 'resolvido') {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const ticket = setTicketStatus(ticketId, status);
    if (!ticket) {
      return NextResponse.json({ error: 'Chamado não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao atualizar chamado.' }, { status: 500 });
  }
}
