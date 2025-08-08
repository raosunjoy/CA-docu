# 🔧 PRE-PROJECT SETTINGS & DEVELOPMENT STANDARDS

**Project**: Zetra  
**Version**: 1.0  
**Last Updated**: August 2025  
**Status**: **🎉 PRODUCTION-READY - Next.js 15 Compatible**

---

## 🚫 **CRITICAL RULE - NO EXCEPTIONS**

**Cannot move to new task without fully meeting ALL criteria below:**
- ✅ 100% Test Coverage
- ✅ 100% Test Passes
- ✅ Zero TypeScript Errors
- ✅ Zero Lint Errors
- ✅ No Function > 75 Lines
- ✅ TDD Process Followed

---

## 1. 🧪 **TEST-DRIVEN DEVELOPMENT (TDD) PROCESS**

### 1.1 Mandatory TDD Workflow
```bash
# STEP 1: Write failing test first
npm run test:watch

# STEP 2: Write minimal code to make test pass
npm run test

# STEP 3: Refactor while keeping tests green
npm run test

# STEP 4: Repeat for each feature/function
```

### 1.2 Testing Requirements
- **100% Test Coverage** - No exceptions
- **100% Test Pass Rate** - All tests must pass
- **Unit Tests**: Every function, component, utility
- **Integration Tests**: API routes, database operations
- **E2E Tests**: Critical user workflows
- **Coverage Tools**: Jest + c8/nyc for coverage reporting

### 1.3 Test File Structure
```
src/
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       ├── Button.test.tsx
│       └── Button.integration.test.tsx
├── utils/
│   ├── validation.ts
│   └── __tests__/
│       └── validation.test.ts
```

---

## 2. 🏗️ **BUILD VALIDATION REQUIREMENTS**

### 2.1 Pre-Development Checks (MANDATORY)
```bash
# Run these commands before starting ANY new feature
npm run build                 # Verify production build works
npm run type-check           # TypeScript compilation check
npm run lint                 # Catch style/syntax issues early
npm run test                 # Ensure all tests pass
```

### 2.2 Required Package.json Scripts
```json
{
  "scripts": {
    "build": "next build",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "pre-commit": "npm run lint && npm run type-check && npm run test && npm run build"
  }
}
```

### 2.3 After Making Changes (MANDATORY)
```bash
npm run test:coverage       # Verify 100% coverage maintained
npm run build              # Verify production build works
npm run type-check         # Check TypeScript compilation
npm run lint               # Verify code style compliance
npm run db:generate        # Update Prisma client after schema changes
```

---

## 3. 📝 **COMPONENT DEVELOPMENT STANDARDS**

### 3.1 Import Validation
- ✅ Verify actual files exist (not just TypeScript declarations)
- ✅ Create missing Shadcn/ui components immediately when referenced
- ✅ Verify all imports resolve in both dev and production modes

### 3.2 Component Structure Requirements
```typescript
// Example: Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium',
          'focus-visible:outline-none focus-visible:ring-2',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'border border-input bg-background hover:bg-accent': variant === 'outline'
          },
          {
            'h-9 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-11 px-8 text-lg': size === 'lg'
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
```

### 3.3 Function Length Requirement
- **Maximum 75 lines per function** - No exceptions
- Break down larger functions into smaller, testable units
- Use composition over large monolithic functions

---

## 4. 🗄️ **DATABASE SCHEMA SYNCHRONIZATION**

### 4.1 Prisma Workflow
```bash
# After any schema changes
npx prisma generate          # Update Prisma client
npx prisma db push          # Push schema to database
npm run test                # Verify all tests still pass
```

### 4.2 Schema Validation
- ✅ Keep Prisma schema synchronized with API route expectations
- ✅ Validate all database fields referenced in code exist in schema
- ✅ Run database migrations in development before production

---

## 5. 🎯 **TYPESCRIPT CONFIGURATION**

### 5.1 Strict Mode Requirements
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 5.2 Zero Error Policy
- **Zero TypeScript errors** - Must resolve all before moving forward
- Use proper typing for all functions, props, and state
- No `any` types unless absolutely necessary with proper justification

---

## 6. 🎨 **LINTING & CODE STYLE**

### 6.1 ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "max-lines-per-function": ["error", 75],
    "complexity": ["error", 10],
    "no-console": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### 6.2 Zero Lint Error Policy
- **Zero lint errors** before committing
- Use `npm run lint:fix` for auto-fixable issues
- Manual fix required for complex violations

