# Schoolars V2 - Project Context

## Project Overview

**Schoolars V2** is a React + TypeScript + Vite web application for school scheduling optimization. The project provides tools for:
- **Class Optimization**: Optimizing class schedules with rule-based student assignment
- **Teacher Timetabling**: Managing teacher timetables (WIP)

### Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19.2 with React Compiler |
| **Build Tool** | Vite 8 |
| **Language** | TypeScript 5.9 |
| **Styling** | Tailwind CSS 4 |
| **UI Components** | Radix UI + shadcn patterns |
| **Routing** | React Router 7 |
| **State/Data** | TanStack Query 5, TanStack Form, TanStack Table |
| **Validation** | Zod |
| **Linting** | ESLint 9 |
| **Formatting** | Biome 2 |
| **Git Hooks** | Lefthook + lint-staged |

### Architecture

- **Entry Point**: `src/main.tsx` - Sets up React Router with nested routes and TanStack Query client
- **App Shell**: `src/layouts/main-layout.tsx` - Main layout with navigation menu
- **Routing**: `src/router.tsx` - Route configuration with lazy-loaded page components
- **Pages**: `src/pages/` - Route components (ClassOptimize, TeacherTimetable, ClassEditor)
- **Components**: 
  - `src/components/ui/` - Reusable UI components (shadcn-style)
  - `src/components/class-optimize/` - Feature-specific components
- **Utilities**: `src/lib/` - Shared utilities and domain logic modules
- **Path Aliases**: `@/*` resolves to `./src/*`

## Building and Running

### Prerequisites

- **Node.js**: v24.12.0 (see `.nvmrc`)
- **Package Manager**: npm

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR on `http://localhost:5173` |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm test` | Run tests with Vitest (watch mode) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type-checking |
| `npm run format` | Format code with Biome |
| `npm run prepare` | Install Lefthook git hooks |

### Development Server

```bash
npm run dev
```

## Development Conventions

### Code Style

- **Indentation**: Tabs (2 spaces equivalent)
- **Quotes**: Single quotes for strings, double quotes for JSX
- **Semicolons**: Always required
- **Trailing Commas**: Always included
- **Line Width**: 80 characters max
- **Line Endings**: LF (Unix-style)

### Pre-commit Hooks

Lefthook runs on every commit:
1. **TypeScript check**: `tsc -b --noEmit`
2. **lint-staged**: Runs ESLint and Biome on staged `.ts`/`.tsx` files

### Linting & Formatting

- **ESLint**: Primary linter with TypeScript support
- **Biome**: Used for formatting and imports organization (linter disabled)
- **lint-staged**: Auto-formats staged files on commit
- **File Naming Convention**: Kebab-case

### Component Patterns

- UI components follow shadcn conventions
- Use `class-variance-authority` for variant-based styling
- Use `cn()` utility for merging Tailwind classes
- Components exported from `src/components/ui/`

### Testing

| Category | Technology |
|----------|------------|
| **Test Framework** | Vitest 4 |
| **Test Data** | @faker-js/faker 10 |

```bash
npm test          # Run tests in watch mode
npx vitest run    # Run tests once
```

**Test file convention**: `src/lib/<module>/__tests__/<module-name>.test.ts`

## File Structure

```
schoolars-v2/
├── src/
│   ├── assets/          # Static assets
│   ├── components/
│   │   ├── class-optimize/  # Feature-specific components
│   │   └── ui/          # Shadcn UI components
│   ├── layouts/         # Layout components (main-layout)
│   ├── lib/
│   │   └── class-optimize/  # Domain logic modules
│   │       ├── types.ts
│   │       ├── class-optimizer.ts
│   │       ├── class-validator.ts
│   │       └── excel-parser.ts
│   ├── pages/           # Route page components
│   ├── index.css        # Global styles + Tailwind
│   ├── main.tsx         # Entry point with router setup
│   └── router.tsx       # Route configuration
├── public/              # Static public assets
├── docs/                # Documentation
├── samples/             # Sample data files
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── biome.json           # Biome formatter config
├── eslint.config.js     # ESLint configuration
├── lefthook.yml         # Git hooks configuration
└── package.json         # Dependencies and scripts
```

## Key Dependencies

### Runtime
- `@tanstack/react-query` - Server state management
- `@tanstack/react-form` - Form handling with Zod validation
- `@tanstack/react-table` - Table/grid components
- `lucide-react` - Icon library
- `radix-ui` - Unstyled accessible primitives
- `react-router` - Client-side routing
- `zod` - Schema validation
- `xlsx` - Excel file parsing/export
- `class-variance-authority` - Component variant utilities
- `clsx` + `tailwind-merge` - Class name utilities

### Development
- `@biomejs/biome` - Fast formatter
- `typescript-eslint` - TypeScript ESLint parser
- `babel-plugin-react-compiler` - React Compiler for optimization
- `vitest` - Test framework
- `@faker-js/faker` - Test data generation

## Features

### Class Optimization (`/class-optimize`)

A 4-step wizard for optimizing class assignments:

1. **Data Upload**: Upload Excel files with student data (name, grade, class, number, score)
2. **Rule Configuration**: Set placement rules:
   - `no_together`: Students who cannot be in the same class
   - `separate_1_to_n`: Anchor student must be separated from N other students
   - `same_name_separate`: Students with same name must be in different classes
3. **Result View**: View optimization results with violation warnings
4. **Export**: Download results as Excel file

**Algorithm**: Snake draft distribution + rule-based swap optimization with variance minimization

### Teacher Timetable (`/teacher-timetable`)

- Placeholder page for teacher scheduling functionality (WIP)

### Class Editor (`/class-editor`)

- Placeholder page for manual class editing (WIP)
