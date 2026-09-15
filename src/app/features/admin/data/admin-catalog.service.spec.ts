import { sortFilesByName, slugify, validateImageFiles } from './admin-catalog.service';

describe('admin catalog helpers', () => {
  it('creates database-safe slugs', () => {
    expect(slugify('A Guerra no Céu — Parte 1')).toBe('a-guerra-no-ceu-parte-1');
  });

  it('sorts page filenames using numeric order', () => {
    const files = [
      new File([''], '10.png', { type: 'image/png' }),
      new File([''], '2.png', { type: 'image/png' }),
      new File([''], '1.png', { type: 'image/png' }),
    ];

    expect(sortFilesByName(files).map((file) => file.name)).toEqual(['1.png', '2.png', '10.png']);
  });

  it('rejects non-image files', () => {
    const result = validateImageFiles([new File(['texto'], 'pagina.txt', { type: 'text/plain' })]);

    expect(result).toContain('não está em um formato');
  });
});
