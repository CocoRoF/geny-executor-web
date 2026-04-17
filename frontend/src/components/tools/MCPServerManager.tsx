/* MCPServerManager — connect/disconnect/test MCP servers */
import React, { useEffect, useState } from "react";
import { useToolStore } from "../../stores/toolStore";

interface MCPServerManagerProps {
  sessionId: string;
  onBack: () => void;
}

const MCPServerManager: React.FC<MCPServerManagerProps> = ({
  sessionId,
  onBack,
}) => {
  const { mcpServers, loadMCPServers, connectMCP, disconnectMCP } =
    useToolStore();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<"stdio" | "http" | "sse">(
    "stdio"
  );
  const [command, setCommand] = useState("");
  const [url, setUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMCPServers(sessionId);
  }, [sessionId, loadMCPServers]);

  const handleConnect = async () => {
    setError("");
    setConnecting(true);
    try {
      const config: Record<string, unknown> = { name, transport };
      if (transport === "stdio") {
        config.command = command;
      } else {
        config.url = url;
      }
      await connectMCP(sessionId, config);
      setShowAdd(false);
      setName("");
      setCommand("");
      setUrl("");
    } catch (e) {
      setError(String(e));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          MCP Servers
        </h3>
        <div className="flex gap-2">
          <button
            className="text-xs px-2.5 py-1 rounded bg-[var(--accent)] text-black font-medium hover:opacity-90"
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? "Cancel" : "+ Add Server"}
          </button>
          <button
            className="text-xs px-2.5 py-1 rounded border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="border border-[var(--border-primary)] rounded-lg p-3 space-y-3">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Server Name
            </label>
            <input
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-mcp-server"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Transport
            </label>
            <select
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
              value={transport}
              onChange={(e) =>
                setTransport(e.target.value as "stdio" | "http" | "sse")
              }
            >
              <option value="stdio">stdio</option>
              <option value="http">HTTP</option>
              <option value="sse">SSE</option>
            </select>
          </div>
          {transport === "stdio" ? (
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                Command
              </label>
              <input
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] font-mono"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npx -y @modelcontextprotocol/server-example"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                URL
              </label>
              <input
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] font-mono"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:3000/mcp"
              />
            </div>
          )}
          {error && (
            <div className="text-xs p-2 rounded bg-red-500/10 text-red-400">
              {error}
            </div>
          )}
          <button
            className="w-full text-sm py-1.5 rounded bg-[var(--accent)] text-black font-medium hover:opacity-90 disabled:opacity-50"
            onClick={handleConnect}
            disabled={connecting || !name.trim()}
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      )}

      {/* Server list */}
      {mcpServers.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] italic">
          No MCP servers connected
        </p>
      ) : (
        <div className="space-y-2">
          {mcpServers.map((s) => (
            <div
              key={s.name}
              className="border border-[var(--border-primary)] rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      s.connected ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {s.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {s.transport}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {s.tool_count} tools
                  </span>
                  <button
                    className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    onClick={() => disconnectMCP(sessionId, s.name)}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MCPServerManager;
