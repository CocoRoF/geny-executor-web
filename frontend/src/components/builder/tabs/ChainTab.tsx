/* ChainTab — edits per-chain item ordering for stages that declare a chain.
 *
 * Some stages (e.g. s04_guard, s14_postprocess) expose one or more chains
 * via StageIntrospection.strategy_chains. Each chain has:
 *   - current_impls: the currently-configured order
 *   - available_impls: every impl that can be in the chain (superset)
 *
 * The UI lets the user reorder the current items and toggle items in/out
 * of the chain.
 */
import React from "react";

import type { ChainIntrospection } from "../../../types/catalog";
import type { StageManifestEntry } from "../../../types/environment";

interface ChainTabProps {
  stage: StageManifestEntry;
  chains: Record<string, ChainIntrospection>;
  onChange: (next: Record<string, string[]>) => void;
}

const ChainTab: React.FC<ChainTabProps> = ({ stage, chains, onChange }) => {
  const chainNames = Object.keys(chains ?? {});
  if (chainNames.length === 0) {
    return (
      <div className="p-4">
        <p className="text-xs italic text-[var(--text-muted)]">
          This stage has no chains to order.
        </p>
      </div>
    );
  }

  // Library sends the chain's canonical order in `current_impls` and the
  // reorderable superset in `available_impls`. A manifest entry's
  // `chain_order[chainName]` overrides the canonical order once the user has
  // touched it. An explicit empty array is a valid user choice and must not
  // be collapsed back to the canonical list.
  const resolveItems = (chainName: string, info: ChainIntrospection): string[] => {
    const stored = stage.chain_order?.[chainName];
    if (stored !== undefined) return stored;
    return info.current_impls;
  };

  const emitChain = (chainName: string, nextItems: string[]) => {
    const next = { ...(stage.chain_order ?? {}), [chainName]: nextItems };
    onChange(next);
  };

  const moveItem = (
    chainName: string,
    items: string[],
    from: number,
    to: number
  ) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    emitChain(chainName, next);
  };

  const toggleItem = (
    chainName: string,
    items: string[],
    item: string
  ) => {
    if (items.includes(item)) {
      emitChain(
        chainName,
        items.filter((x) => x !== item)
      );
    } else {
      emitChain(chainName, [...items, item]);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {chainNames.map((chainName) => {
        const info = chains[chainName];
        const items = resolveItems(chainName, info);
        const inactive = info.available_impls.filter(
          (x) => !items.includes(x)
        );
        return (
          <section
            key={chainName}
            className="border border-[var(--border)] rounded p-3 bg-[var(--bg-tertiary)]/40"
          >
            <header className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-[var(--text-primary)]">
                {chainName}
              </h5>
              <span className="text-[10px] text-[var(--text-muted)]">
                {items.length}/{info.available_impls.length} active
              </span>
            </header>

            {items.length === 0 ? (
              <p className="text-[11px] italic text-[var(--text-muted)] mb-2">
                Empty chain.
              </p>
            ) : (
              <ol className="space-y-1 mb-2">
                {items.map((item, i) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--bg-secondary)] text-xs"
                  >
                    <span className="text-[10px] font-mono text-[var(--text-muted)] w-6">
                      {i + 1}.
                    </span>
                    <span className="flex-1 text-[var(--text-primary)]">
                      {item}
                    </span>
                    <button
                      type="button"
                      className="text-xs px-1 text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-30"
                      disabled={i === 0}
                      onClick={() => moveItem(chainName, items, i, i - 1)}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-xs px-1 text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-30"
                      disabled={i === items.length - 1}
                      onClick={() => moveItem(chainName, items, i, i + 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-xs px-1 text-red-400"
                      onClick={() => toggleItem(chainName, items, item)}
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
            )}

            {inactive.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Inactive ({inactive.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {inactive.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(chainName, items, item)}
                      className="text-[11px] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default ChainTab;
