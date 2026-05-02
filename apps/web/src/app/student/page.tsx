"use client";

import { FormEvent, useState } from "react";
import { postJson } from "../../lib/api";

type StartResponse = {
  attemptId: string;
  questionnaire: {
    id: string;
    name: string;
    discipline: string;
    category: string;
    questions: Array<{
      id: string;
      statement: string;
      options: string[];
      position: number;
      weight: number;
    }>;
  };
};

export default function StudentPage() {
  const [token, setToken] = useState("");
  const [studentFullName, setStudentFullName] = useState("");
  const [status, setStatus] = useState("A avaliacao e unica para cada token.");

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Validando token...");

    try {
      const response = await postJson<StartResponse>("/api/v1/student/start", {
        token,
        studentFullName
      });

      setStatus(
        `Avaliacao iniciada: ${response.questionnaire.name}. Tentativa ${response.attemptId.slice(0, 8)} criada com sucesso.`
      );
      window.localStorage.setItem("qo_attempt_id", response.attemptId);
    } catch (error) {
      if (error instanceof Error) {
        setStatus(`Falha: ${error.message}`);
        return;
      }
      setStatus("Falha inesperada ao iniciar.");
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
      <section style={{ width: "100%", maxWidth: 560, border: "1px solid #d0d7de", borderRadius: 12, padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Entrada do Aluno</h1>
        <p>Informe o token e seu nome completo. Esta avaliacao pode ser feita apenas uma vez.</p>

        <form onSubmit={handleStart} style={{ display: "grid", gap: 12 }}>
          <label>
            Token de acesso
            <input
              value={token}
              onChange={(event) => setToken(event.target.value.toUpperCase())}
              required
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>

          <label>
            Nome completo
            <input
              value={studentFullName}
              onChange={(event) => setStudentFullName(event.target.value)}
              required
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>

          <button type="submit">Iniciar avaliacao</button>
        </form>

        <p>{status}</p>
      </section>
    </main>
  );
}
