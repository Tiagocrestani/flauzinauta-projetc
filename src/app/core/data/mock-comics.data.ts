import { Comic, ComicPage, Issue } from '../models/comic.models';

const PAGE_ASSET_COUNT = 8;

function createPages(issueId: string): ComicPage[] {
  return Array.from({ length: PAGE_ASSET_COUNT }, (_, index) => {
    const pageNumber = index + 1;

    return {
      id: `${issueId}-page-${pageNumber}`,
      issueId,
      pageNumber,
      imageUrl: `assets/pages/page-${String(pageNumber).padStart(2, '0')}.svg`,
    };
  });
}

function createIssue(
  comicId: string,
  number: number,
  slug: string,
  title: string,
  description: string,
  publishedAt: string,
): Issue {
  const id = `${comicId}-issue-${number}`;

  return {
    id,
    comicId,
    number,
    slug,
    title,
    description,
    publishedAt,
    pages: createPages(id),
  };
}

export const MOCK_COMICS: Comic[] = [
  {
    id: 'comic-sentinela-solar',
    title: 'Sentinela Solar',
    slug: 'sentinela-solar',
    tagline: 'Quando o sol se apaga, ele é a última luz entre a cidade e o abismo.',
    description:
      'Após sobreviver a uma tempestade cósmica, o físico Davi Nascimento passa a canalizar a energia do sol. Agora, entre conspirações de Estado e ameaças vindas do espaço, ele precisa descobrir se um homem ainda pode permanecer humano quando carrega o poder de uma estrela.',
    coverUrl: 'assets/covers/sentinela-solar.svg',
    author: 'Luna Amaral',
    genres: ['Super-heróis', 'Ação'],
    status: 'Em andamento',
    releaseDate: '2025-03-14',
    featured: true,
    accentColor: '#ffd23f',
    issues: [
      createIssue(
        'comic-sentinela-solar',
        1,
        'o-sol-negro',
        'O Sol Negro',
        'Um eclipse impossível cobre o país e força Davi a enfrentar a entidade que nasceu junto com seus poderes.',
        '2025-03-14',
      ),
      createIssue(
        'comic-sentinela-solar',
        2,
        'cerco-a-brasilia',
        'Cerco a Brasília',
        'Sem acesso à luz do dia, o Sentinela precisa impedir que uma arma orbital transforme a capital em território inimigo.',
        '2025-10-17',
      ),
      createIssue(
        'comic-sentinela-solar',
        3,
        'a-ultima-alvorada',
        'A Última Alvorada',
        'O Sol Negro retorna mais poderoso e Davi encara uma escolha capaz de salvar o planeta ao custo de tudo o que ama.',
        '2026-08-28',
      ),
    ],
  },
  {
    id: 'comic-vertice',
    title: 'Vértice',
    slug: 'vertice',
    tagline: 'Toda cidade tem um ponto de ruptura. Ela consegue enxergá-lo.',
    description:
      'A engenheira Lia Ventura desperta a capacidade de dobrar a gravidade depois do colapso de um laboratório clandestino. Caçada pela corporação responsável, ela atravessa os céus de São Paulo para impedir que a metrópole seja usada como campo de testes.',
    coverUrl: 'assets/covers/vertice.svg',
    author: 'Caio Nishimura',
    genres: ['Super-heróis', 'Ficção científica'],
    status: 'Em andamento',
    releaseDate: '2025-07-25',
    featured: true,
    accentColor: '#20d6ff',
    issues: [
      createIssue(
        'comic-vertice',
        1,
        'queda-livre',
        'Queda Livre',
        'Lia acorda entre os destroços do projeto Vértice e descobre que as leis da física já não conseguem detê-la.',
        '2025-07-25',
      ),
      createIssue(
        'comic-vertice',
        2,
        'cidade-invertida',
        'Cidade Invertida',
        'Prédios começam a perder o peso e Lia precisa alcançar o centro da anomalia antes que São Paulo caia sobre si mesma.',
        '2026-05-15',
      ),
    ],
  },
  {
    id: 'comic-arara-rubra',
    title: 'Arara Rubra',
    slug: 'arara-rubra',
    tagline: 'A floresta ganhou asas — e não pretende recuar.',
    description:
      'A piloto e bióloga Maíra Aruã veste uma armadura alimentada por tecnologia ancestral para defender a Amazônia. Entre o céu e as copas, ela combate uma rede mercenária que transforma espécies raras em armas biológicas.',
    coverUrl: 'assets/covers/arara-rubra.svg',
    author: 'Iara Monteiro',
    genres: ['Super-heróis', 'Aventura'],
    status: 'Em andamento',
    releaseDate: '2024-06-07',
    featured: true,
    accentColor: '#ef3e4a',
    issues: [
      createIssue(
        'comic-arara-rubra',
        1,
        'asas-sobre-manaus',
        'Asas sobre Manaus',
        'Um ataque no encontro das águas revela o primeiro protótipo construído para caçar a Arara Rubra.',
        '2024-06-07',
      ),
      createIssue(
        'comic-arara-rubra',
        2,
        'sangue-da-floresta',
        'Sangue da Floresta',
        'Maíra segue um carregamento ilegal até uma base onde cada árvore abatida alimenta uma criatura artificial.',
        '2025-02-21',
      ),
      createIssue(
        'comic-arara-rubra',
        3,
        'ceu-em-chamas',
        'Céu em Chamas',
        'Com a floresta cercada pelo fogo, a heroína reúne antigos rivais para uma batalha acima das nuvens.',
        '2026-04-10',
      ),
    ],
  },
  {
    id: 'comic-guardia-do-cerrado',
    title: 'Guardiã do Cerrado',
    slug: 'guardia-do-cerrado',
    tagline: 'Enquanto uma raiz resistir, a terra terá quem lute por ela.',
    description:
      'Escolhida pelas veredas, a brigadista Joana Veríssimo ouve a memória da terra e desperta forças que atravessam gerações. Seu primeiro desafio é deter um incêndio sobrenatural que apaga pessoas, histórias e rios por onde passa.',
    coverUrl: 'assets/covers/guardia-do-cerrado.svg',
    author: 'Marina Dourado',
    genres: ['Super-heróis', 'Mitologia brasileira'],
    status: 'Concluída',
    releaseDate: '2024-09-20',
    featured: false,
    accentColor: '#45c873',
    issues: [
      createIssue(
        'comic-guardia-do-cerrado',
        1,
        'o-chamado-das-veredas',
        'O Chamado das Veredas',
        'Ao combater uma queimada, Joana encontra uma nascente impossível e aceita o legado de sua nova guardiã.',
        '2024-09-20',
      ),
      createIssue(
        'comic-guardia-do-cerrado',
        2,
        'fogo-fantasma',
        'Fogo Fantasma',
        'As chamas avançam sem calor e obrigam Joana a desenterrar o pacto que sua família tentou esquecer.',
        '2025-04-04',
      ),
    ],
  },
  {
    id: 'comic-pulso-escarlate',
    title: 'Pulso Escarlate',
    slug: 'pulso-escarlate',
    tagline: 'Ele sente cada impacto. E devolve todos de uma vez.',
    description:
      'O socorrista Miguel Santana absorve energia cinética desde uma explosão no porto de Salvador. Dividido entre salvar vidas e perseguir os responsáveis, ele descobre que sua força cresce na mesma medida que sua raiva.',
    coverUrl: 'assets/covers/pulso-escarlate.svg',
    author: 'Rafael Luz',
    genres: ['Super-heróis', 'Policial'],
    status: 'Em andamento',
    releaseDate: '2025-11-07',
    featured: true,
    accentColor: '#ff4d36',
    issues: [
      createIssue(
        'comic-pulso-escarlate',
        1,
        'ponto-de-impacto',
        'Ponto de Impacto',
        'Uma noite de resgates termina em explosão e transforma Miguel na única testemunha viva de um crime impossível.',
        '2025-11-07',
      ),
      createIssue(
        'comic-pulso-escarlate',
        2,
        'cidade-em-choque',
        'Cidade em Choque',
        'Uma onda de violência alimenta seus poderes enquanto o verdadeiro inimigo aprende a usar cada golpe contra ele.',
        '2026-07-03',
      ),
    ],
  },
  {
    id: 'comic-liga-do-horizonte',
    title: 'Liga do Horizonte',
    slug: 'liga-do-horizonte',
    tagline: 'Seis cidades. Uma ameaça. Nenhum herói vence sozinho.',
    description:
      'Quando fendas luminosas isolam capitais brasileiras, heróis que nunca trabalharam juntos precisam formar uma aliança. O que começa como uma missão de resgate logo revela um futuro no qual a Liga já perdeu.',
    coverUrl: 'assets/covers/liga-do-horizonte.svg',
    author: 'Breno Azevedo',
    genres: ['Super-heróis', 'Drama'],
    status: 'Em andamento',
    releaseDate: '2025-05-30',
    featured: false,
    accentColor: '#3d6cff',
    issues: [
      createIssue(
        'comic-liga-do-horizonte',
        1,
        'linha-de-frente',
        'Linha de Frente',
        'O horizonte se parte sobre o Rio de Janeiro e uma equipe improvisada tenta salvar uma cidade dividida em duas realidades.',
        '2025-05-30',
      ),
      createIssue(
        'comic-liga-do-horizonte',
        2,
        'depois-do-amanha',
        'Depois do Amanhã',
        'Uma mensagem enviada por seus próprios sobreviventes mostra à Liga o preço de falhar pela segunda vez.',
        '2026-02-13',
      ),
    ],
  },
];
