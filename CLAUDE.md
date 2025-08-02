# 🤖 CLAUDE.md - Project Context & Development Standards

This document provides essential context and guidelines for Claude Code when working on the **Zetra** project.

---

## 📋 **PROJECT OVERVIEW**

**Project Name**: Zetra - Unified Productivity Platform for Indian CA Firms  
**Repository**: https://github.com/raosunjoy/CA-docu  
**Status**: Pre-Development Phase  

### **Key Documents to Reference:**
1. **`PRD-Zetra-Platform.md`** - Complete Product Requirements Document
2. **`PRE-PROJECT-SETTINGS.md`** - Development Standards & Quality Gates

---

## 🚨 **CRITICAL DEVELOPMENT RULES - NON-NEGOTIABLE**

> **STOP**: Before starting ANY development task, you MUST ensure ALL criteria below are met:

### **Quality Gates Checklist:**
- ✅ **100% Test Coverage** - Every function must be tested
- ✅ **100% Test Passes** - All tests must pass before proceeding
- ✅ **Zero TypeScript Errors** - No `any` types, proper typing required
- ✅ **Zero Lint Errors** - Code style must be perfect
- ✅ **Max 75 Lines Per Function** - Break down larger functions
- ✅ **TDD Process Followed** - Test first, then code

### **Pre-Development Commands (MANDATORY):**
```bash
# Run these BEFORE starting any new feature
npm run build                 # Verify production build works
npm run type-check           # Check TypeScript compilation
npm run lint                 # Catch style/syntax issues
npm run test                 # Ensure all tests pass
```

### **During Development Commands:**
```bash
npm run test:watch          # TDD workflow - keep tests running
npm run test:coverage       # Verify 100% coverage maintained
npm run db:generate         # After Prisma schema changes
```

### **Before Committing Commands:**
```bash
npm run pre-commit          # Full validation pipeline
npm run test:coverage       # Final coverage check
npm run build              # Final production build test
```

---

## 🏗️ **PROJECT ARCHITECTURE OVERVIEW**

Based on the PRD, this platform includes:

### **Core Modules:**
1. **Task & Workflow Manager** - Proprietary Kanban/List/Calendar system
2. **Document Management** - Local+Cloud sync with versioning
3. **Email Integration** - Bi-directional sync with Gmail/M365
4. **Internal Chat** - Project/task/client-specific communications
5. **Unified Tagging** - Global hierarchical tag system
6. **Role-Based Dashboards** - Partner/Manager/Associate/Intern views
7. **Offline-First Sync** - Encrypted local cache with conflict resolution

### **Target Users:**
- **Partner**: Firm-wide oversight, approvals, strategic insights
- **Manager**: Team coordination, workflow oversight, performance tracking
- **Associate**: Daily task execution, document access, communication
- **Intern**: Limited access, basic workflows, checklists
- **Admin**: System setup, user management, security

### **Technology Stack:**
- **Frontend**: Flutter/React Native (cross-platform)
- **Backend**: Node.js/Go with modular architecture
- **Database**: PostgreSQL (production) + SQLite (offline)
- **File Sync**: Custom daemon with cloud storage
- **Email**: Nylas/EmailEngine integration
- **Search**: ElasticSearch for content + tags

---

## 🧪 **TDD WORKFLOW REQUIREMENTS**

### **Strict TDD Process:**
1. **Red**: Write failing test first
2. **Green**: Write minimal code to make test pass
3. **Refactor**: Improve code while keeping tests green
4. **Repeat**: For every function/component

### **Testing Structure:**
```
src/
├── components/
│   ├── TaskBoard.tsx
│   └── __tests__/
│       ├── TaskBoard.test.tsx
│       └── TaskBoard.integration.test.tsx
├── utils/
│   ├── tagUtils.ts
│   └── __tests__/
│       └── tagUtils.test.ts
├── hooks/
│   ├── useOfflineSync.ts
│   └── __tests__/
│       └── useOfflineSync.test.ts
```

### **Test Categories Required:**
- **Unit Tests**: Individual functions/components
- **Integration Tests**: API routes, database operations
- **E2E Tests**: Complete user workflows
- **Component Tests**: React component behavior
- **Hook Tests**: Custom React hooks

---

## 🎯 **COMPONENT DEVELOPMENT STANDARDS**

### **CA-Specific Components to Build:**
```typescript
// Examples from PRD requirements
- TaskKanbanBoard
- DocumentUploadArea
- EmailToTaskConverter
- TagHierarchySelector
- RoleBasedDashboard
- OfflineSyncIndicator
- ComplianceStatusWidget
- AuditTrailViewer
```

### **Component Structure Requirements:**
```typescript
// Template for new components
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ComponentProps {
  // Proper TypeScript interfaces
}

export const Component = forwardRef<HTMLElement, ComponentProps>(
  ({ className, ...props }, ref) => {
    // Implementation ≤ 75 lines
    return (
      <div className={cn('base-styles', className)} ref={ref} {...props}>
        {/* Component content */}
      </div>
    )
  }
)
Component.displayName = 'Component'
```

