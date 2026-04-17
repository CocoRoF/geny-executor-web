/* EnvironmentImport — file upload import for .geny-env.json */
import React, { useCallback, useState } from "react";

interface EnvironmentImportProps {
  onImport: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const EnvironmentImport: React.FC<EnvironmentImportProps> = ({
  onImport,
  onClose,
}) => {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setError("");
      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await onImport(data);
        onClose();
      } catch (e) {
        setError(String(e));
      } finally {
        setImporting(false);
      }
    },
    [onImport, onClose]
  );

  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.geny-env.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) processFile(file);
    };
    input.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-5 space-y-4"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-base font-bold"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "var(--text-primary)",
          }}
        >
          Import Environment
        </h3>

        {/* Drop zone */}
        <div
          className="rounded-lg p-8 text-center cursor-pointer transition-colors"
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
            background: dragging ? "var(--bg-tertiary)" : "var(--bg-primary)",
          }}
          onClick={handleFileSelect}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {importing ? (
            <p className="text-xs text-[var(--text-muted)] animate-pulse">
              Importing...
            </p>
          ) : (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                Drop <span className="font-mono text-[var(--accent)]">.geny-env.json</span> here
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                or click to browse
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="text-xs p-2 rounded bg-red-500/10 text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            className="text-xs px-4 py-2 rounded"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentImport;
