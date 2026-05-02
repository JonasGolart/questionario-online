import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "var(--bg-main)" }}>
      <section className="card" style={{ width: "100%", maxWidth: 480, textAlign: "center", padding: "3rem 2rem", position: "relative", zIndex: 10 }}>
        
        {/* Logo da UTFPR */}
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "center" }}>
          <img 
            src="/utfpr-logo.png" 
            alt="UTFPR Logo" 
            style={{ width: "180px", height: "auto", objectFit: "contain", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }} 
          />
        </div>

        <h1 style={{ marginTop: 0, fontSize: "1.75rem", color: "var(--text-primary)", fontWeight: 800, letterSpacing: "-0.025em" }}>Questionário Online</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", marginBottom: "2.5rem", fontSize: "1rem", lineHeight: 1.5 }}>
          Plataforma oficial de avaliações. Selecione seu perfil de acesso abaixo para continuar.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Link 
            href="/aluno" 
            className="btn-primary" 
            style={{ textDecoration: "none", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", fontSize: "1.05rem", backgroundColor: "#10b981", padding: "1rem", borderRadius: "8px", boxShadow: "0 4px 14px 0 rgba(16, 185, 129, 0.39)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Entrar como Aluno
          </Link>
          
          <div style={{ display: "flex", alignItems: "center", margin: "0.75rem 0" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }}></div>
            <span style={{ margin: "0 1rem", fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>ou</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }}></div>
          </div>

          <Link 
            href="/admin/login" 
            className="btn-primary" 
            style={{ textDecoration: "none", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", fontSize: "1.05rem", backgroundColor: "transparent", color: "var(--primary)", border: "2px solid var(--primary)", padding: "1rem", borderRadius: "8px" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Acesso do Professor
          </Link>
        </div>
      </section>
      
      <div style={{ position: "absolute", bottom: "1.5rem", textAlign: "center", width: "100%", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
        © {new Date().getFullYear()} Universidade Tecnológica Federal do Paraná
      </div>
    </main>
  );
}
