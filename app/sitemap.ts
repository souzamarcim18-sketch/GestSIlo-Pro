import type { MetadataRoute } from 'next';
import { listGuias } from '@/lib/guias/data';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gestsilo.com.br';

export default function sitemap(): MetadataRoute.Sitemap {
  const guias = listGuias();

  const guiaEntries: MetadataRoute.Sitemap = guias.map((guia) => ({
    url: `${BASE_URL}/guias/${guia.slug}`,
    lastModified: new Date(`${guia.publicadoEm}T00:00:00`),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/guias`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...guiaEntries,
  ];
}
