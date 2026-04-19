# Geny Memory Architecture — 심층 분석 및 재설계 문서

> **세 프로젝트의 관계 (중요)**
>
> - **`geny-executor`** — 메모리를 포함한 실행 능력 전부를 표준화된 인터페이스로 제공하는 **자립 가능한 코어 라이브러리**. 이 문서가 다루는 1차 대상.
> - **`geny-executor-web`** — executor의 능력을 **시각적으로 조작·확인**하기 위한 콘솔. executor가 제공하지 못하는 것은 web도 보여줄 수 없다. 즉 web은 executor 능력의 **거울**이다.
> - **`Geny` (legacy)** — 현재 가동 중인 구현체이자, 우리가 만들 **궁극의 제품**. executor+web이 완성된 후 그 위에서 재작성된다. 이 문서에서는 Geny를 "호환 대상"이 아니라 **"executor가 충족해야 하는 요구사항 명세(requirements spec)"** 로 취급한다.
>
> **핵심 명제** — *executor가 Geny의 모든 메모리 의미론을 Geny 코드 없이 단독으로 표현·실행할 수 있어야 한다.* 어댑터를 통한 우회는 검증 수단이지 운영 경로가 아니다.
>
> **작성 기준일** — 2026-04-19.

---

## 0. Executive Summary

`geny-executor`는 16-stage 파이프라인 위에 Stage 2(Context) / Stage 15(Memory) 두 개의 메모리 슬롯을 갖고 있고, Geny의 `SessionMemoryManager`를 duck-typed로 호출하는 어댑터(`memory/` 모듈의 `GenyMemoryRetriever`, `GenyMemoryStrategy`, `GenyPersistence`)도 가지고 있다. 그러나 이 어댑터 중심 구조는 **executor를 Geny 없이 단독으로 완전하게 만드는 방향과 반대**이고, 실제로 현재의 executor는 Geny 없이 돌리면 메모리가 사실상 no-op이다.

문제를 세 축으로 요약한다.

1. **자립성 부족** — executor의 `MemoryUpdateStrategy`/`ConversationPersistence`/`MemoryRetriever`는 Geny 없이 실행되는 경우 AppendOnly + InMemory/File 수준의 얕은 동작만 하고, 노트·벡터·큐레이션·글로벌·리플렉션·승격 등 Geny가 실제로 수행하는 11종 작업은 표현할 수 없다. Geny의 의미론이 executor의 **인터페이스**가 아니라 어댑터의 **사적 구현**에 묻혀 있다.
2. **인터페이스 협소** — 현재 ABC 세 개로는 "Layer × Capability × Backend × Scope"의 4축 의미 공간을 표현할 수 없다. `memory_manager: Any` 같은 비공식 duck-typing 계약에 의존해 확장성이 코드 밖에 존재한다.
3. **거울(web) 공백** — executor가 능력을 제공하지 못하니 web이 보여줄 것이 없다. 반대로 executor가 native로 완비되면, web은 thin proxy로 거의 자동으로 채워진다.

본 문서의 과업은 (1) Geny 요구사항을 executor의 **인터페이스 명세**로 정규화하고, (2) 그 위에서 Geny 없이 돌아가는 native provider 구현체를 완비하고, (3) executor-web이 그 능력 100%를 시각 표면으로 노출하도록 만드는 것이다. Geny의 재작성은 (1)~(3)이 끝난 **이후**의 별도 단계다.

---

## 1. 현황 (Current State)

### 1.1 `geny-executor` — 메모리 관련 코드 지도

| 영역 | 파일 | 역할 |
|---|---|---|
| Stage 2 인터페이스 | `src/geny_executor/stages/s02_context/interface.py` | `ContextStrategy`, `HistoryCompactor`, `MemoryRetriever` ABC |
| Stage 2 타입 | `src/geny_executor/stages/s02_context/types.py:9` | `MemoryChunk` (key, content, source, relevance_score, metadata) |
| Stage 2 기본 retriever | `src/geny_executor/stages/s02_context/artifact/default/retrievers.py` | `NullRetriever`, `StaticRetriever` |
| Stage 15 인터페이스 | `src/geny_executor/stages/s15_memory/interface.py` | `MemoryUpdateStrategy.update(state)`, `ConversationPersistence.{save,load,clear}` |
| Stage 15 기본 구현 | `src/geny_executor/stages/s15_memory/artifact/default/{strategies,persistence}.py` | `AppendOnly`/`NoMemory`/`Reflective`, `Null`/`InMemory`/`File` |
| Stage 15 stage 본체 | `src/geny_executor/stages/s15_memory/artifact/default/stage.py:30` | dual-slot stage (strategy + persistence) |
| Geny 어댑터 (임시) | `src/geny_executor/memory/{retriever,strategy,persistence}.py` | `memory_manager: Any` duck-typing. executor 단독으로는 인스턴스화 불가 |
| Geny 프리셋 (임시) | `src/geny_executor/memory/presets.py:56` | worker_easy/full/adaptive/vtuber — `memory_manager` 외부 주입 필요 |
| Session 영속 | `src/geny_executor/session/persistence.py:22` | `FileSessionPersistence` (정의는 있으나 호출 경로 없음) |
| Session 매니저 | `src/geny_executor/session/manager.py:25` | in-memory 전용 |
| 빌더 | `src/geny_executor/core/builder.py:91,217` | `with_context(...)`, `with_memory(...)` |

