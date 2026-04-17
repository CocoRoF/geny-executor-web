/* EnvironmentShareModal — generate and copy share link */
import React, { useEffect, useState } from "react";
import { useEnvironmentStore } from "../../stores/environmentStore";

interface EnvironmentShareModalProps {
  envId: string;
  envName: string;
  onClose: () => void;
}

const EnvironmentShareModal: React.FC<EnvironmentShareModalProps> = ({
  envId,
  envName,
  onClose,
}) => {
  const generateShareLink = useEnvironmentStore((s) => s.generateShareLink);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const link = await generateShareLink(envId);
        if (!cancelled) setUrl(link);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [envId, generateShareLink]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: do nothing */
    }
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
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
        >
          Share Environment
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Share <strong>{envName}</strong> — sensitive values (API keys, tokens) are automatically removed.
        </p>

        {loading ? (
          <div className="py-4 text-center text-xs text-[var(--text-muted)] animate-pulse">
            Generating link...
          </div>
        ) : error ? (
          <div className="text-xs p-2 rounded bg-red-500/10 text-red-400">
            {error}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-xs text-[var(--text-primary)] font-mono"
              value={url}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              className="text-xs px-3 py-2 rounded font-medium shrink-0"
              style={{ background: "var(--accent)", color: "#000" }}
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            className="text-xs px-4 py-2 rounded"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentShareModal;
