# geny-executor-web 사용자 가이드

## 1. 개요

geny-executor-web은 [geny-executor](https://github.com/CocoRoF/geny-executor) 파이썬 라이브러리의 비주얼 에디터입니다. 16단계 듀얼 추상화 AI 파이프라인을 웹 UI로 설정, 실행, 분석할 수 있습니다.

### 아키텍처

```
┌──────────────────────────────────────────────────┐
│  geny-executor-web (별도 서버)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Frontend  │←→│  nginx   │←→│   Backend     │  │
│  │ React+TS  │  │  :58088  │  │  FastAPI:8088 │  │
│  └──────────┘  └──────────┘  └───────┬───────┘  │
│                                       │          │
│                              pip install          │
│                                       ▼          │
│                              ┌───────────────┐   │
│                              │ geny-executor  │   │
│                              │   v0.10.0     │   │
│                              │ (PyPI 라이브러리) │   │
│                              └───────────────┘   │
└──────────────────────────────────────────────────┘
```

---

## 2. 설치 및 실행

### Docker (권장)

```bash
git clone https://github.com/CocoRoF/geny-executor-web
cd geny-executor-web

# .env 파일 생성
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# 빌드 & 실행
docker compose up -d

# 접속: http://localhost:58088
```

### 로컬 개발

```bash
# Backend
cd backend
pip install -e ".[dev]"   # geny-executor >= 0.10.0 자동 설치
uvicorn app.main:app --reload --port 8088

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:5174
```

---

## 3. 세션 관리

세션은 파이프라인의 실행 인스턴스입니다.

1. **세션 생성**: 프리셋 선택 (minimal/chat/agent/evaluator/geny_vtuber)
2. **엔진 선택**: `executor` (geny-executor) 또는 `harness` (geny-harness)
3. **모델 설정**: Claude 모델명 (기본: `claude-sonnet-4-20250514`)

---

## 4. 스테이지 에디터

16단계 파이프라인을 시각적으로 편집합니다:

- **Phase A** (Stage 1): 입력 처리
- **Phase B** (Stages 2-13): 반복 루프 (Think → Act → Observe ...)
- **Phase C** (Stages 14-16): 출력 (Emit → Memory → Yield)

각 스테이지에서:
- 전략(Strategy) 교체 — 드롭다운으로 구현체 선택
- 설정 변경 — JSON 스키마 기반 폼
- 활성화/비활성화 — 토글

---

## 5. 도구 관리

### Ad-hoc 도구
사용자 정의 도구를 직접 생성합니다:
- **HTTP 도구**: 외부 API 호출 (SSRF 보호 적용)
- **Script 도구**: Python 스크립트 실행 (AST 보안 검증 적용)

### MCP 서버
Model Context Protocol 서버를 연결합니다:
- stdio 또는 SSE 트랜스포트
- 위험 커맨드 자동 차단 (rm, dd, kill 등)

### 도구 스코프
조건부 도구 활성화:
- 반복 횟수, 비용 임계값에 따라 도구 추가/제거

---

## 6. 환경(Environment) 시스템

파이프라인 설정을 스냅샷으로 저장/복원합니다:

- **저장**: 현재 세션의 전체 설정을 환경으로 저장
- **로드**: 저장된 환경을 세션에 적용
- **비교(Diff)**: 두 환경의 차이점 분석
- **내보내기/가져오기**: JSON 파일로 공유
  - 가져오기 시 보안 검증 (크기/스테이지/도구 제한, 스크립트 보안)
- **프리셋**: 환경을 프리셋으로 등록

---

## 7. 실행 히스토리 & 분석

### 실행 기록
- 모든 파이프라인 실행 기록 자동 저장
- 상태, 모델, 비용, 토큰 사용량, 도구 호출 추적

### 워터폴 차트
- 반복별 스테이지 실행 시간 시각화
- 캐시 히트, 스킵 표시

### 비용 대시보드
- 모델별 비용 분석
- 시간별 비용 추이

### A/B 테스트
- 두 환경으로 동일 입력 실행 후 결과 비교
- 비용, 속도, 토큰 사용량 비교

---

## 8. 보안

### SSRF 보호
- 도구의 HTTP 요청이 내부 네트워크(10.x, 172.16.x, 192.168.x, localhost)에 접근 차단
- DNS 리졸루션 후 IP 검증

### 스크립트 샌드박스
- AST 분석으로 위험 코드 사전 차단
- 금지 모듈: `os`, `sys`, `subprocess`, `socket`, `pickle` 등
- 금지 함수: `exec()`, `eval()`, `open()`, `__import__()` 등

### 환경 가져오기 검증
- 파일 크기 제한 (10MB)
- 스테이지 수 제한 (32개)
- Ad-hoc 도구 수 제한 (100개)
- MCP 서버 수 제한 (20개)
- 스크립트 내 보안 위반 자동 검출

---

## 버전 호환성

| geny-executor-web | geny-executor (필수) | 주요 기능 |
|-------------------|---------------------|-----------|
| v0.6.0 | >= 0.10.0 | 전체 기능 (보안, 히스토리, A/B 테스트) |
| v0.4.0 | >= 0.4.0 | 기본 에디터 + 도구 관리 |