핵심 흐름 (`MemoryStage.execute`, `stages/s15_memory/artifact/default/stage.py:138`):

```python
async def execute(self, input, state):
    await self._strategy.update(state)
    if persistence_active and state.session_id:
        await persistence.save(state.session_id, state.messages)
```

stage의 의무는 "(1) strategy.update(state), (2) messages 직렬화"뿐. **노트 쓰기, 인사이트 추출, 벡터 인덱싱, 승격, 큐레이션 등 Geny 요구사항의 거의 전부가 stage의 인터페이스로 올라와 있지 않다.**

### 1.2 요구사항 명세 — Geny가 executor에게 요구하는 능력 카탈로그

이 절은 legacy `Geny/backend/service/memory/` 를 **호환할 대상이 아니라 executor가 반드시 표현해야 할 의미 공간**으로 재해석해 정리한다. 각 항목은 향후 executor API 완성도의 checklist가 된다.

#### R-A. 저장 레이어 (Storage Layers)
| 레이어 | 저장 형식 | Geny 위치 | executor 요구 |
|---|---|---|---|
| STM (Short-Term Memory) | JSONL message/event stream | `transcripts/session.jsonl`, optional DB mirror | append-only stream, role-aware, event typed, truncation policy |
| LTM (Long-Term Memory) | Markdown (evergreen/dated/topic) | `memory/MEMORY.md`, `memory/YYYY-MM-DD.md`, `memory/topics/{slug}.md` | heading append, dated rotate, topic slug, keyword scoring |
| Structured Notes | MD + YAML frontmatter + wikilinks | `memory/{category}/*.md` | 6 categories, importance enum, tags, backlinks 자동 집계 |
| Vector Index | FAISS IndexFlatIP + metadata.json | `vectordb/` | 임베딩 provider 추상화, chunk_size/overlap, top_k, threshold, reindex |
| Index/Graph Cache | JSON | `memory/_index.json` | incremental update, tag map, link graph, 재구축 가능 |
| Curated Knowledge | 사용자별 MD + FAISS (선택) | `_curated_knowledge/{username}/` | user scope, source_tag 자동, session→user 승격 |
| Global Memory | 세션 교차 MD | `_global_memory/` | global scope, session→global 승격 |
| DB canonical | `session_memory_entries` (19 col · 10 idx) | Postgres/SQLite | 파일 truncation 후에도 canonical 보관, query indexing |

#### R-B. 검색·인젝션 (Retrieval)
`build_memory_context_async`가 수행하는 6레이어 합성을 executor가 단일 호출로 재현할 수 있어야 한다.
1. session summary (`<session-summary>`)
2. MEMORY.md (`<long-term-memory>`)
3. FAISS vector (`<vector-memory score=…>`) — provider·모델·threshold 설정 가능
4. keyword recall + importance boost (2.0/1.5/1.0/0.5) + tag-overlap +0.3/match
5. 최근 transcript N개 (`<recent-message>`)
6. 선택 레이어로 curated knowledge 인젝션
- 예산(`max_inject_chars`, 기본 8000) 내 우선순위·중복 제거, LLM gate 옵션.

#### R-C. 갱신·반사 (Update · Reflection)
- per-turn: `record_message` (5KB 절단), `record_event`
- post-execution: `record_execution` — dated md + structured note + 벡터 증분 인덱싱
- session-end: `auto_flush` — dated summary + summary.md + vector save
- LLM reflection: (title/content/category/tags/importance) 스키마의 Insight 추출, importance ≥ high → curated 자동 승격

#### R-D. 운영 (Operational)
rebuild, vector reindex, link_notes, get_memory_graph, get_memory_tags, migrate(legacy→structured), promote(session→user/global), stats.

#### R-E. 외부 표면 (API shape)
세션 메모리 22 endpoint + 글로벌 메모리 9 endpoint (총 31). 이 엔드포인트 **집합이** executor-web이 제공해야 할 커버리지의 최저선이다.

#### R-F. 설정 표면 (`LTMConfig`의 21 필드)
master enabled, embedding(provider/model/api_key), chunking(size/overlap), retrieval(top_k/threshold/max_inject), curated(enabled/vector/budget/max_results), auto_curation(enabled/use_llm/quality_threshold/schedule/interval/max_per_run/last_run), user_opsidian(index/raw read).

→ 이 **21필드 전체가 executor Provider의 `config_schema`로 표현 가능해야 한다.**

### 1.3 `geny-executor-web` — 거울의 현재 상태

executor가 native 제공을 못 하니 web도 비어 있다. 전형적인 증상:

