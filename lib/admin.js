// Email da conta que tem acesso à área de admin (/admin/suporte).
// Fixo no código em vez de variável de ambiente porque o build do
// Railway estava travando com "secret ADMIN_EMAIL not found" mesmo com
// a variável configurada — provavelmente uma particularidade de como o
// Railpack decide o que vira "secret" durante o build. Como só o Caio
// usa essa área, deixar fixo aqui é mais simples e confiável.
//
// Pra trocar o admin, só editar essa linha e fazer commit/deploy de novo.
export const ADMIN_EMAIL = 'caio2163227@gmail.com';

export function isAdminSession(session) {
  return Boolean(session?.user?.email && session.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
}
