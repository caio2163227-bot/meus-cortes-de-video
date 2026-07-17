import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

// Só protege o histórico (que mostra dados pessoais) e a área de admin.
// A página inicial e o suporte ficam públicos — quem quiser só ver a
// vitrine, ou pedir ajuda mesmo sem conta, não precisa logar. Gerar
// corte já é protegido separadamente dentro da própria rota da API.
// A conferência de QUEM é admin (não só "está logado") acontece dentro
// da própria página /admin/suporte.
export const config = {
  matcher: ['/historico/:path*', '/admin/:path*'],
};