- `backend/app/services/pipeline_service.py:22` — `PipelineService.create_pipeline(...)`은 `PipelinePresets.<x>()`만 부르고 provider·manager를 주입하지 않는다. 모든 웹 세션은 `MemoryStage(AppendOnly, Null)`로 시작.
- `backend/app/services/session_service.py:13` — `SessionManager`가 in-memory 전용. `FileSessionPersistence`를 호출하지 않아 서버 재시작 시 대화 휘발.
- `backend/app/routers/stage_editor.py:156` — 일반화된 strategy swap은 가능하지만, 메모리 도메인 전용 UI는 없음.
- `backend/app/ws/stream.py:29` — `memory.*`, `context.*` 이벤트가 일반 스트림에 섞여 흐를 뿐 클라이언트가 이를 특별히 처리하지 않음.
- **메모리 전용 REST 라우터 0개** (요구 명세상 최소 18개 필요).
- 프런트엔드에 `MemoryConfigEditor`, `MemoryViewer`, `MemoryGraph`, `NoteEditor`, `RetrievalInspector` 등 **메모리 도메인 컴포넌트가 0개**.

정리: **executor가 native로 채워지면 web은 거의 자동으로 따라온다. executor가 비어 있는 한 web은 결코 채워질 수 없다.**

---

## 2. 문제 (Problems)

문제는 "Geny 호환성"이 아니라 "executor 자립성"의 결핍이다.

### P1. executor가 Geny 없이 돌 때 메모리가 실질적으로 비어 있다
`AppendOnlyStrategy.update()`는 `pass`, `FilePersistence`는 메시지 직렬화만, `NullRetriever`는 빈 배열 반환. 즉 executor만 배포된 환경에서는 메모리가 존재하지 않는 것과 같다. Geny가 없을 때도 LTM/Notes/Vector/Curated가 돌아야 한다는 것이 1차 목표인데, 현 구조에서는 표현 자체가 안 된다.

### P2. 어댑터가 인터페이스 역할을 대리하고 있다
`GenyMemoryRetriever/Strategy/Persistence`는 *inspect* 하면 Geny의 5~6 레이어를 모두 수행하지만, 그 의미론이 executor의 **공개 인터페이스**에 전혀 반영되지 않는다. 어댑터는 `memory_manager: Any` 아래에서 `getattr(..., "short_term")`, `getattr(..., "vector_memory")` 같은 비공식 계약을 쓴다. 어댑터가 지워지면 executor가 무엇을 할 수 있는지 확정적으로 말할 수 없다.

### P3. Strategy ABC가 1메서드짜리
```python
class MemoryUpdateStrategy(Strategy):
    async def update(self, state: PipelineState) -> None: ...
```
R-C가 요구하는 "per-turn 기록 / post-execution 요약 / LLM reflection / 자동 승격 / 벡터 증분 인덱싱"이 한 메서드 속 사적 구현에 뭉개져 있다. 부분 대체·부분 비활성화·부분 모델 바인딩이 불가.

### P4. `ConversationPersistence`는 7가지 영속 단위 중 1가지만 표현
| 영속 단위 | 키 | 현 인터페이스로 표현 가능? |
|---|---|---|
| Conversation messages | session_id | ✅ |
| Pipeline state snapshot | session_id | ❌ |
| Structured note | filename | ❌ |
| Vector chunk | (source_file, chunk_index) | ❌ |
| Curated note | (user, filename) | ❌ |
| Global note | filename | ❌ |
| Index/graph cache | — | ❌ |

### P5. Stage가 의미 있는 이벤트를 발행하지 않는다
`memory.persisted`, `memory.updated` 두 개의 얕은 이벤트만 발행. "노트 3개 저장", "벡터 12청크 인덱싱", "Insight 2개 승격" 같은 구조화된 정보가 없어 web EventLog / A/B 비교 / replay 결정성 검증 모두 불가.

### P6. Session 영속이 비활성
`FileSessionPersistence`는 설계만 있고 호출 경로 없음. 서버 재시작 → 대화·메모리 휘발.

### P7. 모델 ↔ 메모리 ↔ 임베딩 독립 변수 취급
모델 교체가 retriever `max_inject_chars`, compactor 임계치, reflection 모델, 임베딩 provider 어느 쪽과도 결합되어 있지 않다. web에서 임베딩 provider를 지정할 표면도 없다.

### P8. web REST·UI 부재 (결핍 증상)
R-E의 31 endpoint 대응 0, R-F의 21 config field 노출 0, 메모리 전용 컴포넌트 0. 이는 executor 빈곤의 **하류 결과**이지 독립 문제가 아니다.

### P9. 멀티테넌시 표현 부재
Scope (ephemeral/session/user/tenant/global)가 타입 시스템·스토리지 레이아웃·API에 전혀 드러나 있지 않다. R-A의 curated/global은 scope 없이는 표현 불가.

### P10. 비용 추적 부재 · 임베딩 마이그레이션 부재
reflection LLM, 임베딩 호출, 인덱싱이 cost model 없이 돈다. 임베딩 모델 교체 시 dimension mismatch를 silent rebuild로 처리 — 사용자 동의 없이 유실 가능.

---

## 3. 해결 방안 (Solutions)

원칙:

- **O1 — executor는 자립적이어야 한다.** Geny 없이도 모든 메모리 레이어가 native로 동작해야 한다.
- **O2 — 어댑터는 검증용이다.** `GenyManagerAdapter`는 기존 Geny 데이터에 **접근할 수 있다는** 증거로만 존재하고, 운영 경로에서 빠진다. executor의 native provider가 운영 경로다.
- **O3 — web은 executor의 거울이다.** executor가 노출하는 `Descriptor` + `ConfigSchema` + `Event`만 가지고 web의 UI가 자동 생성되도록 한다.
- **O4 — Geny 재작성은 별도 단계다.** executor+web이 완성된 후의 후속 작업이며 본 로드맵에는 진입 조건과 인터페이스 계약만 명시한다.

