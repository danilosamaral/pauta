# Pauta — Documento-fonte do projeto

> A agenda compartilhada de bandas. Cada músico mantém **uma** disponibilidade
> pessoal; cada banda lê essa disponibilidade e descobre as datas que servem
> pra todo mundo. Este documento é a fonte da verdade — decisões aqui já estão
> fechadas e não devem ser re-discutidas durante o build.

---

## 1. O princípio que sustenta tudo

**Disponibilidade é da PESSOA, não da banda.** Um músico tem uma única agenda no
app. Todas as bandas dele "leem" essa mesma agenda em modo livre/ocupado. Quando
ele fica comprometido por qualquer motivo, **todas as bandas veem aquele dia
bloqueado automaticamente**. É isso que resolve o conflito entre bandas sem
ninguém ter que avisar três vezes.

A chave única da pessoa é o **número de telefone**.

---

## 2. Decisões fechadas (não reabrir)

- **Granularidade:** data inteira (não faixas de horário). Barato de manter = adesão.
- **Três estados de disponibilidade pessoal:**
  - `livre` (verde) — padrão; **não se grava no banco**, ausência de registro já é livre.
  - `talvez` (amarelo) — ocupado, mas dá pra conversar (encaixar ou remarcar).
  - `ocupado` (vermelho) — não rola.
- **Calendário da banda = pior estado do grupo** naquela data:
  - tem 1 vermelho → data vermelha.
  - nenhum vermelho mas tem amarelo → amarela.
  - todos verdes → verde.
- **O amarelo nunca vira verde automático.** O app sinaliza "dá pra tentar" e a
  conversa acontece no WhatsApp da banda — não engessada no app.
- **Reserva (evento) feita pelo moderador**, com tipo (ensaio/apresentação),
  local e hora. Dois modos:
  - `full` (trava o dia) → nas outras bandas a pessoa vira **vermelha**.
  - `partial` (reserva parcial) → nas outras bandas a pessoa vira **amarela**
    (pra quem faz mais de um compromisso no mesmo dia).
- **Privacidade:** a banda vê *quem* e *quando*. O *porquê* é da pessoa.
  Entre bandas, um integrante comprometido aparece só como "comprometido com
  outra banda" — **sem nome da banda nem local**. O detalhe completo só aparece
  dentro da banda dona do evento e na agenda pessoal do próprio dono.
- **Papéis por banda:** cada banda tem 1+ moderadores. Quem cria a banda é
  moderador. Um moderador pode promover outro (co-moderador). Nunca se remove o
  último moderador.
- **Convite = link gerado pelo moderador**, enviado pelo WhatsApp dele mesmo.
  O link prova posse do número (não precisa enviar mensagem pelo app).
- **Compartilhar confirmação:** texto pronto pro WhatsApp + opção de salvar na
  agenda (Google via link `TEMPLATE`, iPhone via arquivo `.ics`).

---

## 3. Modelo de dados (resumo — SQL completo em `pauta-schema.sql`)

| Tabela | Para quê |
|---|---|
| `profiles` | a pessoa; estende `auth.users`; guarda nome e telefone |
| `bands` | a banda |
| `memberships` | liga pessoa ↔ banda, com `role` (moderator/member) e `instrument` |
| `availability` | disponibilidade pessoal por dia (só exceções: talvez/ocupado) |
| `events` | reservas: uma banda trava uma data (kind, local, hora, hold) |
| `invites` | link de convite gerado pelo moderador |

**Mecanismo central (auto-bloqueio cross-band):** quando um `event` é criado,
um gatatilho cria linhas em `availability` (origem `event`) para cada integrante
da banda — `busy` se `hold=full`, `maybe` se `hold=partial`, com nota genérica
"comprometido com outra banda". Assim as **outras** bandas leem o bloqueio pela
tabela `availability` (que não revela qual banda) — a privacidade fica garantida
pelo próprio desenho, e a regra de leitura (RLS) continua simples.

A disponibilidade efetiva de uma pessoa num dia = **pior estado** entre as linhas
daquele dia (próprias + de eventos). Ausência de linha = livre.

---

## 4. Escopo por fase

### Fase 1 — a DEMO (A, B, C)
O mínimo que prova o conceito ponta a ponta:
1. Login por telefone + perfil.
2. Criar banda; convidar/entrar via link; sair.
3. Marcar disponibilidade pessoal (3 estados) — tela "Minha agenda", verde por padrão.
4. Calendário da banda agregado (pior estado, mostrando quem está em cada cor).
5. Reservar data (full/partial) + auto-bloqueio cross-band via gatilho.
6. Compartilhar confirmação (texto + .ics + link Google).
7. Co-moderador (é só um campo `role`, custa pouco — pode entrar já).

### Fase 2 — quando a demo provar que vale
- Substitutos / "tocar sem alguém" (ajustes do moderador por evento).
- Disponibilidade **recorrente** ("toda terça à noite estou livre"). *Maior
  alavanca de adesão.*
- Lembretes leves pra manter a agenda atualizada.
- Importação opcional de calendário (Google/Apple, modo livre/ocupado).
- Refino de privacidade e políticas de RLS.

> **Regra de ouro do build:** não construir Fase 2 antes da Fase 1 rodar com A,B,C.

---

## 5. Stack e restrições

- **Front:** Next.js (App Router) + Tailwind. **PWA mobile-first** (o uso é no celular).
- **Back:** Supabase (Postgres + Auth + RLS).
- **Deploy:** Vercel, conectado ao repositório GitHub (push → deploy automático).
- **Idioma:** interface e comentários de código em **português do Brasil**.
- **Estética:** escura, "casa de show"; estados verde/amarelo/vermelho como LEDs;
  roxo de palco como cor de interface. Ver o protótipo `pauta-prototipo.html`
  como referência visual e de fluxo.
- **Ambiente do dev:** só celular (iPhone/iPad), sem terminal. Tudo via Claude
  Code + GitHub web + Vercel.

---

## 6. Decisão de login para a DEMO

O Supabase oferece login por telefone nativo (código OTP por SMS ou WhatsApp; o
canal WhatsApp exige provedor Twilio). **Recomendação para a demo:** começar com
**OTP por SMS** — é nativo, robusto e custa centavos para 3 pessoas, sem precisar
construir nada de auth. O modelo de **link de convite sem custo de mensagem** (o
ideal pra escalar) fica para a Fase 2, pois exige um fluxo customizado (Edge
Function que valida o token e cria a sessão). A tabela `invites` já existe no
schema para suportar o convite de banda desde já, independente do canal de login.
