/**
 * Erros de rede/DNS ao resolver o host do Postgres (ex.: db.<ref>.supabase.co).
 */
function isPostgresDnsFailure(err: unknown): boolean {
  const parts: string[] = [];
  let e: unknown = err;
  const seen = new Set<unknown>();
  while (e != null && !seen.has(e)) {
    seen.add(e);
    if (typeof e === "object" && "code" in e) {
      const code = (e as { code: unknown }).code;
      if (code === "ENOTFOUND" || code === "EAI_AGAIN") return true;
    }
    if (e instanceof Error) {
      parts.push(e.message);
      e = e.cause;
      continue;
    }
    break;
  }
  const text = parts.join(" — ");
  return /getaddrinfo ENOTFOUND/i.test(text) || /getaddrinfo EAI_AGAIN/i.test(text);
}

/**
 * Extrai mensagem útil de erros Drizzle/node-postgres (cadeia `cause`).
 */
export function formatDatabaseUserMessage(err: unknown): string {
  const parts: string[] = [];
  let e: unknown = err;
  const seen = new Set<unknown>();
  while (e instanceof Error && !seen.has(e)) {
    seen.add(e);
    parts.push(e.message);
    e = e.cause;
  }
  const text = parts.join(" — ");
  if (/column .* does not exist/i.test(text) || /relation .* does not exist/i.test(text)) {
    return `O schema do Postgres está desatualizado (falta tabela ou coluna). Na raiz do projeto execute: npm run db:apply — ${text}`;
  }
  if (isPostgresDnsFailure(err)) {
    return (
      "Não foi possível resolver o host do Postgres (DNS). A URI direta db.<projeto>.supabase.co costuma falhar em redes corporativas ou sem IPv6. " +
      "No Supabase: Project Settings → Database → Connect → copie a connection string do Session pooler (host tipo aws-0-….pooler.supabase.com), " +
      "defina em DATABASE_URL no .env ou .env.local e reinicie o servidor. Detalhe técnico: " +
      text
    );
  }
  return text || "Erro ao acessar o banco de dados.";
}
