/** UI labels */
export const UI_KO = {
  pipeline: "파이프라인",
  stageArchitecture: "16단계 아키텍처",
  scrollZoom: "스크롤 · 확대/축소",
  dragPan: "드래그 · 이동",
  reset: "초기화",
  overview: "개요",
  technicalBehavior: "기술적 동작",
  strategySlots: "전략 슬롯 (레벨 2)",
  currentConfig: "현재 구성",
  architecture: "아키텍처",
  active: "활성",
  inactive: "비활성",
  bypassable: "우회 가능",
  bypass: "우회 조건",
  phase: "페이즈",
  init: "초기화",
  agentLoop: "에이전트 루프",
  final: "최종",
  /* Phase 4: Editor & Tools */
  edit: "편집",
  editing: "편집 중",
  tools: "도구",
  environments: "환경",
  history: "실행 기록",
  strategy: "전략",
  config: "설정",
  model: "모델",
  saveConfig: "설정 저장",
  saveEnvironment: "환경 저장",
  noMutations: "변경 기록 없음",
  noTools: "도구 없음",
  createAdhocTool: "임시 도구 생성",
  mcpServers: "MCP 서버",
  toolPresets: "도구 프리셋",
  toolScope: "도구 범위",
  testTool: "도구 테스트",
  export: "내보내기",
  import: "가져오기",
  diff: "차이",
  apply: "적용",
  cancel: "취소",
  delete: "삭제",
  save: "저장",
  /* Phase 5: Environment System */
  savedConfigurations: "저장된 환경",
  saveCurrent: "현재 저장",
  noEnvironments: "저장된 환경 없음",
  selectToPreview: "미리보기할 환경 선택",
  envName: "환경 이름",
  envDescription: "설명",
  envTags: "태그",
  preset: "프리셋",
  share: "공유",
  generateLink: "링크 생성",
  linkCopied: "복사됨",
  sensitiveRemoved: "민감 정보 자동 제거됨",
  dropToImport: ".geny-env.json 파일을 놓으세요",
  orBrowse: "또는 파일 찾아보기",
  envComparison: "환경 Diff",
  noDifferences: "차이 없음",
  identical: "동일함",
  /* Environment Builder (v0.8.0) */
  environmentBuilder: "환경 빌더",
  newEnvironment: "새 환경",
  blankEnvironment: "빈 환경",
  fromPreset: "프리셋에서 생성",
  fromSession: "세션에서 생성",
  builderStages: "16단계",
  builderArtifact: "아티팩트",
  builderActive: "활성",
  builderConfigTab: "설정",
  builderToolsTab: "도구",
  builderModelTab: "모델",
  builderChainTab: "체인",
  builderSaving: "저장 중…",
  builderDuplicate: "복제",
  builderInstantiate: "세션 시작",
  builderSelectStage: "왼쪽에서 단계 선택",
  builderNoTemplate: "편집할 환경을 열거나 새로 만드세요",
  builderCreateNew: "새로 만들기",
  builderOpenExisting: "기존 환경 열기",
  builderTemplateName: "환경 이름",
  builderBasePreset: "기반 프리셋",
  builderToolBinding: "도구 바인딩",
  builderModelOverride: "모델 오버라이드",
  builderChainOrder: "체인 순서",
  builderNoConfigFields: "설정 가능한 항목이 없습니다",
  builderUnsupportedTools: "이 단계는 도구 바인딩을 지원하지 않습니다",
  builderUnsupportedModel: "이 단계는 모델 오버라이드를 지원하지 않습니다",
  builderNoChains: "순서를 바꿀 체인이 없습니다",
  /* Phase 6: History & Analytics */
  executionHistory: "실행 기록",
  executionRuns: "실행 목록",
  noHistory: "실행 기록이 없습니다",
  filterByModel: "모델 필터",
  filterByStatus: "상태 필터",
  allModels: "모든 모델",
  allStatuses: "모든 상태",
  viewDetail: "상세 보기",
  waterfall: "워터폴",
  stageTimings: "스테이지 타이밍",
  toolCalls: "도구 호출",
  iteration: "반복",
  cached: "캐시",
  skipped: "스킵",
  performance: "성능",
  costAnalysis: "비용 분석",
  totalCost: "총 비용",
  avgCost: "평균 비용",
  costByModel: "모델별 비용",
  costTrend: "비용 추이",
  tokenDistribution: "토큰 분포",
  hourly: "시간별",
  daily: "일별",
  weekly: "주별",
  abTest: "A/B 테스트",
  selectEnvA: "환경 A 선택",
  selectEnvB: "환경 B 선택",
  testInput: "테스트 입력",
  runTest: "테스트 실행",
  comparison: "비교",
  faster: "더 빠름",
  cheaper: "더 저렴",
  replay: "리플레이",
  debug: "디버그",
  breakpoint: "브레이크포인트",
  continueExec: "계속",
  stepNext: "다음 단계",
  bottleneck: "병목 구간",
  stats: "통계",
} as const;

