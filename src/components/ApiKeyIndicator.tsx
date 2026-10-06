import { CheckCircle2, XCircle } from "lucide-react";

interface ApiKeyIndicatorProps {
  assemblyaiConfigured: boolean;
  blobConfigured: boolean;
}

export function ApiKeyIndicator({
  assemblyaiConfigured,
  blobConfigured,
}: ApiKeyIndicatorProps) {
  const keys = [
    { label: "AssemblyAI", ok: assemblyaiConfigured },
    { label: "Vercel Blob", ok: blobConfigured },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {keys.map((k) => (
        <div
          key={k.label}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${
            k.ok
              ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
          }`}
        >
          {k.ok ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          {k.label} API Key
        </div>
      ))}
    </div>
  );
}