### 3.1 메모리 도메인을 4축으로 정규화

```
┌───────────────────────────────────────────────────────────────┐
│ LAYER      STM | LTM | Notes | Vector | Curated | Global |    │
│            Index                                              │
│ CAPABILITY read | write | search | link | promote | reindex | │
│            snapshot | reflect | summarize                     │
│ BACKEND    filesystem | sqlite | postgres | faiss | qdrant |  │
│            s3 | redis | http                                  │
│ SCOPE      ephemeral | session | user | tenant | global       │
└───────────────────────────────────────────────────────────────┘
```

모든 메모리 작업은 (Layer, Capability, Backend, Scope) 4튜플로 분류 가능해야 하고, executor의 타입 시스템이 이 4축을 1급 시민으로 표현한다.

### 3.2 통합 인터페이스 — `MemoryProvider` 프로토콜

기존 세 ABC를 대체하는 단일 프로토콜:

```python
# src/geny_executor/memory/provider.py (신규 · 핵심)
from typing import Protocol, runtime_checkable, Sequence

@runtime_checkable
class MemoryProvider(Protocol):
    @property
    def descriptor(self) -> "MemoryDescriptor": ...
    async def initialize(self) -> None: ...
    async def close(self) -> None: ...

    # layer handles (capability gate via None)
    def stm(self) -> "STMHandle": ...
    def ltm(self) -> "LTMHandle": ...
    def notes(self) -> "NotesHandle": ...
    def vector(self) -> "VectorHandle | None": ...
    def curated(self) -> "CuratedHandle | None": ...
    def global_(self) -> "GlobalHandle | None": ...
    def index(self) -> "IndexHandle": ...

    # cross-layer
    async def retrieve(self, query: "RetrievalQuery") -> "RetrievalResult": ...
    async def record_turn(self, turn: "Turn") -> None: ...
    async def record_execution(self, summary: "ExecutionSummary") -> "RecordReceipt": ...
    async def reflect(self, ctx: "ReflectionContext") -> Sequence["Insight"]: ...
    async def snapshot(self) -> "MemorySnapshot": ...
    async def restore(self, snap: "MemorySnapshot") -> None: ...
    async def promote(self, ref: "NoteRef", to: "Scope") -> "NoteRef": ...
```

핸들 예시 (Notes):

```python
class NotesHandle(Protocol):
    async def list(self, *, category=None, tag=None, importance=None) -> list[NoteMeta]: ...
    async def read(self, filename: str) -> Note | None: ...
    async def write(self, draft: NoteDraft) -> NoteMeta: ...
    async def update(self, filename: str, patch: NotePatch) -> NoteMeta: ...
    async def delete(self, filename: str) -> bool: ...
    async def link(self, source: str, target: str) -> bool: ...
    async def graph(self) -> NoteGraph: ...
```

→ 효과:
- (1) `getattr` duck-typing 제거, 정적 타입 체크 가능.
- (2) capability gate (`vector()` None)로 옵션 백엔드 표현.
- (3) web 백엔드는 protocol에만 의존 → executor 단독 배포로 충분.
- (4) Geny 재작성 시 동일 프로토콜을 구현하면 된다.

### 3.3 `MemoryStage` / `ContextStage` 재설계

두 stage가 **같은 provider**를 공유:

```python
class MemoryStage(Stage):
    def __init__(self, provider: MemoryProvider, *, hooks: MemoryHooks | None = None): ...

    async def execute(self, input, state):
        await self._provider.record_turn(Turn.from_state(state))
        if state.is_terminal():
            receipt = await self._provider.record_execution(ExecutionSummary.from_state(state))
            state.add_event("memory.execution_recorded", receipt.to_event())
        if self._hooks.should_reflect(state):
            insights = await self._provider.reflect(ReflectionContext.from_state(state))
            for ins in insights:
                state.add_event("memory.insight", ins.to_event())
                if ins.should_auto_promote():
                    ref = await self._provider.promote(ins.ref, to=ins.target_scope)
                    state.add_event("memory.promoted", ref.to_event())


class ContextStage(Stage):
    async def execute(self, input, state):
        result = await self._provider.retrieve(RetrievalQuery.from_state(state))
        state.metadata["memory_context"] = result.as_prompt_block()
        state.add_event("context.built", result.to_event())
```

### 3.4 Native Provider 4종 — **어댑터 의존 없음**

| Provider | 용도 | 백엔드 | Layer 지원 |
|---|---|---|---|
| `EphemeralMemoryProvider` | 테스트, stateless 세션 | dict in-memory | STM |
| `FileMemoryProvider` | 단일 사용자 데스크톱 / Geny 데이터 layout 호환 | filesystem + FAISS | STM + LTM + Notes + Vector + Index + (Curated · Global) |
| `SQLMemoryProvider` | 멀티 사용자 운영 | Postgres+pgvector 또는 SQLite+sqlite-vss + S3(옵션) | 전체 |
| `CompositeMemoryProvider` | 레이어별 백엔드 믹스 (e.g., STM=Redis, Notes=Postgres, Vector=Qdrant) | 라우팅 | 전체 |

