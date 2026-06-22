import type { MetadataRoute } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gestsilo.com.br';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/guias'],
        disallow: [
          '/dashboard',
          '/operador',
          '/api/',
          '/login',
          '/register',
          '/forgot-password',
          '/solicitar-acesso',
          '/gestsilo-admin',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
