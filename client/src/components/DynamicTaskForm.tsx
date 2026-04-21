import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CampoFormulario,
  FormularioDinamicoSchema,
} from "@shared/formularioDinamico";

type Valores = Record<string, string | number | boolean>;

type Props = {
  schema: FormularioDinamicoSchema | null;
  values: Valores;
  onChange: (values: Valores) => void;
  error?: string | null;
};

function setCampo(
  values: Valores,
  id: string,
  value: string | number | boolean,
): Valores {
  return { ...values, [id]: value };
}

function Campo({
  campo,
  values,
  onChange,
}: {
  campo: CampoFormulario;
  values: Valores;
  onChange: (values: Valores) => void;
}) {
  const v = values[campo.id];

  switch (campo.type) {
    case "checkbox":
      return (
        <div className="flex items-center space-x-3 rounded-lg border border-slate-200 bg-white p-3">
          <Checkbox
            id={campo.id}
            checked={Boolean(v)}
            onCheckedChange={(checked) =>
              onChange(setCampo(values, campo.id, checked === true))
            }
          />
          <Label htmlFor={campo.id} className="cursor-pointer text-slate-800">
            {campo.label}
            {campo.required ? <span className="text-red-600"> *</span> : null}
          </Label>
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-2">
          <Label htmlFor={campo.id} className="text-slate-800">
            {campo.label}
            {campo.required ? <span className="text-red-600"> *</span> : null}
          </Label>
          <Textarea
            id={campo.id}
            placeholder={campo.placeholder}
            value={typeof v === "string" ? v : ""}
            onChange={(e) =>
              onChange(setCampo(values, campo.id, e.target.value))
            }
            rows={4}
          />
        </div>
      );
    case "number":
      return (
        <div className="space-y-2">
          <Label htmlFor={campo.id} className="text-slate-800">
            {campo.label}
            {campo.required ? <span className="text-red-600"> *</span> : null}
          </Label>
          <Input
            id={campo.id}
            type="number"
            placeholder={campo.placeholder}
            value={v === "" || v === undefined ? "" : String(v)}
            onChange={(e) =>
              onChange(setCampo(values, campo.id, e.target.value))
            }
          />
        </div>
      );
    case "select":
      return (
        <div className="space-y-2">
          <Label className="text-slate-800">
            {campo.label}
            {campo.required ? <span className="text-red-600"> *</span> : null}
          </Label>
          <Select
            value={typeof v === "string" && v !== "" ? v : undefined}
            onValueChange={(value) => onChange(setCampo(values, campo.id, value))}
          >
            <SelectTrigger id={campo.id}>
              <SelectValue placeholder={campo.placeholder ?? "Selecione…"} />
            </SelectTrigger>
            <SelectContent>
              {(campo.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    default:
      return (
        <div className="space-y-2">
          <Label htmlFor={campo.id} className="text-slate-800">
            {campo.label}
            {campo.required ? <span className="text-red-600"> *</span> : null}
          </Label>
          <Input
            id={campo.id}
            type="text"
            placeholder={campo.placeholder}
            value={typeof v === "string" ? v : ""}
            onChange={(e) =>
              onChange(setCampo(values, campo.id, e.target.value))
            }
          />
        </div>
      );
  }
}

export function DynamicTaskForm({ schema, values, onChange, error }: Props) {
  if (!schema || schema.fields.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Esta tarefa não exige campos adicionais no formulário.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {schema.fields.map((campo) => (
        <Campo
          key={campo.id}
          campo={campo}
          values={values}
          onChange={onChange}
        />
      ))}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