**`GenyManagerAdapter`는 이 4종과 병렬이 아니라 위 4종을 검증하기 위한 reference fixture로 재정의**한다. 목적은 한 가지: "executor native provider가 Geny `SessionMemoryManager`와 의미론적으로 동등한가"를 contract test로 증명하는 것. 운영에서는 쓰지 않는다.

각 provider는 `MemoryDescriptor`로 자기 capability를 자기서술:

```python
@dataclass
class MemoryDescriptor:
    name: str
    version: str
    layers: set[Layer]
    capabilities: set[Capability]
    backends: list[BackendInfo]       # layer → backend
    scope: Scope
    config_schema: ConfigSchema       # R-F의 21필드 호환
    cost_model: CostModel | None
    embedding: EmbeddingDescriptor | None   # provider/model/dimension
```

**descriptor가 곧 web UI의 합성 재료**다.

### 3.5 이벤트 스키마 정규화

stage가 발행하는 모든 이벤트를 타입화해 executor → web 계약으로 고정:

```
context.built        { chunks:[{key,source,score}], total_chars, layer_breakdown }
context.compacted    { before, after, strategy, saved_tokens }
memory.turn_recorded { role, bytes }
memory.execution_recorded { notes_written, vector_chunks, files_updated }
memory.insight       { title, importance, category, tags }
memory.promoted      { ref, from_scope, to_scope }
memory.reindexed     { layer, duration_ms, cost }
memory.cost          { kind, tokens_in, tokens_out, usd }
memory.snapshot      { size_bytes, layers, checksum }
```

이 스키마를 web 프런트가 그대로 파싱·렌더.

### 3.6 Completeness Criteria — executor가 "완성되었다"의 정의

executor가 완성되었다고 선언하려면 아래 7가지 시나리오가 **Geny 코드 0줄**로 실행되어야 한다. Phase 별 게이트에서 그대로 쓴다.

- [ ] C1. Session 생성 → user 질의 → retriever가 6 레이어 합성 컨텍스트 반환 → 응답 생성 → per-turn STM 기록.
- [ ] C2. 실행 종료 시 dated LTM 엔트리 자동 작성 + structured note 생성 + 벡터 증분 인덱싱.
- [ ] C3. LLM reflection을 돌려 Insight 추출 → importance가 high/critical이면 curated로 자동 승격.
- [ ] C4. REST로 노트 CRUD / wikilink / graph / tags / importance 필터 / 키워드·벡터 검색이 모두 동작.
- [ ] C5. 임베딩 provider를 OpenAI→Voyage로 바꾸면 dimension mismatch를 감지하고 reindex plan을 내놓음. 승인 시 백그라운드 reindex 후 `memory.reindexed` 발행.
- [ ] C6. 서버 재시작 후 session 상태가 복원되어 이전 대화 맥락이 그대로 보임.
- [ ] C7. `GenyManagerAdapter`로 같은 시나리오를 실행한 결과와 **native FileMemoryProvider** 실행 결과가 공용 assertion suite를 통과.

### 3.7 Web 백엔드 — executor 거울 (thin proxy)

endpoint 집합은 R-E(31개)를 기반으로 하되, URL을 executor 도메인 모델과 1:1 매핑:

```
GET    /api/sessions/{sid}/memory/descriptor          # MemoryDescriptor 반환
GET    /api/sessions/{sid}/memory                     # index + stats
GET    /api/sessions/{sid}/memory/stats | tags | graph
GET    /api/sessions/{sid}/memory/notes               # ?category=&tag=&importance=
GET    /api/sessions/{sid}/memory/notes/{filename}
POST   /api/sessions/{sid}/memory/notes
PUT    /api/sessions/{sid}/memory/notes/{filename}
DELETE /api/sessions/{sid}/memory/notes/{filename}
POST   /api/sessions/{sid}/memory/notes/{filename}/link
POST   /api/sessions/{sid}/memory/search              # body: RetrievalQuery
POST   /api/sessions/{sid}/memory/reflect             # 강제 reflection
POST   /api/sessions/{sid}/memory/reindex             # body: layer list
GET    /api/sessions/{sid}/memory/snapshot
POST   /api/sessions/{sid}/memory/restore             # body: MemorySnapshot
POST   /api/sessions/{sid}/memory/promote             # body: {ref, to_scope}

GET    /api/users/{uid}/memory/curated/...            # 사용자 큐레이션
GET    /api/memory/global/...                         # 글로벌

# 신규 — provider catalog 자체를 노출
GET    /api/memory/providers                          # Descriptor 목록
GET    /api/memory/providers/{name}/config-schema
```

요청/응답 payload는 **executor의 dataclass를 그대로 직렬화**해 web 백엔드에 도메인 로직이 없게 만든다. `SessionService`/`PipelineService`는 `MemoryProviderFactory(descriptor_id, user_id)`로 provider를 빌드해 세션에 주입.

### 3.8 Web 프런트엔드 — Descriptor 주도 UI

`MemoryDescriptor.config_schema`를 입력으로 받아 UI를 자동 합성한다. 커스텀 컴포넌트는 메타/시각화 용도에만 쓴다.

