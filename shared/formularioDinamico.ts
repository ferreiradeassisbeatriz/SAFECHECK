export type CampoFormularioTipo =
  | "text"
  | "textarea"
  | "number"
  | "checkbox"
  | "select";

export type CampoFormularioOpcao = { value: string; label: string };

export type CampoFormulario = {
  id: string;
  type: CampoFormularioTipo;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: CampoFormularioOpcao[];
};

export type FormularioDinamicoSchema = {
  version: 1;
  fields: CampoFormulario[];
};

function isCampoTipo(v: unknown): v is CampoFormularioTipo {
  return (
    v === "text" ||
    v === "textarea" ||
    v === "number" ||
    v === "checkbox" ||
    v === "select"
  );
}

/**
 * Interpreta `tipos_tarefa.formularioSchema` (JSON) vindo do banco.
 * Aceita `{ version: 1, fields: [...] }` ou `{ fields: [...] }` (assume versão 1).
 */
export function parseFormularioSchema(
  raw: unknown,
): FormularioDinamicoSchema | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const fieldsRaw = o.fields;
  if (!Array.isArray(fieldsRaw) || fieldsRaw.length === 0) return null;

  const fields: CampoFormulario[] = [];
  for (const item of fieldsRaw) {
    if (item == null || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    const id = typeof f.id === "string" ? f.id.trim() : "";
    const type = f.type;
    const label = typeof f.label === "string" ? f.label.trim() : "";
    if (!id || !label || !isCampoTipo(type)) continue;
    if (type === "select") {
      const opts = f.options;
      if (!Array.isArray(opts) || opts.length === 0) continue;
    }

    const campo: CampoFormulario = { id, type, label };
    if (typeof f.placeholder === "string") campo.placeholder = f.placeholder;
    if (typeof f.required === "boolean") campo.required = f.required;

    if (Array.isArray(f.options)) {
      const options: CampoFormularioOpcao[] = [];
      for (const opt of f.options) {
        if (opt == null || typeof opt !== "object") continue;
        const op = opt as Record<string, unknown>;
        const value = typeof op.value === "string" ? op.value : "";
        const optLabel = typeof op.label === "string" ? op.label : value;
        if (value) options.push({ value, label: optLabel });
      }
      if (options.length > 0) campo.options = options;
    }
    fields.push(campo);
  }

  if (fields.length === 0) return null;
  return { version: 1, fields };
}

export function valoresIniciais(
  schema: FormularioDinamicoSchema | null,
): Record<string, string | number | boolean> {
  if (!schema) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const f of schema.fields) {
    if (f.type === "checkbox") out[f.id] = false;
    else if (f.type === "number") out[f.id] = "";
    else out[f.id] = "";
  }
  return out;
}

export function validarFormularioDinamico(
  schema: FormularioDinamicoSchema | null,
  values: Record<string, string | number | boolean>,
): string | null {
  if (!schema) return null;
  for (const f of schema.fields) {
    if (!f.required) continue;
    const v = values[f.id];
    if (f.type === "checkbox") {
      if (v !== true) return `Confirme: ${f.label}`;
    } else if (v === undefined || v === "") {
      return `Preencha: ${f.label}`;
    } else if (f.type === "number" && String(v).trim() === "") {
      return `Preencha: ${f.label}`;
    }
  }
  return null;
}
