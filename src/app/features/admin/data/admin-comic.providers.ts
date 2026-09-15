import { Provider } from '@angular/core';

import { ADMIN_COMIC_REPOSITORY } from './admin-comic.repository';
import { MockAdminComicRepository } from './mock-admin-comic.repository';

export function provideAdminComicRepository(): Provider {
  return {
    provide: ADMIN_COMIC_REPOSITORY,
    useExisting: MockAdminComicRepository,
  };
}