---

## 7. 📦 **GIT WORKFLOW STANDARDS**

### 7.1 .gitignore Requirements
```gitignore
# Dependencies
node_modules/
*.pnp
.pnp.js

# Production builds
.next/
out/
dist/
build/

# Distribution binaries (DO NOT COMMIT)
dist-electron/
*.exe
*.dmg
*.AppImage
*.deb
*.rpm

# Environment and secrets
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Testing
coverage/
.nyc_output

# Database
*.db
*.sqlite

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### 7.2 Commit Standards
```bash
# Pre-commit validation (MANDATORY)
npm run pre-commit

# Commit message format
git commit -m "feat: add user authentication module

- Implement JWT token validation
- Add password hashing utility
- Create user login/logout flows
- Add comprehensive test coverage (100%)

Tests: ✅ 247/247 passing
Coverage: ✅ 100%
TypeScript: ✅ 0 errors
Lint: ✅ 0 errors"
```

### 7.3 GitHub File Size Limits
- ✅ Test changes can be pushed without hitting GitHub limits
- ✅ Commit source code and configurations, NOT distribution binaries
- ✅ Use Git LFS for large assets if necessary

---

## 8. 🔄 **QUALITY GATES CHECKLIST**

### 8.1 Before Starting New Feature
- [ ] `npm run build` ✅ Passes
- [ ] `npm run type-check` ✅ Zero errors
- [ ] `npm run lint` ✅ Zero errors
- [ ] `npm run test` ✅ All tests pass

### 8.2 During Development (Per Function/Component)
- [ ] Write failing test first (TDD)
- [ ] Implement minimal code to pass test
- [ ] Refactor while keeping tests green
- [ ] Function ≤ 75 lines
- [ ] 100% test coverage for new code

### 8.3 Before Committing
- [ ] `npm run test:coverage` ✅ 100% coverage
- [ ] `npm run build` ✅ Production build works
- [ ] `npm run type-check` ✅ Zero TypeScript errors
- [ ] `npm run lint` ✅ Zero lint errors
- [ ] All tests pass ✅
- [ ] Code review checklist completed

### 8.4 Before Moving to Next Task
- [ ] All quality gates above ✅
- [ ] Documentation updated
- [ ] Integration tests pass
- [ ] Feature demo-ready

---

## 9. 🛠️ **DEVELOPMENT ENVIRONMENT SETUP**

### 9.1 Required Tools
```bash
# Node.js version
node --version  # v18+ required

# Package manager
npm --version   # v8+ required

# Database
# PostgreSQL 14+ for production
# SQLite for development/testing

# Testing
# Jest for unit/integration tests
# Playwright for E2E tests
```

### 9.2 IDE Configuration
- **VS Code Extensions Required**:
  - TypeScript Importer
  - ESLint
  - Prettier
  - Jest Runner
  - Prisma
  - Tailwind CSS IntelliSense

### 9.3 Pre-commit Hooks Setup
```bash
# Install husky for git hooks
npm install --save-dev husky

# Set up pre-commit hook
npx husky add .husky/pre-commit "npm run pre-commit"
```

---

## 10. 📊 **MONITORING & METRICS**

### 10.1 Code Quality Metrics
- **Test Coverage**: Must maintain 100%
- **Cyclomatic Complexity**: Max 10 per function
- **Function Length**: Max 75 lines
- **TypeScript Strict**: 100% compliance
- **Lint Rule Compliance**: 100%

### 10.2 Performance Metrics
- **Build Time**: < 60 seconds for full build
- **Test Execution**: < 30 seconds for full test suite
- **Type Checking**: < 15 seconds
- **Linting**: < 10 seconds

---

## 🚨 **VIOLATION CONSEQUENCES**

**If ANY quality gate fails:**
1. ❌ **STOP** all development immediately
2. 🔧 **FIX** the failing criteria
3. ✅ **VERIFY** all checks pass
4. 🔄 **ONLY THEN** continue development

**No exceptions. No shortcuts. No compromises.**

---

## ✅ **SUCCESS CRITERIA**

**You can proceed to next task ONLY when:**
- ✅ TDD process followed completely
- ✅ 100% test coverage achieved
- ✅ 100% tests passing
- ✅ Zero TypeScript errors
- ✅ Zero lint errors
- ✅ No function exceeds 75 lines
- ✅ Production build successful
- ✅ All quality gates passed

**This document is the source of truth for development standards. Non-negotiable.**