"use client";

import { ProviderType } from "@/lib/types";

interface ProviderSelectorProps {
  value: ProviderType;
  onChange: (value: ProviderType) => void;
}

const providers: { id: ProviderType; label: string; sub: string }[] = [
  {
    id: "deepgram",
    label: "Deepgram",
    sub: "Nova-3",
  },
  {
    id: "assemblyai",
    label: "AssemblyAI",
    sub: "Universal-1",
  },
];

export function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  return (
    <div className="flex rounded-lg border overflow-hidden">
      {providers.map((p) => {
        const selected = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`flex-1 py-2.5 px-4 text-sm transition-colors flex flex-col items-center gap-0.5 ${
              selected
                ? "bg-blue-600 text-white font-semibold"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>{p.label}</span>
            <span
              className={`text-xs font-normal ${
                selected ? "text-blue-100" : "text-muted-foreground"
              }`}
            >
              {p.sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}
