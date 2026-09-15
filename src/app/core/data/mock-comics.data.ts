import { Comic, ComicPage } from '../models/comic.models';

const STORAGE_BASE_URL = 'https://tunahgmwpxrhydsyqnne.supabase.co/storage/v1/object/public';
const PAGE_BASE_URL = `${STORAGE_BASE_URL}/comic-pages/flauzinauta/a-guerra-no-ceu-parte-1`;
const ISSUE_ID = 'flauzinauta-a-guerra-no-ceu-parte-1';

function createPages(): ComicPage[] {
  return Array.from({ length: 14 }, (_, index) => {
    const pageNumber = index + 1;
    const fileName =
      pageNumber === 14 ? '014-final.webp' : `${String(pageNumber).padStart(3, '0')}.webp`;

    return {
      id: `${ISSUE_ID}-page-${pageNumber}`,
      issueId: ISSUE_ID,
      pageNumber,
      imageUrl: `${PAGE_BASE_URL}/${fileName}`,
    };
  });
}

export const MOCK_COMICS: Comic[] = [
  {
    id: 'comic-flauzinauta',
    title: 'Fláuzinauta',
    slug: 'flauzinauta',
    tagline: 'A Guerra no Céu começou.',
    description:
      'Antes da guerra, só existia adoração. Quando Lúcifer começou a olhar para outro lugar, a ordem celestial foi desafiada e a Guerra no Céu começou.',
    coverUrl: `${STORAGE_BASE_URL}/comic-covers/flauzinauta/cover.webp`,
    author: 'Equipe Flauzinauta',
    genres: ['Fantasia'],
    status: 'Em andamento',
    releaseDate: '2026-09-14',
    featured: true,
    accentColor: '#d6a43b',
    issues: [
      {
        id: ISSUE_ID,
        comicId: 'comic-flauzinauta',
        number: 1,
        slug: 'a-guerra-no-ceu-parte-1',
        title: 'A Guerra no Céu — Parte 1',
        description:
          'Antes da guerra, só existia adoração. O desejo de Lúcifer coloca a ordem celestial à prova e inicia uma batalha que mudará tudo.',
        publishedAt: '2026-09-14',
        pages: createPages(),
      },
    ],
  },
];
