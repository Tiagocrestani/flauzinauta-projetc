alter table public.comics
  add column if not exists author text not null default '',
  add column if not exists genre text not null default '';

update public.comics c
set
  author = coalesce((
    select a.name
    from public.authors a
    where a.id = c.author_id
  ), ''),
  genre = coalesce((
    select g.name
    from public.comic_genres cg
    join public.genres g on g.id = cg.genre_id
    where cg.comic_id = c.id
    order by cg.position, g.name
    limit 1
  ), '')
where c.author = '' or c.genre = '';

alter table public.comics
  add constraint comics_author_not_blank check (length(trim(author)) > 0) not valid,
  add constraint comics_genre_not_blank check (length(trim(genre)) > 0) not valid;
