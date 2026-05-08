import { Resend } from "resend";
import { prisma } from "../config/db.js";
import { UserRole } from "@prisma/client";

const resend = new Resend(process.env.RESEND_API_KEY || "");

type SendTokensInput = {
  questionnaireId: string;
  userId: string;
  role: UserRole;
  emails: string[];   // Lista de e-mails dos alunos
};

/**
 * Distribui tokens por e-mail.
 * Para cada e-mail na lista, pega um token livre do questionário e envia.
 * Retorna um relatório de sucesso/falha para cada e-mail.
 */
export async function sendTokensByEmail(input: SendTokensInput) {
  // 1. Verificar se o Resend está configurado
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_NOT_CONFIGURED");
  }

  // 2. Buscar o questionário com tokens livres
  const questionnaire = await prisma.questionnaire.findFirst({
    where: {
      id: input.questionnaireId,
      ...(input.role !== UserRole.ADMIN ? { teacherId: input.userId } : {}),
    },
    include: {
      tokens: {
        where: {
          status: "ACTIVE",
          boundStudentName: null,
          sentToEmail: null,
        },
        orderBy: { createdAt: "asc" },
      },
      teacher: {
        select: { fullName: true, email: true },
      },
    },
  });

  if (!questionnaire) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  // 3. Validar e-mails e tokens
  const uniqueEmails = [...new Set(input.emails.map(e => e.trim().toLowerCase()).filter(e => e.length > 0))];
  
  if (uniqueEmails.length === 0) {
    throw new Error("NO_VALID_EMAILS");
  }

  const availableTokens = questionnaire.tokens;
  if (availableTokens.length < uniqueEmails.length) {
    throw new Error("NOT_ENOUGH_TOKENS");
  }

  // 4. Enviar cada e-mail com seu token único
  const results: Array<{ email: string; token: string; status: "sent" | "failed"; error?: string }> = [];
  const fromAddress = process.env.RESEND_FROM_EMAIL || "StackFAB <noreply@stackfab.com.br>";

  const scheduledInfo = questionnaire.scheduledDate
    ? new Date(questionnaire.scheduledDate).toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Data a ser confirmada pelo professor";

  const durationInfo = questionnaire.durationMinutes
    ? `${questionnaire.durationMinutes} minutos`
    : "Sem limite de tempo";

  for (let i = 0; i < uniqueEmails.length; i++) {
    const email = uniqueEmails[i];
    const tokenRecord = availableTokens[i];

    try {
      // Reservar o token ANTES de enviar o e-mail (previne race condition)
      await prisma.accessToken.update({
        where: { id: tokenRecord.id },
        data: { sentToEmail: email }
      });

      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: `🎓 Token de Acesso: ${questionnaire.name} — ${questionnaire.discipline}`,
        html: buildEmailHtml({
          questionnaireName: questionnaire.name,
          discipline: questionnaire.discipline,
          category: questionnaire.category,
          tokenCode: tokenRecord.code,
          teacherName: questionnaire.teacher.fullName,
          scheduledDate: scheduledInfo,
          duration: durationInfo,
          description: questionnaire.description || "",
        }),
      });

      results.push({ email, token: tokenRecord.code, status: "sent" });
    } catch (err) {
      // Reverter a reserva se o envio falhar
      await prisma.accessToken.update({
        where: { id: tokenRecord.id },
        data: { sentToEmail: null }
      }).catch(() => {}); // Ignora erro do rollback

      const message = err instanceof Error ? err.message : "Falha desconhecida";
      results.push({ email, token: tokenRecord.code, status: "failed", error: message });
    }
  }

  const sentCount = results.filter(r => r.status === "sent").length;
  const failedCount = results.filter(r => r.status === "failed").length;

  return {
    totalEmails: uniqueEmails.length,
    sent: sentCount,
    failed: failedCount,
    details: results,
  };
}

/**
 * Gera o HTML do e-mail com design premium e responsivo.
 */
