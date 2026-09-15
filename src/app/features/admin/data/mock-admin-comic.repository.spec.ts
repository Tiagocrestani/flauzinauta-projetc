import { vi } from 'vitest';

import { MOCK_COMICS } from '../../../core/data/mock-comics.data';
import { AdminComicInput, AdminIssueInput } from './admin-comic.models';
import { MockAdminComicRepository } from './mock-admin-comic.repository';

describe('MockAdminComicRepository', () => {
  let repository: MockAdminComicRepository;

  beforeEach(() => {
    repository = new MockAdminComicRepository();
  });

  function comicInput(overrides: Partial<AdminComicInput> = {}): AdminComicInput {
    const seed = repository.getComicById('comic-sentinela-solar')!;
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      issues: _issues,
      ...input
    } = seed;
    return {
      ...input,
      title: 'Nova Heroína',
      slug: 'nova-heroina',
      coverUrl: '',
      publicationStatus: 'draft',
      ...overrides,
    };
  }

  function issueInput(overrides: Partial<AdminIssueInput> = {}): AdminIssueInput {
    return {
      number: 10,
      slug: 'primeiro-voo',
      title: 'Primeiro Voo',
      description: 'A história começa.',
      publishedAt: '2026-09-14',
      publicationStatus: 'draft',
      coverUrl: '',
      ...overrides,
    };
  }

  it('derives published catalog entries and separate drafts without mutating public mocks', () => {
    expect(repository.listComics()).toHaveLength(MOCK_COMICS.length + 2);
    expect(
      repository.listComics().filter((comic) => comic.publicationStatus === 'draft'),
    ).toHaveLength(2);
    expect(repository.comics().length).toBe(MOCK_COMICS.length + 2);
    expect(MOCK_COMICS).toHaveLength(6);
    expect(repository.getComicById(MOCK_COMICS[0].id)?.issues[0].pages).toHaveLength(8);

    const result = repository.listComics();
    result[0].title = 'Alterado fora do repositório';
    expect(repository.getComicById(MOCK_COMICS[0].id)?.title).toBe(MOCK_COMICS[0].title);
  });

  it('normalizes slugs, rejects duplicates and preserves existing issues on update', () => {
    const created = repository.createComic(comicInput({ slug: '  Nova Heroína! ' }));
    expect(created.slug).toBe('nova-heroina');
    expect(repository.slugExists('NOVA HERÓÍNA')).toBe(true);
    expect(() => repository.createComic(comicInput())).toThrow(/slug/i);
    expect(() =>
      repository.updateComic(created.id, comicInput({ slug: 'sentinela-solar' })),
    ).toThrow(/slug/i);

    const seed = repository.getComicById('comic-sentinela-solar')!;
    const updated = repository.updateComic(
      seed.id,
      comicInput({ title: 'Sentinela Renovado', slug: seed.slug, coverUrl: seed.coverUrl }),
    );
    expect(updated.issues).toHaveLength(seed.issues.length);
    expect(updated.createdAt).toBe(seed.createdAt);
  });

  it('normalizes required comic fields and rejects incomplete or invalid domain data', () => {
    const created = repository.createComic(
      comicInput({
        title: '  Nova Heroína  ',
        tagline: '  Uma nova jornada.  ',
        description: '  Uma heroína protege a cidade.  ',
        author: '  Equipe Flauzinauta  ',
        genres: [' Super-heróis ', '', 'Ação', 'Ação'],
        releaseDate: ' 2026-09-14 ',
      }),
    );

    expect(created).toMatchObject({
      title: 'Nova Heroína',
      tagline: 'Uma nova jornada.',
      description: 'Uma heroína protege a cidade.',
      author: 'Equipe Flauzinauta',
      genres: ['Super-heróis', 'Ação'],
      releaseDate: '2026-09-14',
    });
    expect(() => repository.createComic(comicInput({ description: '   ' }))).toThrow(/descrição/i);
    expect(() => repository.createComic(comicInput({ author: '   ' }))).toThrow(/autor/i);
    expect(() => repository.createComic(comicInput({ genres: [' ', ''] }))).toThrow(/gênero/i);
    expect(() => repository.createComic(comicInput({ releaseDate: '2026-02-30' }))).toThrow(
      /data de lançamento/i,
    );
  });

  it('exposes deeply frozen snapshots without exposing repository state to mutation', () => {
    const snapshot = repository.comics();
    const original = repository.getComicById(snapshot[0].id)!;

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(Object.isFrozen(snapshot[0].genres)).toBe(true);
    expect(Object.isFrozen(snapshot[0].issues)).toBe(true);
    expect(Object.isFrozen(snapshot[0].issues[0].pages[0])).toBe(true);
    expect(() => {
      snapshot[0].title = 'Alteração externa';
    }).toThrow(TypeError);
    expect(() => snapshot[0].genres.push('Injetado')).toThrow(TypeError);
    expect(repository.getComicById(original.id)).toEqual(original);
  });

  it('requires a cover to publish a comic', () => {
    const created = repository.createComic(comicInput());
    expect(() => repository.togglePublication(created.id)).toThrow(/capa/i);
    expect(repository.getComicById(created.id)?.publicationStatus).toBe('draft');

    repository.updateComic(created.id, comicInput({ coverUrl: 'blob:cover-one' }));
    expect(repository.togglePublication(created.id).publicationStatus).toBe('published');
    expect(() =>
      repository.updateComic(created.id, comicInput({ publicationStatus: 'published' })),
    ).toThrow(/capa/i);
  });

  it('checks issue slug and number within each comic and requires pages to publish', () => {
    const comic = repository.createComic(comicInput());
    const issue = repository.createIssue(comic.id, issueInput());
    expect(repository.issueSlugExists(comic.id, 'Primeiro Voo')).toBe(true);
    expect(repository.issueNumberExists(comic.id, 10)).toBe(true);
    expect(() => repository.createIssue(comic.id, issueInput({ number: 11 }))).toThrow(/slug/i);
    expect(() => repository.createIssue(comic.id, issueInput({ slug: 'outro' }))).toThrow(
      /número/i,
    );
    expect(() => repository.toggleIssuePublication(comic.id, issue.id)).toThrow(/páginas/i);

    const saved = repository.setPages(comic.id, issue.id, [
      { id: 'temporary-b', issueId: 'new', pageNumber: 80, imageUrl: 'blob:page-b' },
      { id: 'temporary-a', issueId: 'new', pageNumber: 40, imageUrl: 'blob:page-a' },
    ]);
    expect(saved.pages.map((page) => [page.issueId, page.pageNumber])).toEqual([
      [issue.id, 1],
      [issue.id, 2],
    ]);
    expect(repository.toggleIssuePublication(comic.id, issue.id).publicationStatus).toBe(
      'published',
    );
    expect(() => repository.setPages(comic.id, issue.id, [])).toThrow(/páginas/i);
  });

  it('normalizes issue fields and rejects missing or invalid publication dates', () => {
    const comic = repository.createComic(comicInput());
    const issue = repository.createIssue(
      comic.id,
      issueInput({
        title: '  Primeiro Voo  ',
        description: '  Uma estreia no céu.  ',
        publishedAt: ' 2026-09-14 ',
      }),
    );

    expect(issue).toMatchObject({
      title: 'Primeiro Voo',
      description: 'Uma estreia no céu.',
      publishedAt: '2026-09-14',
    });
    expect(() =>
      repository.createIssue(
        comic.id,
        issueInput({ number: 11, slug: 'sem-data', publishedAt: '   ' }),
      ),
    ).toThrow(/data de publicação/i);
    expect(() =>
      repository.createIssue(
        comic.id,
        issueInput({ number: 11, slug: 'data-impossivel', publishedAt: '2026-02-30' }),
      ),
    ).toThrow(/data de publicação/i);
  });

  it('creates or updates an issue with pages atomically in a single commit', () => {
    const comic = repository.createComic(comicInput());
    const commit = vi.spyOn(repository as unknown as { commit(next: unknown[]): void }, 'commit');

    const created = repository.saveIssueWithPages(
      comic.id,
      null,
      issueInput({ publicationStatus: 'published' }),
      [
        { id: '', issueId: 'new', pageNumber: 20, imageUrl: ' blob:page-one ' },
        { id: 'selected-page', issueId: 'new', pageNumber: 10, imageUrl: 'blob:page-two' },
      ],
    );

    expect(commit).toHaveBeenCalledTimes(1);
    expect(created.publicationStatus).toBe('published');
    expect(created.pages.map((page) => [page.issueId, page.pageNumber, page.imageUrl])).toEqual([
      [created.id, 1, 'blob:page-one'],
      [created.id, 2, 'blob:page-two'],
    ]);
    expect(repository.getComicById(comic.id)?.issues).toHaveLength(1);

    commit.mockClear();
    const updated = repository.saveIssueWithPages(
      comic.id,
      created.id,
      issueInput({ title: 'Segundo Voo', publicationStatus: 'draft' }),
      created.pages.slice().reverse(),
    );
    expect(commit).toHaveBeenCalledTimes(1);
    expect(updated.title).toBe('Segundo Voo');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.pages.map((page) => page.pageNumber)).toEqual([1, 2]);
  });

  it('does not persist partial issue changes when atomic validation fails', () => {
    const comic = repository.createComic(comicInput());
    const before = repository.getComicById(comic.id)!;
    const commit = vi.spyOn(repository as unknown as { commit(next: unknown[]): void }, 'commit');

    expect(() =>
      repository.saveIssueWithPages(
        comic.id,
        null,
        issueInput({ publicationStatus: 'published' }),
        [
          { id: 'duplicate', issueId: 'new', pageNumber: 1, imageUrl: 'blob:first' },
          { id: 'duplicate', issueId: 'new', pageNumber: 2, imageUrl: 'blob:second' },
        ],
      ),
    ).toThrow(/identificador único/i);
    expect(commit).not.toHaveBeenCalled();
    expect(repository.getComicById(comic.id)).toEqual(before);
    expect(repository.issueSlugExists(comic.id, 'primeiro-voo')).toBe(false);

    expect(() =>
      repository.saveIssueWithPages(
        comic.id,
        null,
        issueInput({ publicationStatus: 'published' }),
        [],
      ),
    ).toThrow(/páginas/i);
    expect(commit).not.toHaveBeenCalled();
    expect(repository.getComicById(comic.id)).toEqual(before);
  });

  it('reorders pages by complete ID list and normalizes page numbers', () => {
    const comic = repository.createComic(comicInput());
    const issue = repository.createIssue(comic.id, issueInput());
    repository.setPages(comic.id, issue.id, [
      { id: 'a', issueId: 'new', pageNumber: 1, imageUrl: '/a.svg' },
      { id: 'b', issueId: 'new', pageNumber: 2, imageUrl: '/b.svg' },
    ]);
    expect(repository.reorderPages(comic.id, issue.id, ['b', 'a']).pages).toEqual([
      { id: 'b', issueId: issue.id, pageNumber: 1, imageUrl: '/b.svg' },
      { id: 'a', issueId: issue.id, pageNumber: 2, imageUrl: '/a.svg' },
    ]);
    expect(() => repository.reorderPages(comic.id, issue.id, ['a', 'a'])).toThrow(/ordem/i);
    expect(() => repository.reorderPages(comic.id, issue.id, ['a'])).toThrow(/ordem/i);
  });

  it('revokes saved object URLs only when assets leave the repository', () => {
    const previous = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    const revoke = vi.fn();
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });

    try {
      const comic = repository.createComic(comicInput({ coverUrl: 'blob:cover-old' }));
      expect(revoke).not.toHaveBeenCalled();
      repository.updateComic(comic.id, comicInput({ coverUrl: 'blob:cover-new' }));
      expect(revoke).toHaveBeenCalledWith('blob:cover-old');

      const issue = repository.createIssue(comic.id, issueInput({ coverUrl: 'blob:issue-cover' }));
      repository.setPages(comic.id, issue.id, [
        { id: 'page-one', issueId: 'new', pageNumber: 1, imageUrl: 'blob:page-one' },
      ]);
      repository.reorderPages(comic.id, issue.id, ['page-one']);
      expect(revoke).toHaveBeenCalledTimes(1);

      repository.deleteIssue(comic.id, issue.id);
      expect(revoke).toHaveBeenCalledWith('blob:issue-cover');
      expect(revoke).toHaveBeenCalledWith('blob:page-one');
      repository.deleteComic(comic.id);
      expect(revoke).toHaveBeenCalledWith('blob:cover-new');
    } finally {
      if (previous) Object.defineProperty(URL, 'revokeObjectURL', previous);
      else Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });
});
