// =============================================================
// SESSÃO + PROTEÇÃO DE ROTAS (roda no middleware, a cada requisição)
//
// Duas funções importantes aqui:
// 1) Renovar a sessão: o @supabase/ssr precisa reescrever os cookies de
//    autenticação a cada navegação para manter a pessoa logada.
// 2) Proteger rotas: quem não está logado é mandado para /login.
// =============================================================

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Resposta padrão: deixa a requisição seguir.
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Guarda de segurança: se as variáveis de ambiente ainda não foram
  // configuradas (ex.: deploy sem env), não quebramos o site inteiro —
  // apenas deixamos passar. (No app local elas existem no .env.local.)
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Atualiza os cookies tanto na requisição quanto na resposta,
        // para o navegador receber a sessão renovada.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: getUser() valida a sessão no servidor do Supabase.
  // Não use getSession() aqui (ele confia no cookie sem validar).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const ehRotaPublica =
    pathname.startsWith("/login") || pathname.startsWith("/auth");

  // Não logado tentando acessar rota protegida -> manda pro login.
  if (!user && !ehRotaPublica) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Já logado tentando ver o login -> manda pra home.
  if (user && pathname.startsWith("/login")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}
