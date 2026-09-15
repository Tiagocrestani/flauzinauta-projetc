import { Provider } from '@angular/core';

import { COMIC_REPOSITORY } from './comic.repository';
import { MockComicRepository } from './mock-comic.repository';

export function provideComicRepository(): Provider {
  return {
    provide: COMIC_REPOSITORY,
    useExisting: MockComicRepository,
  };
}
