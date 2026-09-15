import {
  ADMIN_IMAGE_ACCEPT,
  ADMIN_IMAGE_MAX_BYTES,
  formatAdminImageFileSize,
  validateAdminImageFile,
} from './admin-image-file.utils';

describe('admin image file utilities', () => {
  it.each([
    ['hero.jpg', 'image/jpeg', 'JPEG'],
    ['hero.jpeg', 'image/jpeg', 'JPEG'],
    ['hero.png', 'image/png', 'PNG'],
    ['hero.webp', 'image/webp', 'WebP'],
    ['hero.avif', 'image/avif', 'AVIF'],
  ])('accepts %s as %s', (name, type, format) => {
    const result = validateAdminImageFile(new File(['image'], name, { type }));

    expect(result).toEqual({ valid: true, mimeType: type, format });
  });

  it('uses a supported extension when the browser provides no MIME type', () => {
    expect(validateAdminImageFile(new File(['image'], 'CAPA.JPEG'))).toEqual({
      valid: true,
      mimeType: 'image/jpeg',
      format: 'JPEG',
    });
  });

  it.each([
    new File(['text'], 'notes.txt', { type: 'text/plain' }),
    new File(['image'], 'cover.svg', { type: 'image/svg+xml' }),
    new File(['image'], 'cover.exe', { type: 'image/png' }),
    new File(['image'], 'cover.jpg', { type: 'image/png' }),
  ])('rejects unsupported or inconsistent format metadata', (file) => {
    expect(validateAdminImageFile(file)).toMatchObject({
      valid: false,
      code: 'unsupported-format',
    });
  });

  it('allows exactly 10 MB and rejects files above the configured limit', () => {
    const atLimit = new File([new Uint8Array(ADMIN_IMAGE_MAX_BYTES)], 'cover.png', {
      type: 'image/png',
    });
    const aboveLimit = new File([new Uint8Array(ADMIN_IMAGE_MAX_BYTES + 1)], 'cover.png', {
      type: 'image/png',
    });

    expect(validateAdminImageFile(atLimit).valid).toBe(true);
    expect(validateAdminImageFile(aboveLimit)).toMatchObject({
      valid: false,
      code: 'file-too-large',
    });
  });

  it('exports an accept list covering every supported MIME type and extension', () => {
    for (const value of [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.avif',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ]) {
      expect(ADMIN_IMAGE_ACCEPT.split(',')).toContain(value);
    }
  });

  it.each([
    [500, '500 B'],
    [1536, '1.5 KB'],
    [2.25 * 1024 * 1024, '2.3 MB'],
  ])('formats %s bytes as %s', (bytes, expected) => {
    expect(formatAdminImageFileSize(bytes)).toBe(expected);
  });
});
