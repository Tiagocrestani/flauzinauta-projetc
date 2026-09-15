export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export interface Database {
  public: {
    Tables: {
      app_admins: TableDefinition<
        { user_id: string; created_at: string },
        { user_id: string; created_at?: string },
        { user_id?: string; created_at?: string }
      >;
      authors: TableDefinition<
        { id: string; name: string; slug: string; created_at: string },
        { id?: string; name: string; slug: string; created_at?: string },
        { id?: string; name?: string; slug?: string; created_at?: string }
      >;
      genres: TableDefinition<
        { id: string; name: string; slug: string; created_at: string },
        { id?: string; name: string; slug: string; created_at?: string },
        { id?: string; name?: string; slug?: string; created_at?: string }
      >;
      comics: TableDefinition<
        {
          id: string;
          author_id: string | null;
          author: string;
          genre: string;
          title: string;
          slug: string;
          description: string;
          tagline: string;
          cover_path: string;
          status: 'Em andamento' | 'Concluída' | 'Em hiato';
          publication_status: 'draft' | 'published' | 'archived';
          release_date: string;
          featured: boolean;
          accent_color: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          author_id?: string | null;
          author?: string;
          genre?: string;
          title: string;
          slug: string;
          description?: string;
          tagline?: string;
          cover_path: string;
          status?: 'Em andamento' | 'Concluída' | 'Em hiato';
          publication_status?: 'draft' | 'published' | 'archived';
          release_date: string;
          featured?: boolean;
          accent_color?: string;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          author_id?: string | null;
          author?: string;
          genre?: string;
          title?: string;
          slug?: string;
          description?: string;
          tagline?: string;
          cover_path?: string;
          status?: 'Em andamento' | 'Concluída' | 'Em hiato';
          publication_status?: 'draft' | 'published' | 'archived';
          release_date?: string;
          featured?: boolean;
          accent_color?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      comic_genres: TableDefinition<
        { comic_id: string; genre_id: string; position: number; created_at: string },
        { comic_id: string; genre_id: string; position?: number; created_at?: string },
        { comic_id?: string; genre_id?: string; position?: number; created_at?: string }
      >;
      issues: TableDefinition<
        {
          id: string;
          comic_id: string;
          number: number;
          slug: string;
          title: string;
          description: string;
          cover_path: string | null;
          publication_status: 'draft' | 'published' | 'archived';
          published_at: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          comic_id: string;
          number: number;
          slug: string;
          title: string;
          description?: string;
          cover_path?: string | null;
          publication_status?: 'draft' | 'published' | 'archived';
          published_at: string;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          comic_id?: string;
          number?: number;
          slug?: string;
          title?: string;
          description?: string;
          cover_path?: string | null;
          publication_status?: 'draft' | 'published' | 'archived';
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      pages: TableDefinition<
        {
          id: string;
          issue_id: string;
          page_number: number;
          image_path: string;
          width: number | null;
          height: number | null;
          alt_text: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          issue_id: string;
          page_number: number;
          image_path: string;
          width?: number | null;
          height?: number | null;
          alt_text?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          issue_id?: string;
          page_number?: number;
          image_path?: string;
          width?: number | null;
          height?: number | null;
          alt_text?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
