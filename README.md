# Schoolars V2

**Schoolars V2** 는 학교 시간표 최적화를 위한 React + TypeScript + Vite 웹 애플리케이션입니다.

## 주요 기능

- **클래스 최적화**: 규칙 기반 학생 배정을 통한 클래스 시간표 최적화
- **교사 시간표**: 교사 시간표 관리 (개발 중)

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| **프레임워크** | React 19.2 (React Compiler 포함) |
| **빌드 도구** | Vite 8 |
| **언어** | TypeScript 5.9 |
| **스타일링** | Tailwind CSS 4 |
| **UI 컴포넌트** | Radix UI + shadcn 패턴 |
| **라우팅** | React Router 7 |
| **상태/데이터** | TanStack Query 5, TanStack Form, TanStack Table |
| **유효성 검사** | Zod |
| **린팅** | ESLint 9 |
| **포매팅** | Biome 2 |
| **Git Hooks** | Lefthook + lint-staged |

## 사전 요구사항

- **Node.js**: v24.12.0 (`.nvmrc` 참조)
- **패키지 매니저**: npm

## 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | HMR 과 함께 개발 서버 시작 (`http://localhost:5173`) |
| `npm run build` | 프로덕션용 타입 체크 및 빌드 |
| `npm run preview` | 프로덕션 빌드 로컬 미리보기 |
| `npm test` | Vitest 로 테스트 실행 (watch 모드) |
| `npm run lint` | ESLint 실행 |
| `npm run typecheck` | TypeScript 타입 체크 실행 |
| `npm run format` | Biome 으로 코드 포매팅 |
| `npm run prepare` | Lefthook git hooks 설치 |

### 개발 서버 시작

```bash
npm run dev
```

## 프로젝트 구조

```
schoolars-v2/
├── src/
│   ├── assets/          # 정적 에셋
│   ├── components/
│   │   ├── class-optimize/  # 기능별 컴포넌트
│   │   └── ui/          # Shadcn UI 컴포넌트
│   ├── layouts/         # 레이아웃 컴포넌트 (main-layout)
│   ├── lib/
│   │   └── class-optimize/  # 도메인 로직 모듈
│   │       ├── types.ts
│   │       ├── class-optimizer.ts
│   │       ├── class-validator.ts
│   │       └── excel-parser.ts
│   ├── pages/           # 라우트 페이지 컴포넌트
│   ├── index.css        # 글로벌 스타일 + Tailwind
│   ├── main.tsx         # 라우터 설정 엔트리 포인트
│   └── router.tsx       # 라우트 설정
├── public/              # 퍼블릭 정적 에셋
├── docs/                # 문서화
├── samples/             # 샘플 데이터 파일
├── index.html           # HTML 엔트리 포인트
├── vite.config.ts       # Vite 설정
├── tsconfig.json        # TypeScript 설정
├── biome.json           # Biome 포맷터 설정
├── eslint.config.js     # ESLint 설정
├── lefthook.yml         # Git hooks 설정
└── package.json         # 의존성 및 스크립트
```

## 주요 기능 상세

### 클래스 최적화 (`/class-optimize`)

학생 배정 최적화를 위한 4 단계 마법사:

1. **데이터 업로드**: 학생 데이터 (이름, 학년, 반, 번호, 점수) 가 포함된 Excel 파일 업로드
2. **규칙 설정**: 배정 규칙 설정:
   - `no_together`: 같은 반에 배정될 수 없는 학생들
   - `separate_1_to_n`: 기준 학생이 다른 N 명의 학생과 분리되어야 함
   - `same_name_separate`: 동명이인 학생들은 서로 다른 반에 배정
3. **결과 보기**: 최적화 결과를 위반 사항 경고와 함께 확인
4. **내보내기**: 결과를 Excel 파일로 다운로드

**알고리즘**: Snake 드래프트 분배 + 분산 최소화를 통한 규칙 기반 스왑 최적화

### 교사 시간표 (`/teacher-timetable`)

- 교사 스케줄링 기능 placeholder 페이지 (개발 중)

### 클래스 편집기 (`/class-editor`)

- 수동 클래스 편집 placeholder 페이지 (개발 중)

## 개발 컨벤션

### 코드 스타일

- **들여쓰기**: 탭 (2 스페이스 상당)
- **따옴표**: 문자열은 작은따옴표, JSX 는 큰따옴표
- **세미콜론**: 항상 포함
- **후행 쉼표**: 항상 포함
- **줄 너비**: 최대 80 자
- **줄 끝**: LF (Unix 스타일)

### Pre-commit Hooks

Lefthook 이 모든 커밋에서 실행:
1. **TypeScript 체크**: `tsc -b --noEmit`
2. **lint-staged**: 스테이징된 `.ts`/`.tsx` 파일에 대해 ESLint 와 Biome 실행

### 린팅 & 포매팅

- **ESLint**: TypeScript 지원을 제공하는 주요 린터
- **Biome**: 포매팅 및 import 정리에 사용 (린터 비활성화)
- **lint-staged**: 커밋 시 스테이징된 파일 자동 포매팅
- **파일명 규칙**: kebab-case

### 컴포넌트 패턴

- UI 컴포넌트는 shadcn 컨벤션 따름
- variant 기반 스타일링을 위해 `class-variance-authority` 사용
- Tailwind 클래스 병합을 위해 `cn()` 유틸리티 사용
- 컴포넌트는 `src/components/ui/` 에서 export

### 테스트

| 카테고리 | 기술 |
|----------|------|
| **테스트 프레임워크** | Vitest 4 |
| **테스트 데이터** | @faker-js/faker 10 |

```bash
npm test          # watch 모드로 테스트 실행
npx vitest run    # 테스트 1 회 실행
```

**테스트 파일 컨벤션**: `src/lib/<module>/__tests__/<module-name>.test.ts`

## 라이선스

MIT