| 컴포넌트 | 역할 |
|---|---|
| `MemoryProviderPicker` | 세션 생성/수정 시 provider 선택 (descriptor 목록) |
| `MemoryConfigPanel` | config_schema → 자동 폼 (embedding provider/model, top_k, threshold, max_inject …) |
| `MemoryDashboard` | stats, tag cloud, 레이어별 사이즈, 최근 활동 |
| `NoteList` / `NoteEditor` | CRUD, frontmatter 편집, importance picker |
| `MemoryGraph` | `notes().graph()` 시각화 (force-directed) |
| `RetrievalInspector` | 쿼리 → 어떤 청크가 어떤 점수로 매칭되었는가 |
| `MemoryTimeline` | `memory.*` 이벤트 스트림 타임라인 |
| `PromotePanel` | session → user / global 승격 |
| `ReindexPlanner` | 임베딩 변경 시 비용·분량 프리뷰 후 실행 |

`ModelConfigEditor`에는 provider.descriptor의 cost_model + 모델 컨텍스트 윈도우를 읽어 "max_inject_chars 조정 권장" 인라인 힌트.

### 3.9 세션 영속성

`SessionService`에 `FileSessionPersistence`를 1급으로 통합하고, `persistence_mode=ephemeral|file|sql`을 세션 생성 payload에 노출. 서버 부팅 시 기존 세션 인덱싱해 resume 가능하게.

### 3.10 멀티테넌시 (Scope 1급화)

- 모든 HTTP 경로에 `X-User-Id` 미들웨어 (default-user 폴백).
- `MemoryProviderFactory(user_id, scope)`가 scope별 storage root를 관리.
- `promote(ref, to=Scope.USER_CURATED|Scope.GLOBAL)`이 유일한 scope 이동 경로.
- 향후 OAuth/JWT 통합 시 미들웨어 주입지점 유지.

### 3.11 비용 가시화 & 임베딩 마이그레이션

모든 비용성 동작이 `CostEvent` 발행 (3.5의 `memory.cost`). history DB에 `memory_cost_events` 추가. 임베딩 provider 변경은 `descriptor.compatibility_check()` → `reindex_plan()` → 사용자 명시 승인 → 백그라운드 작업 + WS 진행률 송출. silent rebuild 금지.

---

## 4. 계획 (Roadmap)

임계 경로는 "**executor native 완성** → **web 거울 완성** → **Geny 재작성**" 순이다. Phase는 executor 중심으로 재정렬한다.

### Phase 0 — Spec Freeze (Week 1, 5일)
executor 완성의 **측정 기준**을 박제한다.
- [ ] 본 문서 §1.2 (R-A~R-F) 를 기계 검증 가능한 **Spec YAML**로 변환
- [ ] §3.6 Completeness Criteria C1~C7를 실행 가능한 pytest 시나리오로 작성 (기능 아직 없음 → red 상태)
- [ ] Geny 현재 DB에서 **골든 데이터셋** (sample notes + vector corpus + transcripts)을 추출해 fixture로 보관

산출물: executor 저장소의 `docs/MEMORY_SPEC.yaml` + `tests/completeness/*`.

### Phase 1 — Interface (Week 2–3)
**executor가 무엇을 할 수 있는지 공개 인터페이스로 선언한다.**
- [ ] `geny_executor.memory.provider` 신설: `MemoryProvider` 프로토콜 + 핸들 6종
- [ ] 도메인 dataclass 전체: `Note`, `NoteDraft`, `NotePatch`, `NoteMeta`, `NoteGraph`, `Turn`, `RetrievalQuery`, `RetrievalResult`, `ExecutionSummary`, `Insight`, `MemorySnapshot`, `MemoryDescriptor`, `CostEvent`, `NoteRef`, `Scope`, `Layer`, `Capability`
- [ ] 이벤트 스키마 (§3.5) dataclass 확정
- [ ] `MemoryStage`/`ContextStage`를 신 provider 주입 형태로 재작성 (기존 구구조는 deprecated shim)
- [ ] `EphemeralMemoryProvider` — 100% 단위 테스트, C1만 통과
- [ ] Contract test suite: 모든 provider가 통과해야 할 85+ 테스트 (Phase 2·3 가이드)

산출물: `geny-executor` v0.9.0. C1 green.

### Phase 2 — Native Providers (Week 4–7)
**Geny 없이 executor 단독으로 Geny 의미론 100% 실행.**
- [ ] `FileMemoryProvider` — Geny 디렉토리 layout 호환 (기존 Geny 데이터를 그대로 마운트 가능), STM·LTM·Notes·Vector·Index 지원
- [ ] `EmbeddingClient` 프로토콜 + OpenAI / Voyage / Google / local 백엔드 4종
- [ ] `SQLMemoryProvider` — SQLite+sqlite-vss 1차, Postgres+pgvector 2차
- [ ] `CompositeMemoryProvider` — 레이어별 믹스 라우팅
- [ ] Curated/Global 레이어 구현 + `promote()` 의미론 정립
- [ ] `MemoryProviderFactory(descriptor_id, user_id, scope)` + descriptor registry
- [ ] `GenyManagerAdapter` — **검증용 fixture**로 완성. Phase 3 contract test에서 native와 adapter가 동일 assertion을 통과하는지 검증
- [ ] Session 영속 (`FileSessionPersistence`) 통합

