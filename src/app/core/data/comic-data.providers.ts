import { Provider, inject } from '@angular/core';

import { COMIC_REPOSITORY } from './comic.repository';
import { MockComicRepository } from './mock-comic.repository';
import { SupabaseComicRepository } from './supabase-comic.repository';
import { SupabaseClientService } from '../supabase/supabase-client.service';

export type ComicDataSource = 'auto' | 'mock' | 'supabase';

export function provideComicRepository(source: ComicDataSource = 'auto'): Provider {
  return {
    provide: COMIC_REPOSITORY,
    useFactory: () => {
      const supabase = inject(SupabaseClientService);

      if (source === 'mock' || (source === 'auto' && !supabase.isConfigured)) {
        return inject(MockComicRepository);
      }

      return inject(SupabaseComicRepository);
    },
  };
}
