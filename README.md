# Hub da Mireia — Tarefas & Wishlist ✨

Hub pessoal da Mireia (ミレイア), na mesma estética fofa do
[gmhub](https://github.com/spaade/gmhub): mobile-first, Fredoka + Quicksand,
paleta rosa/lavanda/dourado. Diferente do gmhub, este projeto guarda tudo num
banco de dados de verdade (Postgres), então o que ela cria fica salvo pra
sempre e aparece igual em qualquer aparelho — não depende do navegador.

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
api/lib/db.js            conexão Postgres + criação do schema
api/categories.js        CRUD de categorias/álbuns
api/tasks.js             CRUD de tarefas
api/wishlist.js          CRUD de itens da wishlist
```

## Banco de dados

Usa **Postgres puro** via [`pg`](https://www.npmjs.com/package/pg) — funciona
com qualquer Postgres (Neon, Supabase, o Postgres integrado da Vercel etc.).
As tabelas (`categories`, `tasks`, `wishlist_items`) são criadas
automaticamente (`CREATE TABLE IF NOT EXISTS`) na primeira chamada de API,
então não precisa rodar nenhuma migration manual.

### Configurando o Postgres na Vercel

1. No projeto, vá em **Storage → Create Database → Postgres** (é o Neon por
   trás, no plano gratuito já é mais que suficiente pro tamanho desse app).
2. Conecte o banco ao projeto — a Vercel injeta sozinha a variável de
   ambiente `POSTGRES_URL` (ou `DATABASE_URL`).
3. Redeploy. Na primeira tarefa/álbum criado, o schema é criado sozinho.

Se preferir outro provedor (Neon direto, Supabase, Railway...), basta
adicionar a connection string manualmente em **Settings → Environment
Variables** como `POSTGRES_URL`.

## Deploy (Vercel)

1. Crie conta em [vercel.com](https://vercel.com) com seu GitHub.
2. "Add New… → Project" → selecione este repositório.
3. Framework preset: **Other** (site estático + funções serverless, sem
   build command).
4. Configure o Postgres (veja acima) antes ou depois do primeiro deploy —
   sem ele, as chamadas de API retornam erro 500 avisando que falta
   `POSTGRES_URL`.
5. Deploy. A URL fica algo como `nome-do-projeto.vercel.app`.

## Rodando localmente

Precisa de um Postgres acessível (local ou na nuvem) e da [Vercel
CLI](https://vercel.com/docs/cli) pra simular as funções serverless:

```bash
npm install
vercel env pull .env.local   # baixa POSTGRES_URL do projeto já linkado
vercel dev
```

Sem a Vercel CLI, `index.html` também abre direto no navegador, mas as
chamadas a `/api/*` não vão funcionar (precisam do runtime serverless).

## Privacidade

Sem fotos ou dados sensíveis no código — é um repositório privado, mas o
conteúdo em si (tarefas, wishlist) vive só no banco de dados, nunca no git.
