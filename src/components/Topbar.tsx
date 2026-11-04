import Link from "next/link";
import type { Usuario } from "@/lib/auth";
import { PAPEL_LABEL } from "@/lib/auth";
import { logout } from "@/app/actions";
import Logo from "@/components/Logo";

export default function Topbar({ usuario }: { usuario: Usuario }) {
  return (
    <header className="topbar">
      <Link href="/inventario" className="marca">
        <Logo />
        <span className="produto">Devices</span>
      </Link>
      <nav>
        <Link href="/inventario">Inventário</Link>
        <Link href="/inventario/novo">Novo registro</Link>
        {usuario.papel === "GR" && <Link href="/usuarios">Usuários</Link>}
        <span className="quem">{usuario.email}</span>
        <form action={logout}>
          <button type="submit">Sair</button>
        </form>
      </nav>
    </header>
  );
}
