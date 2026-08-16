# Hub da Mireia — Tarefas & Wishlist ✨

Hub pessoal da Mireia (ミレイア), na mesma estética fofa do
[gmhub](https://github.com/spaade/gmhub): mobile-first, Fredoka + Quicksand,
paleta rosa/lavanda/dourado. Diferente do gmhub, este projeto guarda tudo num
banco de dados de verdade, então o que ela cria fica salvo pra sempre e
aparece igual em qualquer aparelho — não depende do navegador.

## O que dá pra fazer

- **Tarefas**: criar tarefas com categoria e prioridade (alta/média/baixa),
  marcar como feitas, filtrar por categoria/prioridade/status, navegar dia a
  dia (◀ ▶ / "Hoje") ou ver tudo agrupado por data.
- **Wishlist**: criar itens de desejo organizados em álbuns (categorias),
  com prioridade, preço e link opcionais, marcar como "já comprei" e
  filtrar por álbum/prioridade/status.
- Categorias e álbuns são criados na hora, direto pela interface (sem
  precisar mexer em código).

## Estrutura

```
index.html            página única (abas Tarefas / Wishlist)
css/style.css          estilos (mobile-first, paleta do gmhub)
js/config.js            textos e metadados de prioridade/emoji
js/api.js               wrapper de fetch pras rotas /api/*
js/script.js            abas, toast, utilitários de data
js/tasks.js             lógica da aba Tarefas
js/wishlist.js          lógica da aba Wishlist
api/lib/db.js            conexão com o banco + criação do schema
api/categories.js        CRUD de categorias/álbuns
api/tasks.js             CRUD de tarefas
api/wishlist.js          CRUD de itens da wishlist
```

## Banco de dados: Turso (grátis, sem cartão de crédito)

Usa [**Turso**](https://turso.tech) — SQLite hospedado na nuvem — via
[`@libsql/client`](https://www.npmjs.com/package/@libsql/client). O motivo de
não usar Postgres: a Vercel descontinuou o plano gratuito do Postgres
nativo (hoje só oferece via marketplace, pago). O Turso resolve isso: tier
free generoso (9 GB de armazenamento, ~1 bilhão de leituras/mês), de sobra
pro tamanho desse app, sem precisar de cartão pra criar conta.

As tabelas (`categories`, `tasks`, `wishlist_items`) são criadas
automaticamente (`CREATE TABLE IF NOT EXISTS`) na primeira chamada de API,
então não precisa rodar nenhuma migration manual.

### Criando o banco grátis

1. Crie conta em [turso.tech](https://turso.tech) (dá pra entrar com GitHub,
   sem cartão de crédito).
2. Instale a CLI e crie o banco:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   turso db create mhub-mireia
   ```
3. Pegue a URL de conexão e gere um token de acesso:
   ```bash
   turso db show mhub-mireia --url
   turso db tokens create mhub-mireia
   ```
4. No projeto da Vercel, vá em **Settings → Environment Variables** e
   adicione:
   - `TURSO_DATABASE_URL` = a URL do passo 3 (algo como
     `libsql://mhub-mireia-seu-usuario.turso.io`)
   - `TURSO_AUTH_TOKEN` = o token gerado no passo 3
5. Redeploy. Na primeira tarefa/álbum criado, o schema é criado sozinho.

## Deploy (Vercel)

1. Crie conta em [vercel.com](https://vercel.com) com seu GitHub.
2. "Add New… → Project" → selecione este repositório.
3. Framework preset: **Other** (site estático + funções serverless, sem
   build command).
4. Configure o Turso (veja acima) antes ou depois do primeiro deploy — sem
   as env vars, as chamadas de API retornam erro 500 avisando que falta
   `TURSO_DATABASE_URL`.
5. Deploy. A URL fica algo como `nome-do-projeto.vercel.app`.

## Rodando localmente

Não precisa nem de conta no Turso pra rodar local — dá pra usar um arquivo
SQLite local. Precisa da [Vercel CLI](https://vercel.com/docs/cli) pra
simular as funções serverless:

```bash
npm install
echo 'TURSO_DATABASE_URL="file:local.db"' > .env.local
vercel dev
```

Pra testar com o banco de verdade (Turso na nuvem), rode
`vercel env pull .env.local` no lugar do `echo` acima, com o projeto já
linkado e as env vars configuradas na Vercel.

Sem a Vercel CLI, `index.html` também abre direto no navegador, mas as
chamadas a `/api/*` não vão funcionar (precisam do runtime serverless).

## Privacidade

Sem fotos ou dados sensíveis no código — é um repositório privado, mas o
conteúdo em si (tarefas, wishlist) vive só no banco de dados, nunca no git.
