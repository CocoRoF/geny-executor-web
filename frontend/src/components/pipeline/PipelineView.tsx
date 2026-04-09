import { useEffect, useRef } from "react";
import { useExecutionStore } from "../../stores/executionStore";
import { useUIStore } from "../../stores/uiStore";
import { usePipelineStore } from "../../stores/pipelineStore";
import { useZoomPan } from "../../hooks/useZoomPan";
import { getLocalizedStageMeta } from "../../utils/stageMetadata";
import type { StageDescription } from "../../types/pipeline";

/* ═══════════════════════════════════════════════════════
   Layout constants
   ═══════════════════════════════════════════════════════ */
const GAP = 110;
const LM = 120; // left margin (space for phase labels)
const ROW_A = 55;
const ROW_B1 = 175;
const ROW_B2 = 305;
const ROW_C = 435;
const R = 27; // circle radius (matches CSS 54px / 2)
const CANVAS_W = 770;
const CANVAS_H = 510;

interface Pos {
  x: number;
  y: number;
}

function buildPositions(): Map<number, Pos> {
  const m = new Map<number, Pos>();
  const midX = LM + 2.5 * GAP;

  // Phase A — single stage, centered
  m.set(1, { x: midX, y: ROW_A });

  // Phase B row 1 — stages 2-7, left → right
  for (let i = 0; i < 6; i++) m.set(2 + i, { x: LM + i * GAP, y: ROW_B1 });

  // Phase B row 2 — stages 8-13, reversed (13 at left, 8 at right)
  for (let i = 0; i < 6; i++) m.set(13 - i, { x: LM + i * GAP, y: ROW_B2 });

  // Phase C — stages 14-16, centered
  const cStart = midX - GAP;
  for (let i = 0; i < 3; i++) m.set(14 + i, { x: cStart + i * GAP, y: ROW_C });

  return m;
}

const positions = buildPositions();

/* ═══════════════════════════════════════════════════════
   StageNode — HTML circle + label
   ═══════════════════════════════════════════════════════ */
