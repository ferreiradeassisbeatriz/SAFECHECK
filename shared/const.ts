/** Contexto da tarefa + respostas do formulário dinâmico (sessionStorage). */
export const SESSION_TASK_CONTEXT_KEY = "safecheck_tarefa_context";

export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
/** Max-Age do cookie HTTP (segundos). `cookie.serialize` não usa milissegundos como o Express. */
export const ONE_YEAR_COOKIE_MAX_AGE_SECONDS = Math.floor(ONE_YEAR_MS / 1000);
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
