create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
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

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "Admins manage authors" on public.authors;
drop policy if exists "Public can read authors" on public.authors;
create policy "Anyone can read authors" on public.authors for select to anon, authenticated using (true);
create policy "Admins can insert authors" on public.authors for insert to authenticated
with check ((select private.is_admin()));
create policy "Admins can update authors" on public.authors for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete authors" on public.authors for delete to authenticated
using ((select private.is_admin()));

drop policy if exists "Admins manage genres" on public.genres;
drop policy if exists "Public can read genres" on public.genres;
create policy "Anyone can read genres" on public.genres for select to anon, authenticated using (true);
create policy "Admins can insert genres" on public.genres for insert to authenticated
with check ((select private.is_admin()));
create policy "Admins can update genres" on public.genres for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete genres" on public.genres for delete to authenticated
using ((select private.is_admin()));

drop policy if exists "Admins manage comics" on public.comics;
drop policy if exists "Public can read published comics" on public.comics;
create policy "Visitors can read published comics" on public.comics for select to anon
using (publication_status = 'published');
create policy "Admins can read all comics" on public.comics for select to authenticated
using (publication_status = 'published' or (select private.is_admin()));
create policy "Admins can insert comics" on public.comics for insert to authenticated
with check ((select private.is_admin()));
create policy "Admins can update comics" on public.comics for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete comics" on public.comics for delete to authenticated
using ((select private.is_admin()));

drop policy if exists "Admins manage comic genres" on public.comic_genres;
drop policy if exists "Public can read genres of published comics" on public.comic_genres;
create policy "Visitors can read genres of published comics" on public.comic_genres for select to anon
using (
  exists (
    select 1 from public.comics
    where comics.id = comic_genres.comic_id
      and comics.publication_status = 'published'
  )
);
create policy "Admins can read all comic genres" on public.comic_genres for select to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.comics
    where comics.id = comic_genres.comic_id
      and comics.publication_status = 'published'
  )
);
create policy "Admins can insert comic genres" on public.comic_genres for insert to authenticated
with check ((select private.is_admin()));
create policy "Admins can update comic genres" on public.comic_genres for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete comic genres" on public.comic_genres for delete to authenticated
using ((select private.is_admin()));

drop policy if exists "Admins manage issues" on public.issues;
drop policy if exists "Public can read published issues" on public.issues;
create policy "Visitors can read published issues" on public.issues for select to anon
using (
  publication_status = 'published'
  and exists (
    select 1 from public.comics
    where comics.id = issues.comic_id
      and comics.publication_status = 'published'
  )
);
create policy "Admins can read all issues" on public.issues for select to authenticated
using (
  (select private.is_admin())
  or (
    publication_status = 'published'
    and exists (
      select 1 from public.comics
      where comics.id = issues.comic_id
        and comics.publication_status = 'published'
    )
  )
);
create policy "Admins can insert issues" on public.issues for insert to authenticated
with check ((select private.is_admin()));
create policy "Admins can update issues" on public.issues for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete issues" on public.issues for delete to authenticated
using ((select private.is_admin()));

drop policy if exists "Admins manage pages" on public.pages;
drop policy if exists "Public can read pages of published issues" on public.pages;
create policy "Visitors can read pages of published issues" on public.pages for select to anon
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
create policy "Admins can read all pages" on public.pages for select to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.issues
    join public.comics on comics.id = issues.comic_id
    where issues.id = pages.issue_id
      and issues.publication_status = 'published'
      and comics.publication_status = 'published'
  )
);
create policy "Admins can insert pages" on public.pages for insert to authenticated
with check ((select private.is_admin()));
create policy "Admins can update pages" on public.pages for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete pages" on public.pages for delete to authenticated
using ((select private.is_admin()));

drop policy if exists "Admins can upload comic assets" on storage.objects;
drop policy if exists "Admins can list comic assets" on storage.objects;
drop policy if exists "Admins can update comic assets" on storage.objects;
drop policy if exists "Admins can delete comic assets" on storage.objects;

create policy "Admins can upload comic assets" on storage.objects for insert to authenticated
with check (bucket_id in ('comic-covers', 'comic-pages') and (select private.is_admin()));
create policy "Admins can list comic assets" on storage.objects for select to authenticated
using (bucket_id in ('comic-covers', 'comic-pages') and (select private.is_admin()));
create policy "Admins can update comic assets" on storage.objects for update to authenticated
using (bucket_id in ('comic-covers', 'comic-pages') and (select private.is_admin()))
with check (bucket_id in ('comic-covers', 'comic-pages') and (select private.is_admin()));
create policy "Admins can delete comic assets" on storage.objects for delete to authenticated
using (bucket_id in ('comic-covers', 'comic-pages') and (select private.is_admin()));

drop function if exists public.is_admin();
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
