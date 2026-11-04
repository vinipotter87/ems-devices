// Marca "GRUPO EMS" em texto: GRUPO em traço fino e espaçado, EMS em negrito (identidade do kit EMS).
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`logo-ems ${className}`} aria-label="Grupo EMS">
      <span className="g">GRUPO</span>
      <b>EMS</b>
    </span>
  );
}
