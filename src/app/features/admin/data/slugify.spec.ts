import { slugify } from './slugify';

describe('slugify', () => {
  it('normalizes Portuguese accents and punctuation', () => {
    expect(slugify('  Guardiã do Cerrado: A Última Aurora!  ')).toBe(
      'guardia-do-cerrado-a-ultima-aurora',
    );
    expect(slugify('Heróis & Lendas')).toBe('herois-e-lendas');
  });

  it('collapses separators and returns an empty slug for punctuation alone', () => {
    expect(slugify('Vértice --- Ponto Zero')).toBe('vertice-ponto-zero');
    expect(slugify('???')).toBe('');
  });
});
