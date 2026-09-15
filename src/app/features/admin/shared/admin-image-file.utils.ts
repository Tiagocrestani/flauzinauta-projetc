export const ADMIN_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const ADMIN_IMAGE_ACCEPT =
  '.jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif';

export type AdminImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

export type AdminImageValidationResult =
  | {
      valid: true;
      mimeType: AdminImageMimeType;
      format: string;
    }
  | {
      valid: false;
      code: 'unsupported-format' | 'file-too-large';
      message: string;
    };

const MIME_FORMATS: ReadonlyMap<AdminImageMimeType, string> = new Map([
  ['image/jpeg', 'JPEG'],
  ['image/png', 'PNG'],
  ['image/webp', 'WebP'],
  ['image/avif', 'AVIF'],
]);

const EXTENSION_MIME_TYPES: ReadonlyMap<string, AdminImageMimeType> = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
  ['avif', 'image/avif'],
]);

const UNSUPPORTED_FORMAT_MESSAGE = 'Escolha uma imagem JPG, JPEG, PNG, WebP ou AVIF.';
const FILE_TOO_LARGE_MESSAGE = 'A imagem deve ter no máximo 10 MB.';

export function validateAdminImageFile(file: File): AdminImageValidationResult {
  const declaredMimeType = file.type.trim().toLowerCase();
  const extension = file.name.trim().toLowerCase().split('.').pop() ?? '';
  const extensionMimeType = EXTENSION_MIME_TYPES.get(extension);
  const mimeType = MIME_FORMATS.has(declaredMimeType as AdminImageMimeType)
    ? (declaredMimeType as AdminImageMimeType)
    : undefined;

  if (
    (!mimeType && !extensionMimeType) ||
    (declaredMimeType && !mimeType) ||
    (mimeType && extensionMimeType && mimeType !== extensionMimeType) ||
    (mimeType && !extensionMimeType)
  ) {
    return {
      valid: false,
      code: 'unsupported-format',
      message: UNSUPPORTED_FORMAT_MESSAGE,
    };
  }

  if (file.size > ADMIN_IMAGE_MAX_BYTES) {
    return {
      valid: false,
      code: 'file-too-large',
      message: FILE_TOO_LARGE_MESSAGE,
    };
  }

  const resolvedMimeType = mimeType ?? extensionMimeType!;
  return {
    valid: true,
    mimeType: resolvedMimeType,
    format: MIME_FORMATS.get(resolvedMimeType)!,
  };
}

export function formatAdminImageFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
