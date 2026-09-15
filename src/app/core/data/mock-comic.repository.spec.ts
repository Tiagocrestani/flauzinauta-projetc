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

    expect(catalogSize).toBe(6);
  });

  it('keeps issue pages linked and backed by local assets', () => {
    expect(MOCK_COMICS.flatMap((comic) => comic.issues)).toHaveLength(14);

    for (const comic of MOCK_COMICS) {
      expect(comic.genres).toContain('Super-heróis');
      expect(comic.coverUrl).toMatch(/^\/assets\/covers\/.+\.svg$/);
      expect(comic.issues.length).toBeGreaterThan(1);

      for (const issue of comic.issues) {
        expect(issue.comicId).toBe(comic.id);
        expect(issue.pages).toHaveLength(8);

        for (const page of issue.pages) {
          expect(page.issueId).toBe(issue.id);
          expect(page.imageUrl).toMatch(/^\/assets\/pages\/page-\d{2}\.svg$/);
        }
      }
    }
  });

  it('finds an issue through its comic and issue slugs', async () => {
    const issue = await firstValueFrom(repository.getIssue('sentinela-solar', 'o-sol-negro'));

    expect(issue?.title).toBe('O Sol Negro');
  });
});