function StageNode({ stage }: { stage: StageDescription }) {
  const locale = useUIStore((s) => s.locale);
  const meta = getLocalizedStageMeta(stage.order, locale);
  const activeStage = useExecutionStore((s) => s.activeStage);
  const completedStages = useExecutionStore((s) => s.completedStages);
  const errorStages = useExecutionStore((s) => s.errorStages);
  const selectedOrder = useUIStore((s) => s.selectedStageOrder);
  const selectStage = useUIStore((s) => s.selectStage);

  const isActive = activeStage === stage.name;
  const isCompleted = completedStages.has(stage.name);
  const isError = errorStages.has(stage.name);
  const isInactive = !stage.is_active;
  const isSelected = selectedOrder === stage.order;

  let cls = "stage-circle";
  if (isActive) cls += " active";
  else if (isError) cls += " error";
  else if (isCompleted) cls += " completed";
  if (isSelected) cls += " selected";

  return (
    <div
      className="flex flex-col items-center"
      style={{ width: R * 2 + 20 }}
      onClick={(e) => {
        e.stopPropagation();
        selectStage(isSelected ? null : stage.order);
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={cls}>{stage.order}</div>
      <span
        className="mt-1.5 text-[10px] font-medium tracking-wide text-center leading-tight"
        style={{
          color: isSelected
            ? "var(--accent)"
            : isActive
              ? "var(--accent)"
              : isCompleted
                ? "var(--green)"
                : "var(--text-secondary)",
          maxWidth: 88,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {meta?.displayName ?? stage.name}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SVG Connections
   ═══════════════════════════════════════════════════════ */
function Connections({ stages }: { stages: StageDescription[] }) {
  const completedStages = useExecutionStore((s) => s.completedStages);
  const stageMap = new Map(stages.map((s) => [s.order, s]));

  const bothDone = (a: number, b: number) => {
    const na = stageMap.get(a)?.name ?? "";
    const nb = stageMap.get(b)?.name ?? "";
    return completedStages.has(na) && completedStages.has(nb);
  };

  const color = (a: number, b: number) =>
    bothDone(a, b) ? "var(--green)" : "var(--border-hover)";
  const opacity = (a: number, b: number) => (bothDone(a, b) ? 0.7 : 0.35);

  /* Horizontal line between adjacent stages on same row */
  const hLine = (from: number, to: number) => {
    const a = positions.get(from)!;
    const b = positions.get(to)!;
    const x1 = a.x < b.x ? a.x + R : a.x - R;
    const x2 = a.x < b.x ? b.x - R : b.x + R;
    return (
      <line
        key={`h-${from}-${to}`}
        x1={x1}
        y1={a.y}
        x2={x2}
        y2={b.y}
        stroke={color(from, to)}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={opacity(from, to)}
      />
    );
  };

  /* Smooth bezier between two stages */
  const curve = (
    from: number,
    to: number,
    key: string,
    opts?: {
      bulgeX?: number;
      dashed?: boolean;
      color?: string;
      opacity?: number;
      className?: string;
    },
  ) => {
    const a = positions.get(from)!;
    const b = positions.get(to)!;
    const goDown = b.y > a.y;
    const y1 = goDown ? a.y + R : a.y - R;
    const y2 = goDown ? b.y - R : b.y + R;

    let d: string;
    if (opts?.bulgeX !== undefined) {
      // Side curve (U-turn or loop-back)
      d = `M ${a.x} ${y1} C ${opts.bulgeX} ${y1}, ${opts.bulgeX} ${y2}, ${b.x} ${y2}`;
    } else {
      // Standard vertical S-curve
      const my = (y1 + y2) / 2;
      d = `M ${a.x} ${y1} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${y2}`;
    }

    return (
      <path
        key={key}
        d={d}
        stroke={opts?.color ?? color(from, to)}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={opts?.dashed ? "5 4" : undefined}
        fill="none"
        opacity={opts?.opacity ?? opacity(from, to)}
        className={opts?.className}
      />
    );
  };

  return (
    <g>
      {/* Phase A → B */}
      {curve(1, 2, "a-b")}

      {/* Phase B row 1: 2→3→…→7 */}
      {[2, 3, 4, 5, 6].map((n) => hLine(n, n + 1))}

      {/* U-turn right: 7 → 8 */}
      {curve(7, 8, "uturn-r", { bulgeX: positions.get(7)!.x + 55 })}

      {/* Phase B row 2: 8→9→…→13 (visually right → left) */}
      {[8, 9, 10, 11, 12].map((n) => hLine(n, n + 1))}

      {/* Loop-back: 13 → 2 (left side, dashed) */}
      {curve(13, 2, "loop", {
        bulgeX: positions.get(13)!.x - 55,
        dashed: true,
        color: "var(--accent)",
        opacity: 0.3,
        className: "dash-flow",
      })}

      {/* Phase B → C: 13 → 14 */}
      {curve(13, 14, "b-c")}

      {/* Phase C: 14→15→16 */}
      {hLine(14, 15)}
      {hLine(15, 16)}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════
   SVG Decorations (labels, bounding box, grid)
   ═══════════════════════════════════════════════════════ */
function Decorations() {
  const locale = useUIStore((s) => s.locale);
  const midY_B = (ROW_B1 + ROW_B2) / 2;
  const isKo = locale === "ko";

  return (
    <g>
      {/* Dot grid */}
      <defs>
        <pattern
          id="dot-grid"
          width="30"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="1"
            cy="1"
            r="0.4"
            fill="var(--text-muted)"
            opacity="0.12"
          />
        </pattern>
      </defs>
      <rect width={CANVAS_W} height={CANVAS_H} fill="url(#dot-grid)" />

      {/* Phase labels */}
      {[
        { label: "A", sub: isKo ? "초기화" : "init", y: ROW_A },
        { label: "B", sub: isKo ? "에이전트 루프" : "agent loop", y: midY_B },
        { label: "C", sub: isKo ? "최종" : "final", y: ROW_C },
      ].map((p) => (
        <g key={p.label}>
          <text
            x={28}
            y={p.y - 5}
            fill="var(--accent)"
            fontSize={10}
            fontWeight={700}
            letterSpacing="0.18em"
            fontFamily="'Inter', sans-serif"
            opacity={0.7}
          >
            {p.label}
          </text>
          <text
            x={28}
            y={p.y + 9}
            fill="var(--text-muted)"
            fontSize={8}
            fontFamily="'Inter', sans-serif"
            opacity={0.5}
          >
            {p.sub}
          </text>
        </g>
      ))}

      {/* Phase B bounding box */}
      <rect
        x={LM - 50}
        y={ROW_B1 - 46}
        width={5 * GAP + 100 + 55}
        height={ROW_B2 - ROW_B1 + 92}
        rx={16}
        fill="none"
        stroke="var(--border)"
        strokeWidth={1}
        strokeDasharray="6 4"
        opacity={0.18}
      />

      {/* Loop label (left of loop-back path) */}
      <text
        x={LM - 55 - 5}
        y={midY_B + 4}
        fill="var(--accent)"
        fontSize={8}
        fontWeight={500}
        fontFamily="'Inter', sans-serif"
        opacity={0.35}
        textAnchor="middle"
      >
        {isKo ? "루프" : "loop"}
      </text>
    </g>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */
export default function PipelineView() {
  const stages = usePipelineStore((s) => s.stages);
  const locale = useUIStore((s) => s.locale);
  const isKo = locale === "ko";
  const {
    containerRef,
    transform,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetView,
    fitToView,
  } = useZoomPan(0.4, 3);

  const hasFit = useRef(false);

  // Auto-fit content on first mount
  useEffect(() => {
    if (stages.length > 0 && !hasFit.current) {
      const t = setTimeout(() => {
        fitToView(CANVAS_W, CANVAS_H, 30);
        hasFit.current = true;
      }, 60);
      return () => clearTimeout(t);
    }
  }, [stages.length, fitToView]);

  if (stages.length === 0) return null;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div
        className="px-6 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--accent)" }}
          >
            {isKo ? "파이프라인" : "Pipeline"}
          </span>
          <h2
            className="text-lg font-bold mt-0.5 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
          >
            {isKo ? "16단계 아키텍처" : "16-Stage Architecture"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-[9px] tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            {isKo ? "스크롤 · 확대/축소 \u2003 드래그 · 이동" : "scroll\u00a0\u00b7\u00a0zoom \u2003 drag\u00a0\u00b7\u00a0pan"}
          </span>
          <button
            onClick={resetView}
            className="text-[10px] px-3 py-1 rounded-md transition-colors hover:brightness-125"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {isKo ? "초기화" : "Reset"}
          </button>
        </div>
      </div>

      {/* Zoomable canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ background: "var(--bg-primary)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
            width: CANVAS_W,
            height: CANVAS_H,
            position: "relative",
          }}
        >
          {/* SVG layer — connections, grid, labels */}
          <svg
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <Decorations />
            <Connections stages={stages} />
          </svg>

          {/* HTML layer — stage circles */}
          {stages.map((stage) => {
            const pos = positions.get(stage.order);
            if (!pos) return null;
            const size = R + 10; // half-width of the wrapper
            return (
              <div
                key={stage.order}
                style={{
                  position: "absolute",
                  left: pos.x - size,
                  top: pos.y - size,
                  width: size * 2,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <StageNode stage={stage} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
