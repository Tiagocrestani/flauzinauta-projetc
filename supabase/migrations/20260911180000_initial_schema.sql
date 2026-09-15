create extension if not exists pgcrypto;

create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  constraint authors_name_not_blank check (length(trim(name)) > 0),
  constraint authors_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now(),
  constraint genres_name_not_blank check (length(trim(name)) > 0),
  constraint genres_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.comics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.authors(id) on delete restrict,
  title text not null,
  slug text not null unique,
  description text not null default '',
  tagline text not null default '',
  cover_path text not null,
  status text not null default 'Em andamento',
  publication_status text not null default 'draft',
  release_date date not null,
  featured boolean not null default false,
  accent_color text not null default '#FFD23F',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comics_title_not_blank check (length(trim(title)) > 0),
  constraint comics_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint comics_status_valid check (status in ('Em andamento', 'Concluída', 'Em hiato')),
  constraint comics_publication_status_valid check (
    publication_status in ('draft', 'published', 'archived')
  ),
  constraint comics_accent_color_valid check (accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.comic_genres (
  comic_id uuid not null references public.comics(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete restrict,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (comic_id, genre_id),
  constraint comic_genres_position_valid check (position >= 0)
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid not null references public.comics(id) on delete cascade,
  number integer not null,
  slug text not null,
  title text not null,
  description text not null default '',
  cover_path text,
  publication_status text not null default 'draft',
  published_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comic_id, number),
  unique (comic_id, slug),
  constraint issues_number_valid check (number > 0),
  constraint issues_title_not_blank check (length(trim(title)) > 0),
  constraint issues_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint issues_publication_status_valid check (
    publication_status in ('draft', 'published', 'archived')
  )
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  page_number integer not null,
  image_path text not null,
  width integer,
  height integer,
  alt_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (issue_id, page_number),
  unique (issue_id, image_path),
  constraint pages_page_number_valid check (page_number > 0),
  constraint pages_image_path_not_blank check (length(trim(image_path)) > 0),
  constraint pages_width_valid check (width is null or width > 0),
  constraint pages_height_valid check (height is null or height > 0)
);

create index comics_author_id_idx on public.comics(author_id);
create index comics_publication_release_idx
  on public.comics(publication_status, release_date desc);
create index issues_comic_id_idx on public.issues(comic_id);
create index issues_publication_date_idx
  on public.issues(publication_status, published_at desc);
create index pages_issue_number_idx on public.pages(issue_id, page_number);
create index comic_genres_genre_id_idx on public.comic_genres(genre_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger comics_set_updated_at
before update on public.comics
for each row execute function public.set_updated_at();

create trigger issues_set_updated_at
before update on public.issues
for each row execute function public.set_updated_at();

create trigger pages_set_updated_at
before update on public.pages
for each row execute function public.set_updated_at();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.app_admins enable row level security;
alter table public.authors enable row level security;
alter table public.genres enable row level security;
alter table public.comics enable row level security;
alter table public.comic_genres enable row level security;
alter table public.issues enable row level security;
alter table public.pages enable row level security;

create policy "Users can check their own admin access"
on public.app_admins
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Public can read authors"
on public.authors
for select
to anon, authenticated
using (true);

create policy "Public can read genres"
on public.genres
for select
to anon, authenticated
using (true);

create policy "Public can read published comics"
on public.comics
for select
to anon, authenticated
using (publication_status = 'published');

create policy "Public can read genres of published comics"
on public.comic_genres
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.comics
    where comics.id = comic_genres.comic_id
      and comics.publication_status = 'published'
  )
);

create policy "Public can read published issues"
on public.issues
for select
to anon, authenticated
using (
  publication_status = 'published'
  and exists (
    select 1
    from public.comics
    where comics.id = issues.comic_id
      and comics.publication_status = 'published'
  )
);

create policy "Public can read pages of published issues"
on public.pages
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.issues
    join public.comics on comics.id = issues.comic_id
    where issues.id = pages.issue_id
      and issues.publication_status = 'published'
      and comics.publication_status = 'published'
  )
);

create policy "Admins manage authors"
on public.authors
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins manage genres"
on public.genres
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins manage comics"
on public.comics
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins manage comic genres"
on public.comic_genres
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins manage issues"
on public.issues
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins manage pages"
on public.pages
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant usage on schema public to anon, authenticated;
grant select on public.authors, public.genres, public.comics, public.comic_genres,
  public.issues, public.pages to anon, authenticated;
grant select on public.app_admins to authenticated;
grant insert, update, delete on public.authors, public.genres, public.comics,
  public.comic_genres, public.issues, public.pages to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'comic-covers',
    'comic-covers',
    true,
    15728640,
    array['image/avif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
  ),
  (
    'comic-pages',
    'comic-pages',
    true,
    15728640,
    array['image/avif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can list comic assets"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('comic-covers', 'comic-pages')
  and (select public.is_admin())
);

create policy "Admins can upload comic assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('comic-covers', 'comic-pages')
  and (select public.is_admin())
);

create policy "Admins can update comic assets"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('comic-covers', 'comic-pages')
  and (select public.is_admin())
)
with check (
  bucket_id in ('comic-covers', 'comic-pages')
  and (select public.is_admin())
);

create policy "Admins can delete comic assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('comic-covers', 'comic-pages')
  and (select public.is_admin())
);