function buildEmailHtml(data: {
  questionnaireName: string;
  discipline: string;
  category: string;
  tokenCode: string;
  teacherName: string;
  scheduledDate: string;
  duration: string;
  description: string;
}) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 2rem; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 1.5rem; font-weight: 700;">🎓 StackFAB</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 0.5rem 0 0 0; font-size: 0.875rem;">Sistema de Avaliações Online</p>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding: 2rem 2rem 1rem 2rem;">
        <h2 style="color: #1e293b; margin: 0 0 0.5rem 0; font-size: 1.25rem;">Olá, Estudante!</h2>
        <p style="color: #64748b; margin: 0; line-height: 1.6;">
          Você recebeu um <strong>token de acesso</strong> para a avaliação abaixo. 
          Guarde este código com cuidado — ele é pessoal e intransferível.
        </p>
      </td>
    </tr>

    <!-- Token Box -->
    <tr>
      <td style="padding: 0 2rem;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px dashed #3b82f6; border-radius: 12px; margin: 1rem 0;">
          <tr>
            <td style="padding: 1.5rem; text-align: center;">
              <p style="color: #1e40af; margin: 0 0 0.5rem 0; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Seu Token de Acesso</p>
              <p style="color: #1e3a8a; margin: 0; font-size: 2rem; font-weight: 800; letter-spacing: 0.15em; font-family: 'Courier New', monospace;">${data.tokenCode}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Assessment Info -->
    <tr>
      <td style="padding: 1rem 2rem;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 1rem 1.5rem; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <p style="color: #64748b; margin: 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Avaliação</p>
              <p style="color: #1e293b; margin: 0.25rem 0 0 0; font-size: 1rem; font-weight: 700;">${data.questionnaireName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%">
                    <p style="color: #64748b; margin: 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Disciplina</p>
                    <p style="color: #1e293b; margin: 0.25rem 0 0 0; font-weight: 600;">${data.discipline}</p>
                  </td>
                  <td width="50%">
                    <p style="color: #64748b; margin: 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Categoria</p>
                    <p style="color: #1e293b; margin: 0.25rem 0 0 0; font-weight: 600;">${data.category}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%">
                    <p style="color: #64748b; margin: 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">📅 Data</p>
                    <p style="color: #1e293b; margin: 0.25rem 0 0 0; font-weight: 600;">${data.scheduledDate}</p>
                  </td>
                  <td width="50%">
                    <p style="color: #64748b; margin: 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">⏱️ Duração</p>
                    <p style="color: #1e293b; margin: 0.25rem 0 0 0; font-weight: 600;">${data.duration}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 1rem 1.5rem;">
              <p style="color: #64748b; margin: 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Professor(a)</p>
              <p style="color: #1e293b; margin: 0.25rem 0 0 0; font-weight: 600;">${data.teacherName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${data.description ? `
    <!-- Description -->
    <tr>
      <td style="padding: 0 2rem 1rem 2rem;">
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 1rem;">
          <p style="color: #92400e; margin: 0; font-size: 0.875rem; font-weight: 600;">📝 Instruções do Professor:</p>
          <p style="color: #78350f; margin: 0.5rem 0 0 0; font-size: 0.875rem; line-height: 1.5;">${data.description}</p>
        </div>
      </td>
    </tr>
    ` : ""}

    <!-- Instructions -->
    <tr>
      <td style="padding: 1rem 2rem;">
        <h3 style="color: #1e293b; margin: 0 0 1rem 0; font-size: 1rem;">Como acessar sua avaliação:</h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 0.5rem 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 28px; height: 28px; background-color: #3b82f6; border-radius: 50%; text-align: center; color: white; font-weight: 700; font-size: 0.875rem; vertical-align: middle;">1</td>
                  <td style="padding-left: 0.75rem; color: #475569; font-size: 0.9rem;">Acesse pelo link <a href="https://quest.stackfab.com.br" style="color: #3b82f6; font-weight: 600; text-decoration: none;">quest.stackfab.com.br</a></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0.5rem 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 28px; height: 28px; background-color: #3b82f6; border-radius: 50%; text-align: center; color: white; font-weight: 700; font-size: 0.875rem; vertical-align: middle;">2</td>
                  <td style="padding-left: 0.75rem; color: #475569; font-size: 0.9rem;">Insira o token <strong>${data.tokenCode}</strong> e seu nome completo</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0.5rem 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 28px; height: 28px; background-color: #3b82f6; border-radius: 50%; text-align: center; color: white; font-weight: 700; font-size: 0.875rem; vertical-align: middle;">3</td>
                  <td style="padding-left: 0.75rem; color: #475569; font-size: 0.9rem;">Confirme seus dados e clique em <strong>"Iniciar Avaliação"</strong></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Warning -->
    <tr>
      <td style="padding: 0 2rem 1rem 2rem;">
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem;">
          <p style="color: #991b1b; margin: 0; font-size: 0.85rem; line-height: 1.5;">
            ⚠️ <strong>Atenção:</strong> Este token é de uso único. Ao iniciar a avaliação, 
            o cronômetro começará e não poderá ser pausado. 
            Não compartilhe seu token com ninguém.
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #1e293b; padding: 1.5rem 2rem; text-align: center;">
        <p style="color: #94a3b8; margin: 0; font-size: 0.75rem;">
          Este e-mail foi enviado automaticamente pelo <strong style="color: #3b82f6;">StackFAB</strong>.<br>
          Não responda a este e-mail. Em caso de dúvidas, procure seu professor.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
