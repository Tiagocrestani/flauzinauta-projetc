# Flauzinauta

Plataforma pública para descobrir e ler HQs online. O front-end usa Angular e a camada de dados está preparada para Supabase Database, Storage e Auth administrativo.

## Rodar o projeto

```bash
npm install
npm start
```

O site abre em `http://localhost:4200`.

## Origem dos dados

O projeto já está conectado ao Supabase `flauzinauta`. Com URL e chave publishable configuradas em `src/environments/environment.ts`, o Angular usa `SupabaseComicRepository`. Se essas configurações forem removidas, a aplicação usa um catálogo local de contingência com a mesma HQ real.

A chave publishable é pública por definição e pode existir no bundle do navegador. Nunca coloque a chave `service_role` no Angular ou em arquivos versionados.

## Estrutura do Supabase

A estrutura pública utilizada pela aplicação é simples:

- `comics`
- `issues`
- `pages`
- `app_admins`
- buckets públicos `comic-covers` e `comic-pages`
- políticas RLS para leitura pública apenas do conteúdo publicado
- permissões de escrita apenas para usuários cadastrados como administradores

Mesmo sendo imagens, a plataforma ainda usa três tabelas pequenas. `comics` guarda os dados da HQ, `issues` organiza partes ou edições e `pages` mantém a ordem das imagens. Os arquivos ficam no Storage, não dentro do banco.

As tabelas antigas `authors`, `genres` e `comic_genres` foram preservadas apenas para permitir uma limpeza posterior com segurança. O front-end e os novos cadastros não dependem mais delas. Autor e gênero agora ficam diretamente em `comics`.

O arquivo `supabase/seed.sql` cadastra `Fláuzinauta — A Guerra no Céu — Parte 1`. Os seis exemplos anteriores estão arquivados no Supabase e não aparecem no site.

## Criar e conectar o projeto Supabase

O projeto Supabase já foi criado e conectado. Para reconstruir outro ambiente, aplique as migrations da pasta `supabase/migrations` em ordem, envie as imagens para os dois buckets e execute `supabase/seed.sql`.

Os arquivos atuais estão organizados assim:

```text
comic-covers/flauzinauta/cover.webp
comic-pages/flauzinauta/a-guerra-no-ceu-parte-1/001.webp
...
comic-pages/flauzinauta/a-guerra-no-ceu-parte-1/014-final.webp
```

## Painel administrativo

O site público não exige conta. O Supabase Auth é usado somente no painel administrativo, disponível em:

```text
http://localhost:4200/admin/login
```

O painel inclui:

- login e proteção de todas as rotas administrativas
- resumo de HQs, partes e páginas
- criação de uma HQ com capa e primeira parte
- upload e ordenação das imagens da parte
- inclusão de novas partes em uma HQ existente
- publicação, arquivamento e retorno para rascunho
- links para visualizar o conteúdo publicado no site

As imagens são ordenadas naturalmente pelo nome do arquivo. Por exemplo, `2.png` vem antes de `10.png`. Antes do envio também é possível alterar a ordem manualmente.

### Liberar o primeiro administrador

Por segurança, a senha não deve ser enviada pelo chat nem escrita no código. Crie o primeiro usuário em `Authentication > Users` no painel do Supabase e copie o UUID gerado. Depois, no SQL Editor, execute:

```sql
insert into public.app_admins (user_id)
values ('UUID_DO_USUARIO')
on conflict (user_id) do nothing;
```

Esse cadastro separado impede que qualquer pessoa que possua uma conta do Supabase acesse o painel. Depois disso, entre em `/admin/login` com o e-mail e a senha criados.

### Cadastro de conteúdo

Em `Nova HQ`, o formulário envia a capa para `comic-covers`, as páginas para `comic-pages` e registra somente os metadados e a ordem no banco. A criação começa como rascunho, exceto quando a opção de publicar imediatamente estiver marcada.

Para cadastrar a continuação de uma HQ, abra o dashboard e use `Nova parte` na linha correspondente. Os formatos aceitos são AVIF, JPEG, PNG, SVG e WebP, com limite de 15 MB por imagem.

## Arquitetura da integração

```text
Telas Angular
  -> COMIC_REPOSITORY
     -> MockComicRepository, sem configuração
     -> SupabaseComicRepository, com URL e publishable key
        -> PostgreSQL, HQ, parte e ordem das páginas
        -> Storage, capa e imagens da HQ
```

O progresso de leitura continua no `localStorage`, pois a leitura é pública e não exige conta.
