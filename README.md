# Pauta 🎸

> A agenda compartilhada de bandas. Cada músico mantém **uma** disponibilidade
> pessoal; cada banda lê essa disponibilidade e descobre as datas que servem pra
> todo mundo.

O princípio que sustenta tudo: **disponibilidade é da PESSOA, não da banda.**
Quando alguém fica comprometido, **todas as bandas veem aquele dia bloqueado
automaticamente** — sem precisar avisar três vezes.

A fonte da verdade do projeto está em [`pauta-spec.md`](./pauta-spec.md) e
[`pauta-schema.sql`](./pauta-schema.sql). As decisões ali já estão fechadas.

---

## Stack

- **Front:** Next.js (App Router) + Tailwind CSS — PWA mobile-first.
- **Back:** Supabase (Postgres + Auth + RLS). *(entra no Passo 2)*
- **Deploy:** Vercel, conectada ao GitHub (push → deploy automático).
- **Idioma:** interface e comentários de código em português do Brasil.

## Como o código está organizado

```
src/
  app/
    layout.tsx      # layout raiz: fontes, tema escuro, metadados/PWA
    page.tsx        # tela inicial (provisória) — valida a estética
    globals.css     # estilos base (Tailwind + fundo "casa de show")
tailwind.config.ts  # tokens de cor do protótipo (brand, free/maybe/busy...)
public/
  manifest.webmanifest  # configuração do PWA (app instalável)
  icon.svg              # ícone do app
```

## Rodar localmente (para referência)

> O desenvolvimento deste projeto é feito **só pelo celular**, via Claude Code +
> GitHub + Vercel. Estes comandos ficam aqui só como documentação.

```bash
npm install     # instala as dependências
npm run dev     # ambiente de desenvolvimento em http://localhost:3000
npm run build   # build de produção (o mesmo que a Vercel roda)
```

## Plano de construção (Fase 1 — a demo)

A regra de ouro: **não construir a Fase 2 antes da Fase 1 rodar.**

- [x] **1. Scaffold** — Next.js + Tailwind + PWA
- [ ] 2. Supabase (cliente, variáveis de ambiente, migração do schema)
- [ ] 3. Login por telefone (OTP por SMS) + criação do perfil
- [ ] 4. Tela "Minha agenda" (calendário, 3 estados de disponibilidade)
- [ ] 5. Bandas (criar, convidar por link, entrar, listar)
- [ ] 6. Calendário da banda (pior estado + datas livres pra todos)
- [ ] 7. Reservar data (full/partial) + compartilhar (.ics / Google Agenda)
- [ ] 8. Co-moderador (promover/rebaixar)

A **Fase 2** (recorrência, substitutos, lembretes, importação de calendário)
fica para depois que a demo provar que vale.
