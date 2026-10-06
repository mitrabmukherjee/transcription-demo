import { Suspense } from "react";
import MainWorkspace from "@/components/MainWorkspace";
import { ApiKeyIndicator } from "@/components/ApiKeyIndicator";
import { Mic } from "lucide-react";

export default function Home() {
  const assemblyaiConfigured = !!process.env.ASSEMBLYAI_API_KEY;
  const blobClientUpload = !!process.env.BLOB_READ_WRITE_TOKEN;
  const blobServerUpload = !!process.env.BLOB_STORE_ID;
  const blobConfigured = blobClientUpload || blobServerUpload;
  const blobUploadMode = blobClientUpload ? "client" : "server";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight">
                Speech-to-Text Feature Sandbox
              </h1>
              <p className="text-xs text-muted-foreground">
                AssemblyAI Universal-3.5 Pro
              </p>
            </div>
          </div>
          <ApiKeyIndicator
            assemblyaiConfigured={assemblyaiConfigured}
            blobConfigured={blobConfigured}
          />
        </div>
      </header>

      {/* Main workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Suspense>
          <MainWorkspace blobUploadMode={blobUploadMode} />
        </Suspense>
      </main>
    </div>
  );
}
