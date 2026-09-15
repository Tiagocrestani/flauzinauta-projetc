update public.comics
set publication_status = 'archived',
    featured = false
where slug <> 'flauzinauta';

with current_comic as (
  insert into public.comics (
    id,
    title,
    slug,
    description,
    tagline,
    cover_path,
    status,
    publication_status,
    release_date,
    featured,
    accent_color,
    author,
    genre
  )
  values (
    '33333333-3333-4333-8333-333333333390',
    'Fláuzinauta',
    'flauzinauta',
    'Antes da guerra, só existia adoração. Quando Lúcifer começou a olhar para outro lugar, a ordem celestial foi desafiada e a Guerra no Céu começou.',
    'A Guerra no Céu começou.',
    'flauzinauta/cover.webp',
    'Em andamento',
    'published',
    '2026-09-14',
    true,
    '#D6A43B',
    'Equipe Flauzinauta',
    'Fantasia'
  )
  on conflict (slug) do update
  set
    title = excluded.title,
    description = excluded.description,
    tagline = excluded.tagline,
    cover_path = excluded.cover_path,
    status = excluded.status,
    publication_status = excluded.publication_status,
    release_date = excluded.release_date,
    featured = excluded.featured,
    accent_color = excluded.accent_color,
    author = excluded.author,
    genre = excluded.genre,
    updated_at = now()
  returning id
),
current_issue as (
  insert into public.issues (
    id,
    comic_id,
    number,
    slug,
    title,
    description,
    cover_path,
    publication_status,
    published_at
  )
  select
    '44444444-4444-4444-8444-444444440090',
    id,
    1,
    'a-guerra-no-ceu-parte-1',
    'A Guerra no Céu — Parte 1',
    'Antes da guerra, só existia adoração. O desejo de Lúcifer coloca a ordem celestial à prova e inicia uma batalha que mudará tudo.',
    'flauzinauta/cover.webp',
    'published',
    '2026-09-14'
  from current_comic
  on conflict (comic_id, slug) do update
  set
    number = excluded.number,
    title = excluded.title,
    description = excluded.description,
    cover_path = excluded.cover_path,
    publication_status = excluded.publication_status,
    published_at = excluded.published_at,
    updated_at = now()
  returning id
)
insert into public.pages (issue_id, page_number, image_path, width, height, alt_text)
select
  current_issue.id,
  page_data.page_number,
  page_data.image_path,
  page_data.width,
  page_data.height,
  'Página ' || page_data.page_number || ' de A Guerra no Céu — Parte 1'
from current_issue
cross join (
  values
    (1,  'flauzinauta/a-guerra-no-ceu-parte-1/001.webp', 1638, 2048),
    (2,  'flauzinauta/a-guerra-no-ceu-parte-1/002.webp', 1638, 2048),
    (3,  'flauzinauta/a-guerra-no-ceu-parte-1/003.webp', 1638, 2048),
    (4,  'flauzinauta/a-guerra-no-ceu-parte-1/004.webp', 1638, 2048),
    (5,  'flauzinauta/a-guerra-no-ceu-parte-1/005.webp', 1638, 2048),
    (6,  'flauzinauta/a-guerra-no-ceu-parte-1/006.webp', 1638, 2048),
    (7,  'flauzinauta/a-guerra-no-ceu-parte-1/007.webp', 1638, 2048),
    (8,  'flauzinauta/a-guerra-no-ceu-parte-1/008.webp', 1638, 2048),
    (9,  'flauzinauta/a-guerra-no-ceu-parte-1/009.webp', 1638, 2048),
    (10, 'flauzinauta/a-guerra-no-ceu-parte-1/010.webp', 1638, 2048),
    (11, 'flauzinauta/a-guerra-no-ceu-parte-1/011.webp', 1638, 2048),
    (12, 'flauzinauta/a-guerra-no-ceu-parte-1/012.webp', 1638, 2048),
    (13, 'flauzinauta/a-guerra-no-ceu-parte-1/013.webp', 1638, 2048),
    (14, 'flauzinauta/a-guerra-no-ceu-parte-1/014-final.webp', 1055, 1491)
) as page_data(page_number, image_path, width, height)
on conflict (issue_id, page_number) do update
set
  image_path = excluded.image_path,
  width = excluded.width,
  height = excluded.height,
  alt_text = excluded.alt_text,
  updated_at = now();
