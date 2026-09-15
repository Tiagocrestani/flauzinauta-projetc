import { compareNaturalFileNames } from './natural-file-name-sort';

describe('compareNaturalFileNames', () => {
  it('orders numbered page names naturally', () => {
    const names = ['011.webp', '002.webp', '010.webp', '001.webp', '003.webp'];

    expect(names.sort(compareNaturalFileNames)).toEqual([
      '001.webp',
      '002.webp',
      '003.webp',
      '010.webp',
      '011.webp',
    ]);
  });
});
