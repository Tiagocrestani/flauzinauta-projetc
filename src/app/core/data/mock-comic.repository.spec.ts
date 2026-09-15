import { firstValueFrom } from 'rxjs';

import { MOCK_COMICS } from './mock-comics.data';
import { MockComicRepository } from './mock-comic.repository';

describe('MockComicRepository', () => {
  const repository = new MockComicRepository();

  it('returns the complete catalog synchronously', () => {
    let catalogSize = 0;

    repository.getComics().subscribe((comics) => {
      catalogSize = comics.length;
    });

    expect(catalogSize).toBe(1);
  });

  it('keeps issue pages linked and backed by local assets', () => {
    expect(MOCK_COMICS.flatMap((comic) => comic.issues)).toHaveLength(1);

    for (const comic of MOCK_COMICS) {
      expect(comic.genres).toEqual(['Fantasia']);
      expect(comic.coverUrl).toContain('/comic-covers/flauzinauta/cover.webp');
      expect(comic.issues).toHaveLength(1);

      for (const issue of comic.issues) {
        expect(issue.comicId).toBe(comic.id);
        expect(issue.pages).toHaveLength(14);

        for (const page of issue.pages) {
          expect(page.issueId).toBe(issue.id);
          expect(page.imageUrl).toContain('/comic-pages/flauzinauta/a-guerra-no-ceu-parte-1/');
        }
      }
    }
  });

  it('finds an issue through its comic and issue slugs', async () => {
    const issue = await firstValueFrom(
      repository.getIssue('flauzinauta', 'a-guerra-no-ceu-parte-1'),
    );

    expect(issue?.title).toBe('A Guerra no Céu — Parte 1');
  });
});
