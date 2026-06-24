# Prompt de largada — Claude Code

Cole a mensagem abaixo como a **primeira** mensagem pro Claude Code, depois de ter
o repositório aberto com os arquivos `pauta-spec.md` e `pauta-schema.sql` dentro.

---

Você vai me ajudar a construir o **Pauta**, um app de agenda compartilhada de
bandas. Antes de escrever qualquer código, **leia `pauta-spec.md` e
`pauta-schema.sql` neste repositório** — eles são a fonte da verdade do projeto.
Não re-discuta decisões já fechadas no spec.

Contexto importante sobre mim:
- Trabalho **só pelo celular**, sem terminal. Você executa tudo (código, git,
  comandos). Eu reviso e aprovo.
- Sei pouco de programação e estou estudando. **Comente o código em português,
  de forma didática**, explicando o porquê das coisas.
- Stack: **Next.js (App Router) + Tailwind**, **PWA mobile-first**, **Supabase**
  (Postgres + Auth + RLS), deploy na **Vercel** via GitHub.

Como quero trabalhar:
- **Passo a passo, com auditoria.** A cada etapa, me explique o que fez e por quê,
  faça commits pequenos e claros, e espere meu OK antes de seguir.
- Comece pelo **scaffold mínimo** e só então construa **a Fase 1** descrita no spec.
  Não construa nada da Fase 2 ainda.

Plano que eu espero (confirme comigo antes de começar):
1. Scaffold do Next.js + Tailwind + configuração de PWA, e um commit inicial.
2. Conexão com o Supabase (cliente, variáveis de ambiente) e aplicação da migração
   `pauta-schema.sql`. Use o conector do Supabase se disponível.
3. Autenticação por telefone (OTP por SMS para a demo, conforme o spec) + criação
   automática do `profile`.
4. Tela **Minha agenda**: calendário do mês, dias verdes por padrão, toque pra
   marcar talvez/ocupado. Visual escuro "casa de show" conforme o protótipo.
5. **Bandas**: criar banda, gerar link de convite, entrar via link, listar bandas.
6. **Calendário da banda**: agregação pelo pior estado, com quem está em cada cor,
   e a faixa "datas livres pra todos" com fim de semana em destaque.
7. **Reservar data** (full/partial) — o gatilho do banco cuida do auto-bloqueio
   cross-band. Tela de **compartilhar** (texto + .ics + link Google Agenda).
8. Co-moderador (promover/rebaixar, sem deixar a banda sem moderador).

Use o arquivo `pauta-prototipo.html` (se eu te enviar) como referência de fluxo e
de identidade visual. Quando precisar de uma decisão minha, **pergunte uma coisa
de cada vez**.

Pode começar confirmando que leu o spec e me propondo o passo 1.