산출물: `geny-executor` v0.10.0. C1~C3, C5~C7 green. C4는 API 없으므로 라이브러리 호출 수준에서만 green.

### Phase 3 — Completeness Validation (Week 8)
**"executor가 끝났다"를 증명하는 게이트.**
- [ ] Phase 0의 pytest 시나리오 C1~C7 전부 green
- [ ] Native FileMemoryProvider 결과와 GenyManagerAdapter 결과가 차이 없음을 **의미론적 diff**로 검증 (chunks, notes, graph, vector top-k)
- [ ] 성능 회귀: Geny `build_memory_context_async` 대비 ±20% 이내
- [ ] 설정 커버리지: `LTMConfig` 21필드 전부 `MemoryDescriptor.config_schema`에 대응

산출물: `geny-executor` v1.0.0-rc. **이 게이트를 통과해야 web 작업이 시작된다.**

### Phase 4 — executor-web Mirror (Week 9–11)
**executor 능력 100%의 시각 표면.**
- [ ] `backend/app/services/memory_service.py` — provider 라우팅 (thin proxy)
- [ ] `backend/app/routers/memory.py` — §3.7의 18+개 endpoint
- [ ] `backend/app/routers/providers.py` — descriptor catalog
- [ ] `SessionService`에 provider factory + persistence_mode 통합
- [ ] WebSocket stream이 §3.5 이벤트 스키마대로 송출
- [ ] history DB 확장: `memory_cost_events`, `memory_snapshots`
- [ ] `X-User-Id` 미들웨어
- [ ] `frontend/src/types/memory.ts`, `frontend/src/api/memory.ts`, `frontend/src/stores/memoryStore.ts`
- [ ] §3.8의 컴포넌트 9종 + `ReindexPlanner`
- [ ] `ModelConfigEditor`에 "memory impact" 힌트 연결
- [ ] EventLog가 `memory.*`/`context.*`를 special-render

산출물: `geny-executor-web` v1.0.0-rc. **거울 완성도 = executor 완성도** 확인.

### Phase 5 — Hardening (Week 12)
- [ ] 임베딩 마이그레이션 UX 실전 시나리오 3종
- [ ] 메모리 비용 대시보드
- [ ] 메모리 diff (환경/세션 간 비교)
- [ ] snapshot-기반 replay 결정성 테스트
- [ ] 디스크/DB retention policy 구성 (STM 2000, LTM rotate, snapshot GC)
- [ ] 문서 split: `docs/memory/{spec, providers, events, web-api, ui}.md`

산출물: `geny-executor` v1.0.0 + `geny-executor-web` v1.0.0. Geny 이식을 시작할 수 있는 상태.

### Phase G — Geny Rewrite on executor+web (본 문서 범위 밖, 계약만 명시)
전제: Phase 5까지 green. Geny는 더 이상 `SessionMemoryManager`를 직접 갖지 않고 `MemoryProvider` 구현체를 하나 선택 + 자기 특화 Provider(예: `GenyProductionProvider`)를 추가로 구현한다.
- 데이터 마이그레이션: 기존 파일 layout이 `FileMemoryProvider`와 호환되므로 무비용. DB는 `SQLMemoryProvider` 스키마로 변환 스크립트.
- 라우팅: legacy `/api/agents/{sid}/memory/*`는 `/api/sessions/{sid}/memory/*`의 별칭 레이어로 유지 후 단계적 deprecate.
- UI: Geny 프런트는 executor-web 컴포넌트를 재사용하거나 동일 API 계약으로 재구현.

### 마일스톤 게이트

| 게이트 | 정의 | 검증 |
|---|---|---|
| G0 (Phase 0) | Spec·Completeness 기준 문서화 | Spec YAML + red pytest 존재 |
| G1 (Phase 1) | executor 인터페이스 동결 | C1 green, mypy strict pass |
| G2 (Phase 2) | executor native 완비 | C1~C3·C5~C7 green, 어댑터 비의존 |
| **G3 (Phase 3)** | **executor 완성 선언** | **C1~C7 전부 green + adapter parity + perf ±20%** |
| G4 (Phase 4) | web mirror 완비 | 모든 endpoint·UI 시나리오 통과 |
| G5 (Phase 5) | 운영 준비 완료 | retention/cost/migration 시나리오 통과 |
| GG (Phase G 진입 조건) | Geny 재작성 킥오프 | G5 green, provider 계약 freeze |

---

## 5. Appendix

### A. 핵심 타입 초안
```python
class Layer(StrEnum):
    STM = "stm"; LTM = "ltm"; NOTES = "notes"; VECTOR = "vector"
    CURATED = "curated"; GLOBAL = "global"; INDEX = "index"

class Capability(StrEnum):
    READ = "read"; WRITE = "write"; SEARCH = "search"; LINK = "link"
    PROMOTE = "promote"; REINDEX = "reindex"; SNAPSHOT = "snapshot"
    REFLECT = "reflect"; SUMMARIZE = "summarize"

class Scope(StrEnum):
    EPHEMERAL = "ephemeral"; SESSION = "session"; USER = "user"
    TENANT = "tenant"; GLOBAL = "global"

@dataclass
class RetrievalQuery:
    text: str
    layers: set[Layer] = field(default_factory=lambda: {Layer.STM, Layer.LTM, Layer.NOTES, Layer.VECTOR})
    max_chars: int = 8000
    max_per_layer: int = 5
    importance_floor: Importance = Importance.LOW
    tag_filter: set[str] = field(default_factory=set)
    use_llm_gate: bool = False

@dataclass
class RetrievalResult:
    chunks: list[MemoryChunk]
    layer_breakdown: dict[Layer, int]
    total_chars: int
    cost: CostEvent | None

@dataclass
class MemoryDescriptor:
    name: str; version: str
    layers: set[Layer]; capabilities: set[Capability]
    backends: list[BackendInfo]; scope: Scope
    config_schema: ConfigSchema
    cost_model: CostModel | None
    embedding: EmbeddingDescriptor | None
```

