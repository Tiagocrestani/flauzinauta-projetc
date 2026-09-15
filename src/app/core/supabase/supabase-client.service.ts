import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';
import { Database } from './database.types';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private clientPromise: Promise<SupabaseClient<Database>> | null = null;

  readonly isConfigured = Boolean(
    environment.supabaseUrl.trim() && environment.supabasePublishableKey.trim(),
  );

  getClient(): Promise<SupabaseClient<Database>> {
    if (!this.isConfigured) {
      return Promise.reject(
        new Error(
          'Supabase não configurado. Preencha supabaseUrl e supabasePublishableKey no environment.',
        ),
      );
    }

    this.clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
      createClient<Database>(environment.supabaseUrl, environment.supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      }),
    );

    return this.clientPromise;
  }
}
