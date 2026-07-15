import { NextResponse } from 'next/server';
import { createUser } from '@/lib/users';

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Preencha nome, email e senha.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.message === 'EMAIL_TAKEN') {
      return NextResponse.json({ error: 'Esse email já está cadastrado.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Erro ao criar conta.' }, { status: 500 });
  }
}
