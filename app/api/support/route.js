import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addTicket } from '@/lib/support';

const VALID_CATEGORIES = [
  'login',
  'processamento',
  'corte',
  'pagamento',
  'outro',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    const { name, email, category, message, website } = await req.json();

    // Honeypot: campo escondido que só um robô preencheria. Se vier
    // preenchido, finge que deu certo e não guarda nada.
    if (website) {
      return NextResponse.json({ success: true });
    }

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Preencha nome, email e a mensagem.' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }
    if (message.trim().length > 4000) {
      return NextResponse.json({ error: 'Mensagem muito longa.' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    const ticket = addTicket({
      name: name.trim().slice(0, 200),
      email: email.trim().toLowerCase().slice(0, 200),
      category: VALID_CATEGORIES.includes(category) ? category : 'outro',
      message: message.trim(),
      userId: session?.user?.id,
    });

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao enviar sua mensagem.' }, { status: 500 });
  }
}
