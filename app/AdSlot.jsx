'use client';

import { useEffect } from 'react';
import { ADSENSE_CLIENT_ID } from '@/lib/ads';

// Espaço de anúncio do Google AdSense. Não renderiza nada enquanto o
// ADSENSE_CLIENT_ID (em lib/ads.js) não for preenchido — assim já fica
// no lugar certo no layout, pronto pra ligar quando a conta AdSense
// for aprovada, sem precisar mexer no resto do site depois.
export default function AdSlot({ slot }) {
  useEffect(() => {
    if (!ADSENSE_CLIENT_ID) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('Falha ao carregar anúncio:', err);
    }
  }, []);

  if (!ADSENSE_CLIENT_ID) return null;

  return (
    <div className="w-full flex justify-center py-4">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
