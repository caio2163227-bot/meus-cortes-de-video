// Configuração do Google AdSense — direto no código (não variável de
// ambiente), porque o publisher ID não é secreto: ele já fica visível
// no HTML de qualquer site que exibe AdSense, então não faz sentido
// esconder e ainda arriscar o problema de "secret not found" do Railway
// que já tivemos com o ADMIN_EMAIL.
//
// Pra ativar os anúncios de verdade:
// 1. Crie sua conta em https://www.google.com/adsense
// 2. Depois de aprovado, pegue seu Publisher ID (formato "ca-pub-XXXXXXXXXXXXXXXX")
// 3. Cole ele aqui embaixo
// Enquanto ADSENSE_CLIENT_ID estiver vazio, nenhum anúncio é carregado —
// o site funciona normalmente, só sem anúncio nenhum.
export const ADSENSE_CLIENT_ID = 'ca-pub-4861808033042845';