/** Per-stage Korean content keyed by stage order */
export interface StageKo {
  displayName: string;
  categoryLabel: string;
  description: string;
  detailedDescription: string;
  technicalBehavior: string[];
  strategies: { slot: string; options: { name: string; description: string }[] }[];
  architectureNotes: string;
  bypassCondition?: string;
}

export const STAGES_KO: Record<number, StageKo> = {
  1: {
    displayName: "입력",
    categoryLabel: "인그레스",
    description: "사용자 입력 검증 및 정규화",
    detailedDescription:
      "파이프라인의 진입점입니다. 텍스트, 멀티모달 콘텐츠, 구조화된 데이터 등 모든 형태의 원시 사용자 입력을 받아 스키마 제약 조건에 따라 검증하고, 표준화된 NormalizedInput 형식으로 변환합니다. 정규화된 메시지는 세션 추적 메타데이터와 함께 Anthropic API 형식의 대화 기록에 추가됩니다.",
    technicalBehavior: [
      "모든 형태의 원시 입력 수신 (텍스트, 멀티모달, 구조화 데이터)",
      "구성된 Validator 전략에 따라 유효성 검사 실행",
      "NormalizedInput으로 변환하여 텍스트 정규화",
      "Anthropic API 형식으로 state.messages에 사용자 메시지 추가",
      "정규화된 입력에 session_id 부착",
      "'input.normalized' 이벤트 발행 (텍스트 길이 포함)",
    ],
    strategies: [
      {
        slot: "검증기 (Validator)",
        options: [
          { name: "DefaultValidator", description: "기본 타입 체크를 통한 대부분의 입력 수용" },
          { name: "PassthroughValidator", description: "유효성 검사 없이 모든 입력 통과" },
          { name: "StrictValidator", description: "엄격한 스키마 제약 조건 적용" },
          { name: "SchemaValidator", description: "사용자 정의 JSON 스키마 검증" },
        ],
      },
      {
        slot: "정규화기 (Normalizer)",
        options: [
          { name: "DefaultNormalizer", description: "텍스트 전용 정규화" },
          { name: "MultimodalNormalizer", description: "이미지, 오디오 등 혼합 콘텐츠 처리" },
        ],
      },
    ],
    architectureNotes:
      "Input은 Phase A의 유일한 스테이지입니다. 파이프라인 호출당 한 번만 실행되며 우회할 수 없습니다. 모든 하위 스테이지는 이 스테이지가 생성하는 NormalizedInput에 의존합니다.",
  },
  2: {
    displayName: "컨텍스트",
    categoryLabel: "인그레스",
    description: "대화 기록 및 메모리 로드",
    detailedDescription:
      "현재 API 호출을 위한 컨텍스트를 수집하고 조합합니다. 상태에 이미 존재하는 대화 기록을 로드하고, 외부 저장소(벡터 DB, 파일 시스템)에서 관련 메모리 청크를 검색하며, 컨텍스트 크기를 예산 대비 모니터링합니다. 컨텍스트가 컨텍스트 윈도우 예산의 80%를 초과하면 자동으로 압축을 트리거하여 오래된 메시지를 제거하거나 요약합니다.",
    technicalBehavior: [
      "마지막 사용자 메시지에서 쿼리 추출 (멀티모달 추출 지원)",
      "Retriever 전략을 호출하여 관련 메모리 청크 가져오기",
      "키 기반 메모리 참조 중복 제거",
      "토큰 수 추정 (4자 ≈ 1토큰 휴리스틱)",
      "estimated_tokens > context_window_budget × 0.8일 때 압축 트리거",
      "state.memory_refs 및 state.metadata['memory_context'] 업데이트",
      "'context.built' 및 선택적으로 'context.compacted' 이벤트 발행",
    ],
    strategies: [
      {
        slot: "컨텍스트 전략",
        options: [
          { name: "SimpleLoadStrategy", description: "상태에 이미 있는 메시지 사용 — 외부 검색 없음" },
          { name: "HybridStrategy", description: "최근 N개의 턴 유지 + 관련 메모리 주입" },
          { name: "ProgressiveDisclosureStrategy", description: "요약부터 시작하여 필요시 세부사항 확장" },
        ],
      },
      {
        slot: "압축기 (Compactor)",
        options: [
          { name: "TruncateCompactor", description: "예산 초과 시 가장 오래된 메시지 제거" },
          { name: "SummaryCompactor", description: "오래된 메시지를 AI 생성 요약으로 대체" },
          { name: "SlidingWindowCompactor", description: "고정된 N개 메시지 슬라이딩 윈도우 유지" },
        ],
      },
      {
        slot: "검색기 (Retriever)",
        options: [
          { name: "NullRetriever", description: "외부 메모리 검색 없음" },
          { name: "StaticRetriever", description: "초기화 시 로드된 고정 메모리 베이스" },
        ],
      },
    ],
    architectureNotes:
      "Context는 매 에이전트 루프 반복의 첫 번째 스테이지입니다. 상태 기반 메모리 관리와 토큰 예산 제약 사이를 연결하여 API 호출이 컨텍스트 윈도우 내에 머물도록 보장합니다.",
    bypassCondition: "stateless=True (기록이 없는 단일 턴 에이전트)",
  },
  3: {
    displayName: "시스템",
    categoryLabel: "인그레스",
    description: "페르소나와 규칙으로 시스템 프롬프트 구성",
    detailedDescription:
      "AI의 행동, 제약 조건, 성격, 운영 규칙을 정의하는 시스템 프롬프트를 조합합니다. 시스템 프롬프트는 단순 문자열 또는 풍부한 콘텐츠 블록 목록(이미지, 캐시된 섹션, 구조화된 지시사항 지원)이 될 수 있습니다. 도구 레지스트리가 제공되고 아직 도구가 등록되지 않았다면, 이 스테이지에서 도구 정의도 상태에 채웁니다.",
    technicalBehavior: [
      "Builder 전략을 호출하여 시스템 프롬프트 구성",
      "문자열 및 콘텐츠 블록 목록 형식 모두 지원",
      "tool_registry 제공 시 state.tools가 비어있으면 모든 도구 등록",
      "시스템 프롬프트는 이 스테이지 이후 불변 — 모든 후속 API 호출에서 사용",
      "'system.built' 이벤트 발행 (프롬프트 유형, 길이, 도구 수 포함)",
    ],
    strategies: [
      {
        slot: "프롬프트 빌더",
        options: [
          { name: "StaticPromptBuilder", description: "사전 구성된 고정 프롬프트 반환" },
          { name: "ComposablePromptBuilder", description: "조합 가능한 블록으로 구성: 역할, 제약, 예시, 지시사항" },
        ],
      },
    ],
    architectureNotes:
      "시스템 프롬프트는 기초적인 역할을 합니다 — 모든 하위 AI 행동을 형성합니다. 한 번 구성되면 루프 반복 전체에서 일관된 행동적 앵커링을 제공하며 변경되지 않습니다.",
  },
  4: {
    displayName: "가드",
    categoryLabel: "사전 점검",
    description: "안전 점검, 예산 집행, 권한 게이트",
    detailedDescription:
      "사전 비행 안전 및 예산 집행 검문소입니다. 실행을 거부하거나, 경고를 발행하거나, 계속을 허용할 수 있는 Guard 검증기의 순서화된 체인을 실행합니다. 비용이 많이 드는 API 호출 전의 마지막 관문으로, 토큰 예산 소진, 비용 한도, 반복 횟수 제한, 사용자 권한을 확인합니다. 가드는 실패 즉시 중단(fail-fast) 체인 순서로 실행됩니다.",
    technicalBehavior: [
      "등록된 모든 Guard 검증기를 순서대로 GuardChain으로 실행",
      "각 가드는 GuardResult(passed, action, message) 반환",
      "첫 번째 실패 시 체인 중단 (fail-fast 패턴)",
      "action='warn': 경고 이벤트 기록 후 실행 계속",
      "action='reject': GuardRejectError 발생 및 파이프라인 중단",
      "'guard.check' 이벤트 및 선택적으로 'guard.warn' 이벤트 발행",
    ],
    strategies: [
      {
        slot: "가드 체인",
        options: [
          { name: "TokenBudgetGuard", description: "남은 토큰 < 임계값(기본 10k)이면 실패" },
          { name: "CostBudgetGuard", description: "누적 비용이 USD 예산을 초과하면 실패" },
          { name: "IterationGuard", description: "반복 횟수 >= max_iterations이면 실패" },
          { name: "PermissionGuard", description: "사용자에게 필요한 권한이 없으면 실패" },
        ],
      },
    ],
    architectureNotes:
      "가드는 토큰과 비용을 투입하기 전에 심층 방어를 제공합니다. 체인은 '경고'(정보성)와 '거부'(차단)를 혼합할 수 있어 강제 중단 전에 점진적 경고를 가능하게 합니다.",
  },
  5: {
    displayName: "캐시",
    categoryLabel: "사전 점검",
    description: "비용 효율을 위한 프롬프트 캐싱 최적화",
    detailedDescription:
      "Anthropic의 임시 프롬프트 캐싱 마커를 시스템 프롬프트와 메시지 기록에 적용합니다. 이 마커는 API에 어떤 부분이 '안정적'이고 요청 간 캐시될 수 있는지 알려주어 입력 토큰 비용을 최대 90%까지 절감합니다. 공격적 전략은 시스템 지시사항, 도구 정의, 대화 기록의 안정적인 접두사에 마커를 적용할 수 있습니다.",
    technicalBehavior: [
      "콘텐츠 블록에 cache_control: {type: 'ephemeral'} 메타데이터 삽입",
      "시스템 캐싱 사용 시 시스템 프롬프트를 콘텐츠 블록으로 변환",
      "공격적 전략 마킹: 시스템, 도구, 마지막 N-4개 안정적 메시지 접두사",
      "캐시는 요청 수준(임시)이며 세션 간 유지되지 않음",
      "'cache.applied' 이벤트 발행 (전략 이름 포함)",
      "NoCacheStrategy가 구성된 경우 자동으로 우회",
    ],
    strategies: [
      {
        slot: "캐시 전략",
        options: [
          { name: "NoCacheStrategy", description: "캐싱 미적용 (단순 파이프라인 기본값)" },
          { name: "SystemCacheStrategy", description: "시스템 프롬프트만 캐시 — 최소 최적화" },
          { name: "AggressiveCacheStrategy", description: "시스템 + 도구 + 안정적 기록 접두사 캐시 — 최대 절약" },
        ],
      },
    ],
    architectureNotes:
      "프롬프트 캐싱은 주요 비용 최적화 수단입니다. 캐시된 입력 토큰은 일반 토큰의 약 10% 비용만 발생합니다. 긴 시스템 프롬프트, 대규모 도구 레지스트리, 멀티턴 대화에서 특히 효과적입니다.",
    bypassCondition: "NoCacheStrategy 구성 시 (적용할 마커 없음)",
  },
  6: {
    displayName: "API",
    categoryLabel: "실행",
    description: "Anthropic Messages API 호출",
    detailedDescription:
      "핵심 실행 스테이지 — 완전히 조합된 메시지, 시스템 프롬프트, 도구 정의, 사고(thinking) 설정과 함께 Anthropic Messages API를 호출합니다. 구성 가능한 재시도 전략(지수적 백오프, 속도 제한 인식)으로 일시적 오류를 처리합니다. 콘텐츠 블록, 토큰 사용량, stop_reason, 모델 메타데이터를 포함하는 APIResponse를 반환합니다.",
    technicalBehavior: [
      "상태에서 APIRequest 구성 (모델, 메시지, max_tokens, 시스템, 도구, 사고 설정)",
      "Provider 전략 호출 (실제 API용 AnthropicProvider, 테스트용 MockProvider)",
      "일시적 오류 시 지수적 백오프로 재시도 (속도 제한, 타임아웃)",
      "응답 콘텐츠 블록에서 어시스턴트 메시지를 state.messages에 추가",
      "하위 스테이지를 위해 원시 응답을 state.last_api_response에 저장",
      "토큰 사용량 추적: input_tokens, output_tokens, cache_creation/read tokens",
      "'api.request' (호출 전) 및 'api.response' (호출 후) 이벤트 발행",
    ],
    strategies: [
      {
        slot: "프로바이더",
        options: [
          { name: "AnthropicProvider", description: "Claude에 실제 API 호출 (프로덕션)" },
          { name: "MockProvider", description: "결정론적 가짜 응답 (테스트)" },
          { name: "RecordingProvider", description: "API 상호작용 기록 및 재생" },
        ],
      },
      {
        slot: "재시도",
        options: [
          { name: "ExponentialBackoffRetry", description: "지터가 포함된 지수적 백오프 (기본값)" },
          { name: "NoRetry", description: "오류 시 즉시 실패" },
          { name: "RateLimitAwareRetry", description: "Anthropic 속도 제한 전용 처리" },
        ],
      },
    ],
    architectureNotes:
      "API 스테이지는 인간의 의도를 AI 추론으로 연결합니다. 응답 콘텐츠는 텍스트 블록(답변), tool_use 블록(함수 호출 요청), thinking 블록(확장된 사고를 통한 내부 추론)을 포함할 수 있습니다. 외부 서비스를 호출하는 유일한 스테이지입니다.",
  },
  7: {
    displayName: "토큰",
    categoryLabel: "실행",
    description: "토큰 사용량 추적 및 비용 계산",
    detailedDescription:
      "토큰 소비량을 추적하고 실시간 USD 비용을 계산합니다. 마지막 API 응답에서 사용량 데이터를 가져와 파이프라인의 누적 합계에 누적하고, 모델별 가격을 적용합니다. 프롬프트 캐싱이 활성화된 경우 캐시 적중/미적중 메트릭도 업데이트하여 비용 최적화 가시성을 제공합니다.",
    technicalBehavior: [
      "state.last_api_response에서 사용량 추출 (입력, 출력, 캐시 토큰)",
      "Tracker 전략이 토큰 유형별로 사용량 분해",
      "Calculator 전략이 모델별 가격 요율로 비용 산출",
      "state.total_cost_usd에 누계 누적 (러닝 합계)",
      "cache_creation 또는 cache_read 토큰 시 state.cache_metrics 업데이트",
      "'token.tracked' 이벤트 발행 (상세 분석 포함)",
    ],
    strategies: [
      {
        slot: "추적기",
        options: [
          { name: "DefaultTracker", description: "기본 토큰 카운팅 (입력 + 출력)" },
          { name: "DetailedTracker", description: "콘텐츠 유형별 상세 분석 (텍스트, 도구, 사고)" },
        ],
      },
      {
        slot: "계산기",
        options: [
          { name: "AnthropicPricingCalculator", description: "공식 Anthropic 가격표 사용" },
          { name: "CustomPricingCalculator", description: "사용자 정의 토큰당 요율" },
        ],
      },
    ],
    architectureNotes:
      "비용 추적은 예산 인식 실행을 가능하게 합니다. 토큰 데이터는 후속 반복에서 Guard 스테이지(4단계)에 공급되어 예산 가드가 과소비 전에 실행을 중단할 수 있게 합니다.",
  },
  8: {
    displayName: "사고",
    categoryLabel: "실행",
    description: "확장된 사고(thinking) 블록 처리",
    detailedDescription:
      "Claude의 확장된 사고 — 응답 품질을 향상시키는 장문의 내부 추론 — 를 처리합니다. 사고 블록을 응답 블록과 분리하고, 사고 콘텐츠에 프로세서 전략(추출, 저장, 필터링)을 실행하며, 비사고 블록을 하위로 전달합니다. 사고 콘텐츠는 AI 내부용이며 사용자에게 반환되지 않습니다.",
    technicalBehavior: [
      "thinking_enabled=False이거나 응답에 사고 블록이 없으면 우회",
      "API 응답 콘텐츠에서 type='thinking'인 모든 블록 추출",
      "텍스트 및 budget_tokens_used가 포함된 ThinkingBlock 객체 생성",
      "프로세서 전략을 호출하여 사고 콘텐츠 처리",
      "응답 블록(텍스트, tool_use)과 사고 블록 분리",
      "모든 사고 블록의 total_thinking_tokens 합산",
      "'think.processed' 이벤트 발행 (블록 수 및 토큰 사용량 포함)",
    ],
    strategies: [
      {
        slot: "사고 프로세서",
        options: [
          { name: "PassthroughProcessor", description: "사고 콘텐츠를 변경 없이 저장" },
          { name: "ExtractAndStoreProcessor", description: "사고에서 핵심 인사이트를 추출하여 저장 (기본값)" },
          { name: "ThinkingFilterProcessor", description: "저장 전 사고 필터링 및 요약" },
        ],
      },
    ],
    architectureNotes:
      "확장된 사고는 모델이 답변 전에 깊이 추론할 수 있게 하는 Claude의 기능입니다. 사고 토큰은 출력 토큰과 별도이며 thinking_budget을 소비합니다. 이 스테이지는 내부 추론을 감사 가능하고 처리 가능하게 만듭니다.",
    bypassCondition: "thinking_enabled=False 또는 API 응답에 사고 블록 없음",
  },
  9: {
    displayName: "파싱",
    categoryLabel: "실행",
    description: "응답 파싱 및 완료 신호 감지",
    detailedDescription:
      "원시 API 응답에서 구조화된 정보를 추출합니다. 텍스트 콘텐츠, 도구 호출, 사고 콘텐츠를 통합된 ParsedResponse로 파싱합니다. 또한 응답 텍스트에서 작업 완료, 오류, 차단 상태 또는 계속 요청을 나타내는 특수 패턴을 스캔하는 신호 감지를 실행합니다. 이 신호들이 에이전트의 자체 종료 로직을 구동합니다.",
    technicalBehavior: [
      "Stage 6의 APIResponse를 수신하거나 state.last_api_response에서 가져옴",
      "Parser 전략이 추출: 텍스트, tool_calls (id, name, input), thinking_texts",
      "신호 감지기가 텍스트에서 완료 패턴 스캔: 'complete', 'blocked', 'error', 'continue'",
      "state.pending_tool_calls에 도구 호출 저장 (Stage 10에서 소비)",
      "state.thinking_history에 사고 저장 (감사 추적)",
      "파싱된 응답 텍스트로 state.final_text 업데이트",
      "'parse.complete' 이벤트 발행 (텍스트 길이, 도구 호출 수, 감지된 신호 포함)",
    ],
    strategies: [
      {
        slot: "응답 파서",
        options: [
          { name: "DefaultParser", description: "표준 Anthropic API 응답 파싱" },
          { name: "StructuredOutputParser", description: "구조화된 출력 모드(JSON 스키마)용" },
        ],
      },
      {
        slot: "신호 감지기",
        options: [
          { name: "RegexDetector", description: "빠른 신호 감지를 위한 정규식 패턴 사용 (기본값)" },
          { name: "StructuredDetector", description: "구조화된 출력용 JSON 기반 신호 감지" },
          { name: "HybridDetector", description: "여러 감지 방법 결합" },
        ],
      },
    ],
    architectureNotes:
      "완료 신호는 자체 종료를 가능하게 합니다: 에이전트가 도구 호출 없이 '작업이 완료되었습니다'라고 선언할 수 있습니다. 예: 응답 텍스트가 [COMPLETE]로 끝남 → 신호로 감지 → 평가 스테이지가 루프 완료.",
  },
  10: {
    displayName: "도구",
    categoryLabel: "실행",
    description: "도구 호출 실행 (순차 또는 병렬)",
    detailedDescription:
      "AI가 요청한 함수(도구) 호출을 실행합니다. API 응답의 각 tool_use 블록은 등록된 구현체로 라우팅되어 순차적 또는 병렬로 실행되며, 결과는 수집되어 Anthropic API 형식의 사용자 역할 tool_result 메시지로 메시지 기록에 추가됩니다. 실행 후 AI가 도구 결과를 처리할 수 있도록 루프가 강제로 계속됩니다.",
    technicalBehavior: [
      "state.pending_tool_calls가 비어있으면 우회 (요청된 도구 없음)",
      "Router 전략이 각 호출을 등록된 도구 구현체로 라우팅",
      "Executor 전략이 도구 실행: SequentialExecutor(하나씩) 또는 ParallelExecutor(동시)",
      "결과 수집: [{tool_use_id, content, is_error}, ...]",
      "사용자 역할 메시지로 state.messages에 도구 결과 추가",
      "state.loop_decision = 'continue' 강제 설정 (도구 결과를 위한 추가 API 호출 보장)",
      "도구별 'tool.execute_start' 및 'tool.execute_complete' 이벤트 발행",
    ],
    strategies: [
      {
        slot: "실행기",
        options: [
          { name: "SequentialExecutor", description: "도구를 하나씩 실행 — 안전하고 예측 가능 (기본값)" },
          { name: "ParallelExecutor", description: "독립적인 호출은 동시 실행 — 더 빠름" },
        ],
      },
      {
        slot: "라우터",
        options: [
          { name: "RegistryRouter", description: "state.tools 레지스트리에서 도구 구현체 조회" },
        ],
      },
    ],
    architectureNotes:
      "도구 실행은 에이전트를 에이전트답게 만드는 메커니즘입니다. 도구 실행 후 loop_decision이 평가에 관계없이 'continue'로 강제되어 AI가 다음 반복에서 도구 결과를 확인하고 처리하도록 합니다. 이것이 도구사용 → API → 도구사용 사이클을 만듭니다.",
    bypassCondition: "대기 중인 도구 호출 없음 (AI가 도구를 요청하지 않음)",
  },
  11: {
    displayName: "에이전트",
    categoryLabel: "실행",
    description: "멀티 에이전트 오케스트레이션 및 위임",
    detailedDescription:
      "멀티 에이전트 오케스트레이션 허브입니다. 오케스트레이터 전략이 위임이 적절하다고 판단할 때 전문화된 하위 파이프라인(서브 에이전트)에 작업을 위임합니다. 각 서브 에이전트는 자체 스테이지, 예산, 상태를 가진 독립적인 Pipeline 인스턴스입니다. 서브 에이전트의 결과는 수집, 요약되어 메인 대화에 통합되어 계층적 작업 분해를 가능하게 합니다.",
    technicalBehavior: [
      "SingleAgentOrchestrator이고 state.delegate_requests가 없으면 우회",
      "state.delegate_requests 기반으로 오케스트레이터가 위임 결정",
      "각 위임은 별도의 Pipeline 인스턴스(서브 에이전트) 생성",
      "서브 에이전트는 자체 구성과 예산으로 독립 실행",
      "서브 결과를 수집하여 state.agent_results에 저장",
      "서브 결과 존재 시: 요약을 state.messages에 추가, loop_decision = 'continue' 강제",
      "'agent.orchestrate_start' 및 'agent.orchestrate_complete' 이벤트 발행",
    ],
    strategies: [
      {
        slot: "오케스트레이터",
        options: [
          { name: "SingleAgentOrchestrator", description: "위임 없음 — 패스스루 (기본값)" },
          { name: "DelegateOrchestrator", description: "전문화된 서브 에이전트에 위임" },
          { name: "EvaluatorOrchestrator", description: "품질 확인을 위한 평가자 에이전트에 위임" },
        ],
      },
    ],
    architectureNotes:
      "서브 에이전트는 완전히 격리된 Pipeline 인스턴스입니다. 관리자 에이전트가 복잡한 작업을 분해하여 전문가 에이전트에 부분을 위임하는 분할-정복 아키텍처를 가능하게 합니다. 각 서브 에이전트는 다른 프리셋과 모델을 사용할 수 있습니다.",
    bypassCondition: "SingleAgentOrchestrator 모드에서 위임 요청 없음",
  },
  12: {
    displayName: "평가",
    categoryLabel: "결정",
    description: "응답 품질 및 완성도 판단",
    detailedDescription:
      "현재 응답이 '충분히 좋은지', 루프를 계속할지, 재시도할지, 에스컬레이션할지를 평가하는 핵심 결정 지점입니다. 전략 기반 평가(신호 감지, 기준 매칭, 보조 에이전트 판단)와 선택적 품질 점수(0.0–1.0)를 결합합니다. 평가 결정은 파이프라인 제어 흐름을 결정하는 루프 결정에 직접 매핑됩니다.",
    technicalBehavior: [
      "평가 전략 실행: 상태를 분석하여 EvaluationResult 반환",
      "선택적으로 품질 점수기 실행하여 수치 점수 (0.0–1.0) 산출",
      "평가 결정을 loop_decision에 매핑: complete, continue, retry, escalate, error",
      "state.evaluation_score에 점수, state.evaluation_feedback에 피드백 저장",
      "평가 결정이 도구 사용 계속을 오버라이드 가능",
      "'evaluate.complete' 이벤트 발행 (점수, 결정, 피드백 포함)",
    ],
    strategies: [
      {
        slot: "평가 전략",
        options: [
          { name: "SignalBasedEvaluation", description: "Parse 스테이지의 completion_signal 사용 (기본값)" },
          { name: "CriteriaBasedEvaluation", description: "사용자 정의 기준 확인: 단어 수, 형식, 콘텐츠 규칙" },
          { name: "AgentEvaluation", description: "보조 에이전트를 호출하여 응답 품질 평가" },
        ],
      },
      {
        slot: "점수기",
        options: [
          { name: "NoScorer", description: "수치 품질 점수 없음 (기본값)" },
          { name: "WeightedScorer", description: "다기준 점수: 관련성, 완성도, 형식" },
        ],
      },
    ],
    architectureNotes:
      "평가는 도구 사용 계속을 오버라이드할 수 있습니다 — 대기 중인 도구가 있어도 평가가 완료 또는 에스컬레이션을 강제할 수 있습니다. 이는 무한 루프를 방지하고 정책 기반 조기 종료를 가능하게 합니다.",
  },
  13: {
    displayName: "루프",
    categoryLabel: "결정",
    description: "루프를 계속할지 종료할지 결정",
    detailedDescription:
      "최종 루프 제어 결정 — 파이프라인의 분기점입니다. Evaluate의 종단 결정(complete, error, escalate)을 존중하지만, 상위가 'continue'라고 할 때 자체 컨트롤러 전략을 적용합니다. 컨트롤러는 확인합니다: 대기 중인 도구 결과가 있는가? 완료 신호가 감지되었는가? 최대 반복 횟수에 도달했는가? 예산이 거의 소진되었는가? 실행이 Stage 2로 돌아갈지 Phase C로 나갈지를 결정하는 최종 loop_decision을 설정합니다.",
    technicalBehavior: [
      "Evaluate 스테이지의 상위 loop_decision 존중",
      "종단 결정(complete, error, escalate)은 변경 없이 통과",
      "'continue' 결정의 경우: 최종 판정을 위해 컨트롤러 전략 호출",
      "컨트롤러 확인: tool_results 대기, 완료 신호, 최대 반복, 예산",
      "최종 state.loop_decision 설정",
      "state.tool_results 초기화 (이번 반복에서 소비됨)",
      "이벤트 발행: 'loop.{decision}' (예: 'loop.complete', 'loop.continue')",
    ],
    strategies: [
      {
        slot: "루프 컨트롤러",
        options: [
          { name: "StandardLoopController", description: "도구 결과 → 계속, 신호가 결정, end_turn → 완료" },
          { name: "SingleTurnController", description: "항상 즉시 완료 — 루프 없음 (단일 턴 모드)" },
          { name: "BudgetAwareLoopController", description: "비용/토큰 예산 비율이 임계값 초과 시 중단" },
        ],
      },
    ],
    architectureNotes:
      "loop_decision == 'continue'이면: state.iteration을 증가시키고 Stage 2(Context)로 돌아갑니다. 그렇지 않으면: Phase B를 벗어나 Phase C(Finalize)로 진행합니다. 루프 경계를 제어하는 유일한 스테이지입니다.",
  },
  14: {
    displayName: "출력",
    categoryLabel: "이그레스",
    description: "결과 출력 (텍스트, 콜백, VTuber, TTS)",
    detailedDescription:
      "최종 응답을 여러 출력 채널을 통해 동시에 외부 소비자에게 전달합니다. Emitter 체인은 결과를 등록된 목적지로 팬아웃합니다: API 응답용 텍스트 버퍼, 콜백용 웹훅, VTuber 애니메이션 시스템, TTS(텍스트-투-스피치) 엔진 등. Emitter는 다른 것들을 차단하지 않고 독립적으로 실패할 수 있습니다.",
    technicalBehavior: [
      "체인에 등록된 Emitter가 없으면 우회",
      "구성된 체인의 각 Emitter 호출",
      "각 Emitter가 전달 방식 커스터마이즈: 형식, 채널, 필터링",
      "모든 Emitter에서 결과 수집",
      "Emitter는 다른 것들을 차단하지 않고 독립적으로 실패 가능 (구성 가능)",
      "'emit.start' 및 'emit.complete' 이벤트 발행",
    ],
    strategies: [
      {
        slot: "Emitter 체인",
        options: [
          { name: "TextEmitter", description: "텍스트 버퍼 / API 응답으로 출력" },
          { name: "CallbackEmitter", description: "웹훅 또는 콜백 함수 호출" },
          { name: "VTuberEmitter", description: "VTuber 애니메이션 시스템으로 출력 (Live2D/AIRI)" },
          { name: "TTSEmitter", description: "텍스트-투-스피치 엔진으로 출력" },
        ],
      },
    ],
    architectureNotes:
      "Emitter는 개념적으로 병렬 실행됩니다 — 응답이 여러 소비자에게 팬아웃됩니다. 이는 멀티 채널 시나리오를 가능하게 합니다: 채팅 UI + 음성 합성 + 로깅, 모두 같은 파이프라인 결과에서.",
    bypassCondition: "체인에 등록된 Emitter 없음",
  },
  15: {
    displayName: "메모리",
    categoryLabel: "이그레스",
    description: "대화 메모리 영속화",
    detailedDescription:
      "대화 기록을 영속화하고 장기 메모리 저장소를 업데이트합니다. 메모리 업데이트 전략 — 무엇을 저장할지 결정(전부, 없음, 요약) — 을 적용하고 영속성 백엔드를 호출하여 기록합니다(파일, 데이터베이스, 벡터 스토어). 대화를 통해 학습하고 기억하는 상태 유지 에이전트에 필수적입니다.",
    technicalBehavior: [
      "stateless=True이거나 NoMemoryStrategy 구성 시 우회",
      "메모리 업데이트 전략을 호출하여 저장용 state.messages 변환",
      "영속성 구성 시 session_id가 있으면 persistence.save() 호출",
      "구성된 백엔드에 기록 (RAM, 파일, 데이터베이스)",
      "'memory.updated' 및 선택적으로 'memory.persisted' 이벤트 발행",
    ],
    strategies: [
      {
        slot: "업데이트 전략",
        options: [
          { name: "AppendOnlyStrategy", description: "모든 메시지를 그대로 저장 (기본값)" },
          { name: "NoMemoryStrategy", description: "아무것도 저장하지 않음 — 일회성 실행" },
          { name: "ReflectiveStrategy", description: "저장 전 대화를 요약하고 성찰" },
        ],
      },
      {
        slot: "영속성",
        options: [
          { name: "InMemoryPersistence", description: "RAM에 저장 — 세션 범위, 재시작 시 유실" },
          { name: "FilePersistence", description: "디스크에 저장 — 재시작에도 유지" },
        ],
      },
    ],
    architectureNotes:
      "Memory는 '무엇을 저장할지'(전략)와 '어디에 저장할지'(영속성)를 분리합니다. 이 분리를 통해 같은 대화 데이터를 구성에 따라 파일, 벡터 데이터베이스에 저장하거나 완전히 폐기할 수 있습니다.",
    bypassCondition: "stateless=True 또는 NoMemoryStrategy 구성",
  },
  16: {
    displayName: "반환",
    categoryLabel: "이그레스",
    description: "최종 결과 포맷팅 및 반환",
    detailedDescription:
      "터미널 스테이지입니다. 파이프라인의 누적된 상태를 호출자가 기대하는 출력 형식으로 변환합니다: 일반 텍스트, 메타데이터가 포함된 구조화된 JSON, 또는 스트리밍 이터레이터. 응답 텍스트, 총 비용, 반복 횟수, 메타데이터를 포함하는 PipelineResult를 반환합니다. 이 스테이지 이후 파이프라인 실행이 완료됩니다.",
    technicalBehavior: [
      "Formatter 전략을 호출하여 상태를 출력 형식으로 변환",
      "Formatter가 커스터마이즈: 구조, 메타데이터 포함, 직렬화",
      "state.final_output이 설정되면 반환, 아니면 state.final_text 반환",
      "'yield.complete' 이벤트 발행 (텍스트 길이, 반복 횟수, 총 비용 포함)",
      "파이프라인 실행은 여기서 종료 — 결과가 호출자에게 반환됨",
    ],
    strategies: [
      {
        slot: "포맷터",
        options: [
          { name: "DefaultFormatter", description: "일반 텍스트 응답 반환" },
          { name: "StructuredFormatter", description: "메타데이터 포함 JSON 반환: 비용, 반복, 이벤트" },
          { name: "StreamingFormatter", description: "실시간 출력용 스트리밍 이터레이터 반환" },
        ],
      },
    ],
    architectureNotes:
      "최종 스테이지는 파이프라인 로직을 출력 형식에서 분리합니다. 같은 파이프라인이 REST API, 스트리밍 WebSocket, 배치 작업, CLI를 서비스할 수 있습니다 — 각각 다른 출력 형태가 필요하며 — Formatter 전략만 교체하면 됩니다.",
  },
};
