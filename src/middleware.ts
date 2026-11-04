import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Rotas publicas: nao exigem sessao.
const PUBLICAS = ["/login"];
const RAIZ = "/";

// O middleware faz apenas uma triagem: sem cookie de sessao, manda para o login.
// A validacao definitiva do token acontece nas paginas (usuarioAtual em src/lib/auth.ts),
// que rodam no runtime Node e sempre enxergam AUTH_SECRET. Quando a variavel tambem
// estiver disponivel aqui (ambiente edge), o token e verificado antecipadamente.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === RAIZ || PUBLICAS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("ems_sessao")?.value;
  if (!token) return paraLogin(req, pathname);

  const s = process.env.AUTH_SECRET;
  if (s) {
    try {
      await jwtVerify(token, new TextEncoder().encode(s));
    } catch {
      // token invalido ou expirado: limpa o cookie e volta ao login
      const res = paraLogin(req, pathname);
      res.cookies.delete("ems_sessao");
      return res;
    }
  }
  return NextResponse.next();
}

function paraLogin(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json).*)"],
};
