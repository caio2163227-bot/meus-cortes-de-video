import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

// Só protege o histórico (que mostra dados pessoais). A página inicial
// fica pública — quem quiser só ver a vitrine não precisa logar. Gerar
// corte já é protegido separadamente dentro da própria rota da API.
export const config = {
  matcher: ['/historico/:path*'],
};
