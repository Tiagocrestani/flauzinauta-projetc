import { Injectable } from '@angular/core';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import { SupabaseClientService } from '../supabase/supabase-client.service';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  constructor(private readonly supabase: SupabaseClientService) {}

  async signIn(email: string, password: string) {
    const client = await this.supabase.getClient();
    return client.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    const client = await this.supabase.getClient();
    return client.auth.signOut();
  }

  async getSession() {
    const client = await this.supabase.getClient();
    return client.auth.getSession();
  }

  async getUser(): Promise<User | null> {
    const client = await this.supabase.getClient();
    const { data, error } = await client.auth.getUser();

    if (error) {
      return null;
    }

    return data.user;
  }

  async onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const client = await this.supabase.getClient();
    return client.auth.onAuthStateChange(callback);
  }

  async isAdmin(userId?: string): Promise<boolean> {
    const client = await this.supabase.getClient();
    const id = userId ?? (await this.getUser())?.id;

    if (!id) {
      return false;
    }

    const { data, error } = await client
      .from('app_admins')
      .select('user_id')
      .eq('user_id', id)
      .maybeSingle();

    if (error) {
      return false;
    }

    return Boolean(data);
  }
}
