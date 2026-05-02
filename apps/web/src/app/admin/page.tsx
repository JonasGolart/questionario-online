"use client";

import { FormEvent, useState } from "react";
import { postJson } from "../../lib/api";

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Autenticando...");

    try {
      const response = await postJson<LoginResponse>("/api/v1/admin/login", { email, password });
      window.localStorage.setItem("qo_admin_token", response.accessToken);
      setStatus(`Login realizado para ${response.user.fullName}. Redirecionando...`);
      
      // Redireciona após 1 segundo para o usuário ver a confirmação
      setTimeout(() => {
        window.location.href = "/admin/dashboard";
      }, 1000);
    } catch (error) {
      if (error instanceof Error) {
        setStatus(`Falha: ${error.message === 'INVALID_CREDENTIALS' ? 'Email ou senha incorretos' : error.message}`);
        return;
      }
      setStatus("Falha inesperada no login.");
    }
  }

  return (
    <main style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #2563eb 100%)",
      padding: "24px",
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "24px",
        padding: "40px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        color: "white"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ 
            width: "64px", 
            height: "64px", 
            background: "var(--primary)", 
            borderRadius: "16px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            margin: "0 auto 16px auto",
            boxShadow: "0 0 20px rgba(37, 99, 235, 0.4)"
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 800, margin: 0, letterSpacing: "-0.025em" }}>Portal do Professor</h1>
          <p style={{ color: "#94a3b8", marginTop: "8px", fontSize: "0.95rem" }}>Bem-vindo ao StackFAB. Entre na sua conta.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>
          <div style={{ display: "grid", gap: "8px" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#cbd5e1" }}>E-mail Institucional</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              required
              style={{ 
                width: "100%", 
                padding: "12px 16px", 
                background: "rgba(0, 0, 0, 0.2)", 
                border: "1px solid rgba(255, 255, 255, 0.1)", 
                borderRadius: "12px",
                color: "white",
                fontSize: "1rem",
                outline: "none",
                transition: "all 0.2s"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#cbd5e1" }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              style={{ 
                width: "100%", 
                padding: "12px 16px", 
                background: "rgba(0, 0, 0, 0.2)", 
                border: "1px solid rgba(255, 255, 255, 0.1)", 
                borderRadius: "12px",
                color: "white",
                fontSize: "1rem",
                outline: "none",
                transition: "all 0.2s"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <button 
            type="submit" 
            style={{ 
              marginTop: "12px",
              padding: "14px", 
              background: "var(--primary)", 
              color: "white", 
              border: "none", 
              borderRadius: "12px", 
              fontSize: "1rem", 
              fontWeight: 700, 
              cursor: "pointer",
              transition: "transform 0.2s, background 0.2s",
              boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#1d4ed8"}
            onMouseOut={(e) => e.currentTarget.style.background = "var(--primary)"}
          >
            Acessar Painel
          </button>
        </form>

        {status && (
          <p style={{ 
            marginTop: "24px", 
            textAlign: "center", 
            fontSize: "0.875rem", 
            color: status.includes("Falha") ? "#f87171" : "#4ade80",
            background: status.includes("Falha") ? "rgba(248, 113, 113, 0.1)" : "rgba(74, 222, 128, 0.1)",
            padding: "10px",
            borderRadius: "8px"
          }}>
            {status}
          </p>
        )}
      </div>
    </main>
  );
}