### B. Parity Spec — Geny 요구사항 ↔ executor 인터페이스

| Geny 요구 (§1.2의 R-x) | executor 대응 |
|---|---|
| R-A/STM: `record_message`, `record_event`, `get_recent`, `search` | `stm().append(Turn/Event)`, `stm().recent(n)`, `stm().search(q)` |
| R-A/LTM: `remember`, `remember_dated`, `remember_topic`, `load_main`, `search` | `ltm().append`, `ltm().write_dated`, `ltm().write_topic`, `ltm().read_main`, `ltm().search` |
| R-A/Notes: `write_note`, `update_note`, `delete_note`, `link_notes`, `read_note`, `list_notes` | `notes().{write,update,delete,link,read,list}` |
| R-A/Vector: `index_memory_files`, `index_text`, `search` | `vector().index_batch`, `vector().index`, `vector().search` |
| R-A/Index: `get_memory_index`, `get_memory_tags`, `get_memory_graph`, `reindex_memory` | `index().{snapshot,tag_counts,graph,rebuild}` |
| R-A/Curated: `curated.write_note`, `curated.promote_from_session` | `curated().notes().*`, `promote(ref, to=Scope.USER)` |
| R-A/Global: `global.write_note`, `global.promote` | `global_().notes().*`, `promote(ref, to=Scope.GLOBAL)` |
| R-B: `build_memory_context_async` | `retrieve(RetrievalQuery(...))` |
| R-C: `record_execution`, `auto_flush`, LLM reflection, auto-promote | `record_execution`, `snapshot + summarize hook`, `reflect`, `MemoryHooks.should_auto_promote` |
| R-D: `reindex_memory`, `migrate`, `link_notes`, stats | `index().rebuild`, `migrate(plan)`, `notes().link`, `descriptor` + `stats()` |
| R-E: 31 REST endpoint | §3.7의 18+ endpoint (중복 병합) |
| R-F: `LTMConfig` 21필드 | `MemoryDescriptor.config_schema` |

### C. 마이그레이션 위험과 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| executor native와 Geny 의미론 미세 차이 | 결과 재현성 | Phase 3 contract parity + Phase G에서 고정 |
| 벡터 dimension mismatch | 검색 무응답/유실 | descriptor.compatibility_check + 사용자 명시 승인 |
| 디스크·DB 급증 | OOM | retention: STM 2000, LTM rotate, snapshot GC, vector TTL |
| Scope 도입 회귀 | 기존 글로벌 세션 사라짐 | default-user 폴백 + 소급 마이그레이션 스크립트 |
| pgvector 운영 부담 | 배포 복잡 | SQLite+sqlite-vss를 1차, pgvector는 2차 |

### D. Quick Wins (Phase 0·1 중 병행 가능)

1. `SessionService.__init__`에 `FileSessionPersistence` 옵셔널 주입 + `GENY_SESSION_PERSIST=1` → 재시작 후 세션 보존.
2. 현 `memory.persisted`/`memory.updated` 이벤트 payload에 stage·count·strategy_name을 표준화 → 거울의 이벤트 로그가 즉시 의미 있어짐.
3. `routers/stage_editor.py` 응답에 `slot.config_schema`를 그대로 노출 → 프런트 generic ConfigForm으로 "전문가 모드" 메모리 파라미터 편집 가능.

---

## 6. 의사결정 요청 항목

아래 결정이 Phase 경로를 확정한다.

1. **Spec 기준일.** §1.2의 R-A~R-F 스냅샷을 2026-04-19 기준으로 동결하고 이후 Geny의 변경은 후속 Phase G 범위로 격리할지?
2. **SQL 1차 백엔드.** SQLite+sqlite-vss (권장) vs Postgres+pgvector vs 둘 다. 이는 Phase 2 범위에 직접 영향.
3. **멀티테넌시 도입 시점.** Phase 2에서 `Scope`를 1급 타입으로 도입할지(권장), 아니면 Phase 4 web에서 도입할지.
4. **어댑터 운영 여부.** `GenyManagerAdapter`를 검증 fixture 한정으로 확정(권장)할지, 배포 artifact로도 유지할지.
5. **노트 frontmatter 스키마.** Geny 현행 스키마를 executor `Note` 모델로 **그대로** 채택(권장)할지, 정규화 기회로 삼을지.
6. **Phase G 착수 주체·시점.** executor+web의 v1.0.0 게이트 이후 몇 주 버퍼를 두고 Geny 재작성을 착수할지.

각 결정 후 본 문서의 Phase/Section을 그에 맞춰 고정한다.
