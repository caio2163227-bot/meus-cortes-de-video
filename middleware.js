import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

// Temporariamente sem nenhuma rota protegida — o Volume está cheio e
// precisamos acessar /historico pra apagar vídeos antigos, mas o login
// também não funciona sem espaço livre. Depois de liberar espaço,
// voltamos a proteger o histórico.
export const config = {
  matcher: [],
};