### **Import Validation:**
- ✅ Verify Shadcn/ui components exist before importing
- ✅ Create missing components immediately when referenced
- ✅ Test imports in both dev and production modes

---

## 🗄️ **DATABASE & API STANDARDS**

### **Prisma Schema Sync:**
```bash
# After any schema changes
npx prisma generate          # Update client
npx prisma db push          # Apply to database
npm run test                # Verify all tests pass
```

### **API Route Requirements:**
- All routes must have corresponding tests
- Input validation with proper error handling
- Rate limiting and security measures
- Audit logging for compliance

### **CA-Specific Data Models:**
```typescript
// Example models from PRD
- User (Partner/Manager/Associate/Intern roles)
- Task (with workflow states and locks)
- Document (with version control)
- Tag (hierarchical structure)
- Client (CA firm client data)
- AuditLog (compliance tracking)
```

---

## 📊 **QUALITY MONITORING**

### **Metrics to Maintain:**
- **Test Coverage**: 100% (no exceptions)
- **Build Time**: < 60 seconds
- **Test Execution**: < 30 seconds
- **Type Check**: < 15 seconds
- **Lint Check**: < 10 seconds

### **Performance Requirements:**
- **Local Response**: < 1s
- **Sync Resolution**: < 5s
- **Offline Capability**: Full functionality
- **Cross-Platform**: Consistent UX

---

## 🔐 **SECURITY & COMPLIANCE**

### **Security Requirements:**
- AES-256 encryption for offline data
- SSO support with 2FA
- Role-based access controls
- Complete audit trails
- ICAI compliance readiness

### **Data Protection:**
- No secrets in code or logs
- Encrypted sensitive data at rest
- Secure API communication
- Regular security audits

---

## 🚀 **DEVELOPMENT WORKFLOW**

### **Starting New Feature:**
1. Read PRD section relevant to feature
2. Review PRE-PROJECT-SETTINGS requirements
3. Run pre-development commands
4. Write failing tests first (TDD)
5. Implement with quality gates
6. Verify all criteria before commit

### **Git Workflow:**
```bash
# Before any commit
git add .
npm run pre-commit          # Must pass all checks
git commit -m "feat: descriptive message with test/coverage status"
git push origin main
```

### **Commit Message Format:**
```
feat: add task workflow engine

- Implement Kanban board component
- Add task state management
- Create role-based task locking
- Add comprehensive test coverage

Tests: ✅ 156/156 passing
Coverage: ✅ 100%
TypeScript: ✅ 0 errors
Lint: ✅ 0 errors
```

---

## 📚 **HELPFUL COMMANDS**

### **Development:**
```bash
npm run dev                 # Start development server
npm run test:watch         # TDD workflow
npm run db:studio          # Database GUI
npm run lint:fix           # Auto-fix linting issues
```

### **Production Readiness:**
```bash
npm run build              # Production build
npm run start              # Production server
npm run test:e2e           # End-to-end tests
npm run type-check         # TypeScript validation
```

### **Database:**
```bash
npx prisma generate        # Update Prisma client
npx prisma db push         # Push schema changes
npx prisma db pull         # Pull schema from database
npx prisma studio          # GUI for database
```

---

## 🎯 **CA INDUSTRY CONTEXT**

### **Workflow Examples:**
- **GSTR Filing**: Multi-step compliance workflow with approvals
- **Audit Process**: Document collection → review → approval chains
- **Tax Notice Response**: Email → task creation → delegation → tracking
- **Client Onboarding**: Document upload → verification → setup

### **Compliance Requirements:**
- ICAI professional standards
- SOX compliance for public companies
- GSTN regulatory requirements
- ROC filing deadlines

### **User Scenarios:**
- **Intern**: Field work with offline document collection
- **Associate**: Daily task execution with document processing
- **Manager**: Team oversight with bottleneck identification
- **Partner**: Strategic oversight with compliance monitoring

---

## ⚠️ **CRITICAL REMINDERS**

1. **NEVER** proceed without meeting ALL quality gates
2. **ALWAYS** follow TDD - test first, then code
3. **VERIFY** 100% test coverage before any commit
4. **CHECK** that all imports resolve in production build
5. **ENSURE** functions stay under 75 lines
6. **VALIDATE** TypeScript compilation with zero errors
7. **CONFIRM** lint rules pass with zero warnings

---

## 📖 **REFERENCE DOCUMENTS**

- **`PRD-Zetra-Platform.md`**: Complete product specifications
- **`PRE-PROJECT-SETTINGS.md`**: Development standards and quality gates
- **`CLAUDE.md`** (this file): Context and workflow guidance

**Remember**: These standards are NON-NEGOTIABLE. Quality is paramount for Zetra that will handle sensitive financial data and compliance requirements.