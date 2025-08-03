# 🏗️ Zetra Platform - Detailed Design & Implementation Specification

**Version**: 1.0  
**Date**: August 2025  
**Based on**: PRD-Zetra-Platform.md  
**Status**: Development Ready

---

## 📋 Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database Design & Data Models](#2-database-design--data-models)
3. [API Specifications](#3-api-specifications)
4. [Frontend Component Architecture](#4-frontend-component-architecture)
5. [Security & Compliance Implementation](#5-security--compliance-implementation)
6. [Offline-First Sync Architecture](#6-offline-first-sync-architecture)
7. [Email Integration Design](#7-email-integration-design)
8. [File Management & Sync System](#8-file-management--sync-system)
9. [Role-Based Access Control](#9-role-based-access-control)
10. [Performance & Scalability](#10-performance--scalability)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. 🏗️ System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ZETRA PLATFORM                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend Layer (Cross-Platform)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Flutter   │ │    React    │ │   Mobile    │          │
│  │   Desktop   │ │     Web     │ │    Apps     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  API Gateway & Authentication Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │    Auth     │ │   Rate      │ │   Request   │          │
│  │  Service    │ │  Limiting   │ │  Routing    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Core Application Services                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │    Task     │ │  Document   │ │    Email    │          │
│  │  Service    │ │  Service    │ │  Service    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │    Chat     │ │    Tag      │ │    Sync     │          │
│  │  Service    │ │  Service    │ │  Service    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ PostgreSQL  │ │ ElasticSearch│ │    Redis    │          │
│  │ (Primary)   │ │  (Search)   │ │   (Cache)   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────┐ ┌─────────────┐                          │
│  │   SQLite    │ │  File Store │                          │
│  │ (Offline)   │ │   (S3/DO)   │                          │
│  └─────────────┘ └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

#### Frontend
- **Primary**: Flutter (Desktop + Mobile)
- **Web**: React.js with TypeScript
- **State Management**: Riverpod (Flutter), Zustand (React)
- **UI Components**: Custom design system with Tailwind CSS
- **Offline Storage**: SQLite + Hive (Flutter), IndexedDB (Web)

#### Backend
- **API Server**: Node.js with Express/Fastify
- **Language**: TypeScript
- **ORM**: Prisma
- **Authentication**: Auth0 or custom JWT implementation
- **Email Integration**: Nylas API or Microsoft Graph API
- **File Processing**: Sharp (images), pdf-lib (PDFs)

#### Infrastructure
- **Primary Database**: PostgreSQL 14+
- **Search Engine**: ElasticSearch 8.x
- **Cache**: Redis 7.x
- **File Storage**: AWS S3 or DigitalOcean Spaces
- **Message Queue**: Bull/BullMQ with Redis
- **Monitoring**: OpenTelemetry + Prometheus + Grafana

---

## 2. 🗄️ Database Design & Data Models

### 2.1 Core Entity Relationships

```sql
-- Core User Management
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('partner', 'manager', 'associate', 'intern', 'admin');

-- Tag System (Hierarchical)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    color VARCHAR(7), -- Hex color code
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name, parent_id)
);

-- Task Management
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id) NOT NULL,
    parent_task_id UUID REFERENCES tasks(id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    locked_by UUID REFERENCES users(id),
    estimated_hours INTEGER,
    actual_hours INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'in_review', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Document Management
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id),
    uploaded_by UUID REFERENCES users(id) NOT NULL,
    folder_path VARCHAR(1000),
    metadata JSONB DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Integration
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    external_id VARCHAR(255) UNIQUE NOT NULL, -- Gmail/Outlook message ID
    thread_id VARCHAR(255),
    subject VARCHAR(500),
    from_address VARCHAR(255) NOT NULL,
    to_addresses TEXT[], -- Array of email addresses
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES users(id), -- Owner of the email account
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat System
CREATE TABLE chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type channel_type NOT NULL,
    metadata JSONB DEFAULT '{}', -- task_id, client_id, etc.
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE channel_type AS ENUM ('direct', 'group', 'task', 'client');

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    replied_to UUID REFERENCES chat_messages(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE message_type AS ENUM ('text', 'file', 'task_reference', 'email_reference');

-- Tagging Relationships (Polymorphic)
CREATE TABLE taggings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    taggable_type VARCHAR(50) NOT NULL, -- 'task', 'document', 'email', 'chat_channel'
    taggable_id UUID NOT NULL,
    tagged_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tag_id, taggable_type, taggable_id)
);

-- Audit Trail
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view'
    resource_type VARCHAR(50) NOT NULL, -- 'task', 'document', etc.
    resource_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync Status Tracking
CREATE TABLE sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    sync_version BIGINT DEFAULT 1,
    pending_changes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);
```

### 2.2 Indexes for Performance

```sql
-- User-related indexes
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Task indexes
CREATE INDEX idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Document indexes
CREATE INDEX idx_documents_organization_id ON documents(organization_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_folder_path ON documents(folder_path);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- Tag and tagging indexes
CREATE INDEX idx_tags_organization_id ON tags(organization_id);
CREATE INDEX idx_tags_parent_id ON tags(parent_id);
CREATE INDEX idx_taggings_tag_id ON taggings(tag_id);
CREATE INDEX idx_taggings_taggable ON taggings(taggable_type, taggable_id);

-- Email indexes
CREATE INDEX idx_emails_organization_id ON emails(organization_id);
CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_received_at ON emails(received_at);
CREATE INDEX idx_emails_external_id ON emails(external_id);

-- Chat indexes
CREATE INDEX idx_chat_channels_organization_id ON chat_channels(organization_id);
CREATE INDEX idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Audit trail indexes
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

## 3. 🔌 API Specifications

### 3.1 API Design Principles

- **RESTful Architecture**: Standard HTTP methods with consistent resource naming
- **JSON API Specification**: Consistent response format with metadata
- **Versioning**: URL-based versioning (`/api/v1/`)
- **Authentication**: JWT-based with refresh tokens
- **Rate Limiting**: Per-user and per-organization limits
- **Pagination**: Cursor-based pagination for large datasets

### 3.2 Core API Endpoints

#### Authentication & Users
```typescript
// Authentication
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password

// Users
GET    /api/v1/users                    // List users (admin/manager only)
GET    /api/v1/users/me                 // Current user profile
PUT    /api/v1/users/me                 // Update current user
POST   /api/v1/users                    // Create user (admin only)
PUT    /api/v1/users/:id               // Update user (admin/manager only)
DELETE /api/v1/users/:id               // Deactivate user (admin only)
```

#### Tasks
```typescript
// Task Management
GET    /api/v1/tasks                    // List tasks with filters
POST   /api/v1/tasks                    // Create new task
GET    /api/v1/tasks/:id               // Get task details
PUT    /api/v1/tasks/:id               // Update task
DELETE /api/v1/tasks/:id               // Delete task
POST   /api/v1/tasks/:id/lock          // Lock completed task
POST   /api/v1/tasks/:id/unlock        // Unlock task (admin/partner only)
POST   /api/v1/tasks/:id/assign        // Assign task to user
GET    /api/v1/tasks/:id/history       // Get task activity history
POST   /api/v1/tasks/:id/comments      // Add comment to task
GET    /api/v1/tasks/templates         // Get task templates
```

#### Documents
```typescript
// Document Management
GET    /api/v1/documents               // List documents with filters
POST   /api/v1/documents               // Upload new document
GET    /api/v1/documents/:id          // Get document metadata
PUT    /api/v1/documents/:id          // Update document metadata
DELETE /api/v1/documents/:id          // Delete document
GET    /api/v1/documents/:id/download // Download document file
POST   /api/v1/documents/:id/versions // Create new version
GET    /api/v1/documents/:id/versions // List document versions
POST   /api/v1/documents/batch-upload // Batch upload documents
```

#### Tags
```typescript
// Tag Management
GET    /api/v1/tags                    // List all tags (hierarchical)
POST   /api/v1/tags                    // Create new tag
PUT    /api/v1/tags/:id               // Update tag
DELETE /api/v1/tags/:id               // Delete tag
POST   /api/v1/tags/:id/apply         // Apply tag to resource
DELETE /api/v1/tags/:id/remove        // Remove tag from resource
GET    /api/v1/tags/:id/resources     // Get all resources with tag
```

#### Email Integration
```typescript
// Email Management
GET    /api/v1/emails                  // List emails with filters
GET    /api/v1/emails/:id             // Get email details
POST   /api/v1/emails/:id/convert-to-task // Convert email to task
POST   /api/v1/emails/sync            // Trigger email sync
GET    /api/v1/emails/threads/:id     // Get email thread
POST   /api/v1/emails                 // Send new email
```

#### Chat
```typescript
// Chat System
GET    /api/v1/chat/channels          // List user's channels
POST   /api/v1/chat/channels          // Create new channel
GET    /api/v1/chat/channels/:id      // Get channel details
POST   /api/v1/chat/channels/:id/messages // Send message
GET    /api/v1/chat/channels/:id/messages // Get channel messages
PUT    /api/v1/chat/messages/:id      // Edit message
DELETE /api/v1/chat/messages/:id      // Delete message
```

### 3.3 Request/Response Format

#### Standard Response Format
```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
    timestamp: string;
    requestId: string;
  };
}
```

#### Error Response Codes
```typescript
enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED', 
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SYNC_CONFLICT = 'SYNC_CONFLICT'
}
```

---

## 4. 🖥️ Frontend Component Architecture

### 4.1 Component Hierarchy

```
src/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── DataTable/
│   │   └── LoadingSpinner/
│   ├── layout/
│   │   ├── AppShell/
│   │   ├── Sidebar/
│   │   ├── Header/
│   │   └── NavigationMenu/
│   ├── task/
│   │   ├── TaskBoard/
│   │   ├── TaskCard/
│   │   ├── TaskForm/
│   │   ├── TaskDetails/
│   │   └── TaskTemplates/
│   ├── document/
│   │   ├── DocumentUpload/
│   │   ├── DocumentViewer/
│   │   ├── DocumentList/
│   │   └── FolderTree/
│   ├── email/
│   │   ├── EmailInbox/
│   │   ├── EmailComposer/
│   │   ├── EmailThread/
│   │   └── EmailToTaskConverter/
│   ├── chat/
│   │   ├── ChatWindow/
│   │   ├── MessageList/
│   │   ├── MessageInput/
│   │   └── ChannelList/
│   ├── dashboard/
│   │   ├── DashboardGrid/
│   │   ├── widgets/
│   │   │   ├── TaskSummary/
│   │   │   ├── RecentActivity/
│   │   │   ├── ComplianceStatus/
│   │   │   └── TeamWorkload/
│   └── tags/
│       ├── TagSelector/
│       ├── TagHierarchy/
│       └── TagManager/
├── hooks/
│   ├── useAuth.ts
│   ├── useOfflineSync.ts
│   ├── useWebSocket.ts
│   ├── usePagination.ts
│   └── useLocalStorage.ts
├── stores/
│   ├── authStore.ts
│   ├── taskStore.ts
│   ├── documentStore.ts
│   ├── emailStore.ts
│   ├── chatStore.ts
│   └── syncStore.ts
├── services/
│   ├── api.ts
│   ├── offlineStorage.ts
│   ├── syncService.ts
│   ├── encryptionService.ts
│   └── notificationService.ts
└── utils/
    ├── dateUtils.ts
    ├── validationUtils.ts
    ├── fileUtils.ts
    └── permissionUtils.ts
```

### 4.2 Key Component Specifications

#### TaskBoard Component
```typescript
interface TaskBoardProps {
  userId?: string;
  teamId?: string;
  viewMode: 'kanban' | 'list' | 'calendar';
  filters: TaskFilters;
  onTaskUpdate: (task: Task) => void;
  onTaskCreate: (task: Partial<Task>) => void;
}

interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignedTo?: string[];
  tags?: string[];
  dateRange?: [Date, Date];
}
```

#### DocumentUpload Component
```typescript
interface DocumentUploadProps {
  folderId?: string;
  acceptedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
  onUploadComplete: (documents: Document[]) => void;
  onUploadError: (error: Error) => void;
  showProgress?: boolean;
}
```

#### RoleBasedDashboard Component
```typescript
interface DashboardProps {
  userRole: UserRole;
  customLayout?: DashboardLayout;
  widgets: WidgetConfig[];
  onLayoutChange: (layout: DashboardLayout) => void;
}

interface WidgetConfig {
  id: string;
  type: WidgetType;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
  permissions: UserRole[];
}
```

### 4.3 State Management

#### Task Store (Zustand)
```typescript
interface TaskStore {
  tasks: Task[];
  loading: boolean;
  filters: TaskFilters;
  
  // Actions
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  assignTask: (id: string, userId: string) => Promise<void>;
  lockTask: (id: string) => Promise<void>;
  
  // Selectors
  getTasksByStatus: (status: TaskStatus) => Task[];
  getOverdueTasks: () => Task[];
  getTasksByAssignee: (userId: string) => Task[];
}
```

---

## 5. 🔐 Security & Compliance Implementation

### 5.1 Authentication & Authorization

#### JWT Token Structure
```typescript
interface JWTPayload {
  sub: string;           // User ID
  email: string;
  role: UserRole;
  orgId: string;         // Organization ID
  permissions: string[]; // Fine-grained permissions
  iat: number;          // Issued at
  exp: number;          // Expires at
  deviceId?: string;    // For device tracking
}
```

#### Role-Based Permissions
```typescript
enum Permission {
  // Task permissions
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  TASK_ASSIGN = 'task:assign',
  TASK_LOCK = 'task:lock',
  TASK_UNLOCK = 'task:unlock',
  
  // Document permissions
  DOCUMENT_UPLOAD = 'document:upload',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_UPDATE = 'document:update',
  DOCUMENT_DELETE = 'document:delete',
  DOCUMENT_DOWNLOAD = 'document:download',
  
  // Admin permissions
  USER_MANAGE = 'user:manage',
  ORG_SETTINGS = 'org:settings',
  AUDIT_VIEW = 'audit:view',
  
  // Tag permissions
  TAG_CREATE = 'tag:create',
  TAG_MANAGE = 'tag:manage',
  TAG_APPLY = 'tag:apply'
}

const rolePermissions: Record<UserRole, Permission[]> = {
  intern: [
    Permission.TASK_READ,
    Permission.TASK_UPDATE, // Only assigned tasks
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_UPLOAD,
    Permission.TAG_APPLY
  ],
  associate: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_ASSIGN, // Limited
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_UPDATE,
    Permission.TAG_APPLY,
    Permission.TAG_CREATE
  ],
  manager: [
    ...rolePermissions.associate,
    Permission.TASK_LOCK,
    Permission.TASK_DELETE,
    Permission.DOCUMENT_DELETE,
    Permission.USER_MANAGE, // Limited
    Permission.TAG_MANAGE
  ],
  partner: [
    ...rolePermissions.manager,
    Permission.TASK_UNLOCK,
    Permission.AUDIT_VIEW,
    Permission.ORG_SETTINGS
  ],
  admin: [
    ...Object.values(Permission)
  ]
};
```

### 5.2 Data Encryption

#### Encryption Service
```typescript
class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivation = 'pbkdf2';
  
  async encryptData(data: string, password: string): Promise<EncryptedData> {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = await this.deriveKey(password, salt);
    
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('zetra-platform'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex')
    };
  }
  
  async decryptData(encryptedData: EncryptedData, password: string): Promise<string> {
    const key = await this.deriveKey(password, Buffer.from(encryptedData.salt, 'hex'));
    
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('zetra-platform'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }
}
```

### 5.3 Audit Logging

#### Audit Service
```typescript
class AuditService {
  async logAction(action: AuditAction): Promise<void> {
    const auditLog: AuditLog = {
      id: generateUUID(),
      organizationId: action.organizationId,
      userId: action.userId,
      action: action.type,
      resourceType: action.resourceType,
      resourceId: action.resourceId,
      oldValues: action.oldValues,
      newValues: action.newValues,
      ipAddress: action.ipAddress,
      userAgent: action.userAgent,
      createdAt: new Date()
    };
    
    await this.auditRepository.create(auditLog);
    
    // Also log to external audit system for compliance
    await this.externalAuditLogger.log(auditLog);
  }
  
  async getAuditTrail(
    filters: AuditFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<AuditLog>> {
    return this.auditRepository.findMany({
      where: {
        organizationId: filters.organizationId,
        userId: filters.userId,
        resourceType: filters.resourceType,
        action: filters.action,
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.offset,
      take: pagination.limit
    });
  }
}
```

---

## 6. 🔄 Offline-First Sync Architecture

### 6.1 Sync Strategy Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   OFFLINE-FIRST SYNC                       │
├─────────────────────────────────────────────────────────────┤
│  Local State (SQLite/IndexedDB)                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Tasks     │ │ Documents   │ │    Tags     │          │
│  │   Cache     │ │   Cache     │ │   Cache     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Sync Engine                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │  Change     │ │  Conflict   │ │  Version    │          │
│  │ Detection   │ │ Resolution  │ │  Control    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Cloud State (PostgreSQL)                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Authoritative│ │  Version    │ │   Change    │          │
│  │    Data     │ │  Vectors    │ │    Log      │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Sync Implementation

#### Sync Service
```typescript
class SyncService {
  private syncQueue: SyncOperation[] = [];
  private isOnline = false;
  private lastSyncVersion = 0;
  
  async initialize(): Promise<void> {
    this.setupNetworkListener();
    this.setupPeriodicSync();
    await this.loadPendingChanges();
  }
  
  async syncChanges(): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, reason: 'offline' };
    }
    
    try {
      // 1. Upload local changes
      const uploadResult = await this.uploadLocalChanges();
      
      // 2. Download remote changes
      const downloadResult = await this.downloadRemoteChanges();
      
      // 3. Resolve conflicts
      const conflictResult = await this.resolveConflicts();
      
      return {
        success: true,
        uploaded: uploadResult.count,
        downloaded: downloadResult.count,
        conflicts: conflictResult.resolved
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  private async uploadLocalChanges(): Promise<UploadResult> {
    const pendingChanges = await this.localDB.getPendingChanges();
    const batches = this.createBatches(pendingChanges);
    
    let uploadedCount = 0;
    
    for (const batch of batches) {
      const response = await this.api.uploadChanges(batch);
      
      if (response.success) {
        await this.localDB.markAsSynced(batch.map(c => c.id));
        uploadedCount += batch.length;
      } else {
        // Handle partial failures
        await this.handleUploadErrors(batch, response.errors);
      }
    }
    
    return { count: uploadedCount };
  }
  
  private async downloadRemoteChanges(): Promise<DownloadResult> {
    const lastSync = await this.getLastSyncTimestamp();
    const remoteChanges = await this.api.getChangesSince(lastSync);
    
    for (const change of remoteChanges) {
      await this.applyRemoteChange(change);
    }
    
    await this.setLastSyncTimestamp(Date.now());
    return { count: remoteChanges.length };
  }
  
  private async resolveConflicts(): Promise<ConflictResult> {
    const conflicts = await this.localDB.getConflicts();
    let resolvedCount = 0;
    
    for (const conflict of conflicts) {
      const resolution = await this.conflictResolver.resolve(conflict);
      await this.applyConflictResolution(conflict, resolution);
      resolvedCount++;
    }
    
    return { resolved: resolvedCount };
  }
}
```

#### Conflict Resolution Strategy
```typescript
class ConflictResolver {
  async resolve(conflict: SyncConflict): Promise<ConflictResolution> {
    const { local, remote, resourceType } = conflict;
    
    // Different resolution strategies based on resource type
    switch (resourceType) {
      case 'task':
        return this.resolveTaskConflict(local, remote);
      case 'document':
        return this.resolveDocumentConflict(local, remote);
      case 'tag':
        return this.resolveTagConflict(local, remote);
      default:
        return this.defaultResolution(local, remote);
    }
  }
  
  private resolveTaskConflict(local: Task, remote: Task): ConflictResolution {
    // Task-specific conflict resolution rules
    const resolution: Partial<Task> = {};
    
    // Title: Use the most recent update
    resolution.title = local.updatedAt > remote.updatedAt ? local.title : remote.title;
    
    // Status: Prioritize completed > in_progress > todo
    resolution.status = this.prioritizeStatus(local.status, remote.status);
    
    // Description: Merge if both changed
    if (local.description !== remote.description) {
      resolution.description = this.mergeText(local.description, remote.description);
    }
    
    // Due date: Use the earlier date if both set
    if (local.dueDate && remote.dueDate) {
      resolution.dueDate = new Date(Math.min(local.dueDate.getTime(), remote.dueDate.getTime()));
    }
    
    return {
      strategy: 'merge',
      result: { ...remote, ...resolution },
      requiresUserInput: false
    };
  }
  
  private resolveDocumentConflict(local: Document, remote: Document): ConflictResolution {
    // Documents: Create new version for conflicts
    return {
      strategy: 'version',
      result: {
        ...remote,
        version: Math.max(local.version, remote.version) + 1
      },
      requiresUserInput: false
    };
  }
}
```

---

## 7. 📧 Email Integration Design

### 7.1 Email Service Architecture

```typescript
class EmailService {
  private nylas: Nylas;
  private syncInterval = 60000; // 1 minute
  private lastSyncMap = new Map<string, Date>();
  
  async initializeEmailSync(userId: string, accessToken: string): Promise<void> {
    this.nylas.accessToken = accessToken;
    
    // Set up webhook for real-time updates
    await this.setupWebhook(userId);
    
    // Start periodic sync
    this.startPeriodicSync(userId);
  }
  
  async syncEmails(userId: string): Promise<EmailSyncResult> {
    const lastSync = this.lastSyncMap.get(userId) || new Date(0);
    const messages = await this.nylas.messages.list({
      receivedAfter: lastSync,
      limit: 100
    });
    
    const syncedEmails: Email[] = [];
    
    for (const message of messages) {
      const email = await this.processMessage(message, userId);
      syncedEmails.push(email);
      
      // Auto-tag based on sender, subject, content
      await this.autoTagEmail(email);
      
      // Check for potential task conversion
      await this.suggestTaskConversion(email);
    }
    
    this.lastSyncMap.set(userId, new Date());
    
    return {
      synced: syncedEmails.length,
      emails: syncedEmails
    };
  }
  
  async convertEmailToTask(emailId: string, taskData: Partial<Task>): Promise<Task> {
    const email = await this.emailRepository.findById(emailId);
    
    const task = await this.taskService.createTask({
      title: taskData.title || `Follow up: ${email.subject}`,
      description: this.extractTaskDescription(email),
      priority: this.inferPriority(email),
      metadata: {
        sourceEmail: emailId,
        fromAddress: email.fromAddress
      },
      ...taskData
    });
    
    // Link email to task
    await this.tagService.applyTag(email.id, 'email', task.id);
    
    return task;
  }
  
  private async autoTagEmail(email: Email): Promise<void> {
    // Extract potential client name from email address or content
    const clientTag = await this.inferClientTag(email);
    if (clientTag) {
      await this.tagService.applyTag(clientTag.id, 'email', email.id);
    }
    
    // Tag based on email content analysis
    const contentTags = await this.analyzeEmailContent(email);
    for (const tag of contentTags) {
      await this.tagService.applyTag(tag.id, 'email', email.id);
    }
  }
  
  private async suggestTaskConversion(email: Email): Promise<void> {
    // Use AI/ML to identify actionable emails
    const isActionable = await this.isEmailActionable(email);
    
    if (isActionable) {
      await this.notificationService.notify({
        userId: email.userId,
        type: 'email_task_suggestion',
        data: {
          emailId: email.id,
          suggestedTitle: this.extractActionItems(email.bodyText)[0],
          confidence: isActionable.confidence
        }
      });
    }
  }
}
```

### 7.2 Email-to-Task Conversion

```typescript
interface TaskExtractionResult {
  title: string;
  actionItems: string[];
  priority: TaskPriority;
  dueDate?: Date;
  assignedTo?: string;
  tags: string[];
}

class EmailTaskExtractor {
  async extractTaskFromEmail(email: Email): Promise<TaskExtractionResult> {
    const content = email.bodyText || email.bodyHtml;
    
    // Extract action items using NLP
    const actionItems = this.extractActionItems(content);
    
    // Infer priority from keywords and sender
    const priority = this.inferPriority(email, content);
    
    // Extract due date from content
    const dueDate = this.extractDueDate(content);
    
    // Suggest assignee based on email content and org structure
    const assignedTo = await this.suggestAssignee(email, content);
    
    // Generate relevant tags
    const tags = await this.generateTags(email, content);
    
    return {
      title: actionItems[0] || `Follow up: ${email.subject}`,
      actionItems,
      priority,
      dueDate,
      assignedTo,
      tags
    };
  }
  
  private extractActionItems(content: string): string[] {
    const actionPatterns = [
      /(?:please|kindly|need to|must|should|required to)\s+([^.!?]+)/gi,
      /(?:action item|todo|task):\s*([^.!?\n]+)/gi,
      /(?:by|before|until)\s+\w+\s+\d+/gi
    ];
    
    const actionItems: string[] = [];
    
    for (const pattern of actionPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        actionItems.push(match[1]?.trim());
      }
    }
    
    return actionItems.filter(item => item && item.length > 5);
  }
  
  private inferPriority(email: Email, content: string): TaskPriority {
    const urgentKeywords = ['urgent', 'asap', 'immediate', 'priority', 'critical'];
    const highKeywords = ['important', 'deadline', 'due date'];
    
    const hasUrgent = urgentKeywords.some(keyword => 
      content.toLowerCase().includes(keyword) || 
      email.subject.toLowerCase().includes(keyword)
    );
    
    const hasHigh = highKeywords.some(keyword => 
      content.toLowerCase().includes(keyword) || 
      email.subject.toLowerCase().includes(keyword)
    );
    
    if (hasUrgent) return 'urgent';
    if (hasHigh) return 'high';
    return 'medium';
  }
  
  private extractDueDate(content: string): Date | undefined {
    const datePatterns = [
      /(?:by|before|until|due)\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
      /(?:by|before|until|due)\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /(?:by|before|until|due)\s+(tomorrow|today|next week|this week)/gi
    ];
    
    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        const dateStr = match[1];
        const parsedDate = this.parseNaturalDate(dateStr);
        if (parsedDate && parsedDate > new Date()) {
          return parsedDate;
        }
      }
    }
    
    return undefined;
  }
}
```

---

## 8. 📁 File Management & Sync System

### 8.1 File Sync Architecture

```typescript
class FileSyncService {
  private watchedFolders = new Map<string, FSWatcher>();
  private syncQueue = new Queue<FileSyncOperation>();
  private cloudStorage: CloudStorageProvider;
  
  async initializeSync(userId: string, syncFolders: string[]): Promise<void> {
    for (const folder of syncFolders) {
      await this.watchFolder(folder, userId);
    }
    
    // Start sync queue processor
    this.processSyncQueue();
    
    // Initial sync of existing files
    await this.performInitialSync(userId, syncFolders);
  }
  
  private async watchFolder(folderPath: string, userId: string): Promise<void> {
    const watcher = fs.watch(folderPath, { recursive: true }, (eventType, filename) => {
      if (filename) {
        this.queueFileSync({
          type: eventType as 'change' | 'rename',
          filePath: path.join(folderPath, filename),
          userId
        });
      }
    });
    
    this.watchedFolders.set(folderPath, watcher);
  }
  
  private queueFileSync(operation: FileSyncOperation): void {
    // Debounce rapid file changes
    const debounceKey = `${operation.filePath}-${operation.type}`;
    
    clearTimeout(this.debounceTimers.get(debounceKey));
    this.debounceTimers.set(debounceKey, setTimeout(() => {
      this.syncQueue.add(operation);
    }, 1000));
  }
  
  private async processSyncQueue(): Promise<void> {
    this.syncQueue.process(async (job) => {
      const operation = job.data;
      await this.syncFile(operation);
    });
  }
  
  private async syncFile(operation: FileSyncOperation): Promise<void> {
    const { filePath, userId, type } = operation;
    
    try {
      if (type === 'change') {
        await this.uploadFile(filePath, userId);
      } else if (type === 'rename') {
        const exists = await fs.pathExists(filePath);
        if (exists) {
          await this.uploadFile(filePath, userId);
        } else {
          await this.deleteFile(filePath, userId);
        }
      }
    } catch (error) {
      console.error(`File sync failed for ${filePath}:`, error);
      
      // Retry with exponential backoff
      await this.retryFileSync(operation);
    }
  }
  
  private async uploadFile(filePath: string, userId: string): Promise<void> {
    const stats = await fs.stat(filePath);
    const fileHash = await this.calculateFileHash(filePath);
    
    // Check if file already exists with same hash
    const existingDoc = await this.documentRepository.findByHash(fileHash);
    if (existingDoc) {
      return; // File unchanged
    }
    
    // Upload to cloud storage
    const cloudPath = await this.cloudStorage.upload(filePath, {
      userId,
      encryption: true,
      metadata: {
        originalPath: filePath,
        size: stats.size,
        hash: fileHash
      }
    });
    
    // Create document record
    await this.documentRepository.create({
      name: path.basename(filePath),
      filePath: cloudPath,
      fileSize: stats.size,
      mimeType: this.getMimeType(filePath),
      uploadedBy: userId,
      folderPath: path.dirname(filePath),
      metadata: {
        hash: fileHash,
        syncedAt: new Date()
      }
    });
  }
  
  private async calculateFileHash(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
```

### 8.2 Conflict Resolution for Files

```typescript
class FileConflictResolver {
  async resolveFileConflict(conflict: FileConflict): Promise<FileResolution> {
    const { localFile, remoteFile, conflictType } = conflict;
    
    switch (conflictType) {
      case 'version_conflict':
        return this.resolveVersionConflict(localFile, remoteFile);
      case 'deletion_conflict':
        return this.resolveDeletionConflict(localFile, remoteFile);
      case 'name_conflict':
        return this.resolveNameConflict(localFile, remoteFile);
      default:
        return this.createUserChoice(conflict);
    }
  }
  
  private async resolveVersionConflict(
    local: FileVersion, 
    remote: FileVersion
  ): Promise<FileResolution> {
    // Compare modification times
    if (local.modifiedAt > remote.modifiedAt) {
      // Local is newer, upload as new version
      const newVersion = await this.createNewVersion(local, remote.version + 1);
      return {
        strategy: 'new_version',
        result: newVersion,
        action: 'upload'
      };
    } else {
      // Remote is newer, download and create conflict copy
      const conflictCopy = await this.createConflictCopy(local);
      return {
        strategy: 'conflict_copy',
        result: remote,
        action: 'download',
        conflictCopy
      };
    }
  }
  
  private async createConflictCopy(file: FileVersion): Promise<string> {
    const ext = path.extname(file.name);
    const basename = path.basename(file.name, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const conflictName = `${basename} (Conflict ${timestamp})${ext}`;
    const conflictPath = path.join(path.dirname(file.path), conflictName);
    
    await fs.copy(file.path, conflictPath);
    return conflictPath;
  }
}
```

---

## 9. 👥 Role-Based Access Control

### 9.1 Permission System Implementation

```typescript
class PermissionService {
  private roleHierarchy: Record<UserRole, UserRole[]> = {
    intern: [],
    associate: ['intern'],
    manager: ['associate', 'intern'],
    partner: ['manager', 'associate', 'intern'],
    admin: ['partner', 'manager', 'associate', 'intern']
  };
  
  async checkPermission(
    userId: string, 
    permission: Permission, 
    resourceId?: string
  ): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    
    // Check role-based permissions
    const hasRolePermission = this.hasRolePermission(user.role, permission);
    if (!hasRolePermission) return false;
    
    // Check resource-specific permissions
    if (resourceId) {
      return this.checkResourcePermission(user, permission, resourceId);
    }
    
    return true;
  }
  
  private hasRolePermission(role: UserRole, permission: Permission): boolean {
    const permissions = rolePermissions[role];
    return permissions.includes(permission);
  }
  
  private async checkResourcePermission(
    user: User, 
    permission: Permission, 
    resourceId: string
  ): Promise<boolean> {
    // Get resource type from permission
    const [resourceType] = permission.split(':');
    
    switch (resourceType) {
      case 'task':
        return this.checkTaskPermission(user, permission, resourceId);
      case 'document':
        return this.checkDocumentPermission(user, permission, resourceId);
      default:
        return true;
    }
  }
  
  private async checkTaskPermission(
    user: User, 
    permission: Permission, 
    taskId: string
  ): Promise<boolean> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) return false;
    
    // Task creator can always update their own tasks
    if (task.createdBy === user.id && permission === Permission.TASK_UPDATE) {
      return true;
    }
    
    // Assigned user can update assigned tasks
    if (task.assignedTo === user.id && permission === Permission.TASK_UPDATE) {
      return true;
    }
    
    // Managers can manage tasks in their organization
    if (user.role === 'manager' || user.role === 'partner') {
      return task.organizationId === user.organizationId;
    }
    
    // Interns can only view/update assigned tasks
    if (user.role === 'intern') {
      return task.assignedTo === user.id && 
             [Permission.TASK_READ, Permission.TASK_UPDATE].includes(permission);
    }
    
    return false;
  }
  
  async getAccessibleResources(
    userId: string, 
    resourceType: string
  ): Promise<AccessFilter> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    
    switch (user.role) {
      case 'partner':
      case 'admin':
        // Full access to organization resources
        return { organizationId: user.organizationId };
        
      case 'manager':
        // Access to team resources + own resources
        const teamMembers = await this.getTeamMembers(userId);
        return {
          organizationId: user.organizationId,
          OR: [
            { createdBy: userId },
            { assignedTo: userId },
            { createdBy: { in: teamMembers.map(m => m.id) } },
            { assignedTo: { in: teamMembers.map(m => m.id) } }
          ]
        };
        
      case 'associate':
        // Access to own resources + shared resources
        return {
          organizationId: user.organizationId,
          OR: [
            { createdBy: userId },
            { assignedTo: userId },
            { isPublic: true }
          ]
        };
        
      case 'intern':
        // Access only to assigned resources
        return {
          organizationId: user.organizationId,
          assignedTo: userId
        };
        
      default:
        throw new Error('Invalid user role');
    }
  }
}
```

### 9.2 Tag-Based Access Control

```typescript
class TagAccessControl {
  async checkTagAccess(userId: string, tagId: string, action: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    const tag = await this.tagRepository.findById(tagId);
    
    if (!user || !tag) return false;
    
    // Check organization membership
    if (user.organizationId !== tag.organizationId) return false;
    
    // Check tag-specific access rules
    const tagAccess = await this.getTagAccessRules(tagId);
    
    return this.evaluateTagAccess(user, tagAccess, action);
  }
  
  private async getTagAccessRules(tagId: string): Promise<TagAccessRule[]> {
    // Get inherited access rules from parent tags
    const tag = await this.tagRepository.findWithParents(tagId);
    const allRules: TagAccessRule[] = [];
    
    // Collect rules from tag hierarchy (child rules override parent rules)
    for (const tagInHierarchy of tag.hierarchy) {
      const rules = await this.tagAccessRepository.findByTagId(tagInHierarchy.id);
      allRules.push(...rules);
    }
    
    return this.mergeAccessRules(allRules);
  }
  
  async getAccessibleTags(userId: string): Promise<Tag[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) return [];
    
    const allTags = await this.tagRepository.findByOrganization(user.organizationId);
    const accessibleTags: Tag[] = [];
    
    for (const tag of allTags) {
      const hasAccess = await this.checkTagAccess(userId, tag.id, 'read');
      if (hasAccess) {
        accessibleTags.push(tag);
      }
    }
    
    return accessibleTags;
  }
  
  async filterResourcesByTagAccess(
    userId: string, 
    resources: any[], 
    resourceType: string
  ): Promise<any[]> {
    const accessibleTags = await this.getAccessibleTags(userId);
    const accessibleTagIds = new Set(accessibleTags.map(t => t.id));
    
    const filteredResources: any[] = [];
    
    for (const resource of resources) {
      const resourceTags = await this.getResourceTags(resource.id, resourceType);
      
      // If resource has no tags, apply default access rules
      if (resourceTags.length === 0) {
        const hasDefaultAccess = await this.checkDefaultAccess(userId, resource);
        if (hasDefaultAccess) {
          filteredResources.push(resource);
        }
        continue;
      }
      
      // Check if user has access to any of the resource's tags
      const hasTagAccess = resourceTags.some(tag => accessibleTagIds.has(tag.id));
      if (hasTagAccess) {
        filteredResources.push(resource);
      }
    }
    
    return filteredResources;
  }
}
```

---

## 10. ⚡ Performance & Scalability

### 10.1 Caching Strategy

```typescript
class CacheService {
  private redis: Redis;
  private localCache = new Map<string, CacheEntry>();
  
  async get<T>(key: string): Promise<T | null> {
    // Check local cache first (fastest)
    const localEntry = this.localCache.get(key);
    if (localEntry && !this.isExpired(localEntry)) {
      return localEntry.value as T;
    }
    
    // Check Redis cache
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      const parsed = JSON.parse(redisValue) as T;
      
      // Update local cache
      this.setLocal(key, parsed, 300); // 5 minutes local TTL
      
      return parsed;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl = 3600): Promise<void> {
    // Set in Redis with TTL
    await this.redis.setex(key, ttl, JSON.stringify(value));
    
    // Set in local cache with shorter TTL
    this.setLocal(key, value, Math.min(ttl, 300));
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    // Invalidate Redis keys
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    // Invalidate local cache
    for (const [key] of this.localCache) {
      if (this.matchesPattern(key, pattern)) {
        this.localCache.delete(key);
      }
    }
  }
  
  // Cache strategies for different data types
  async cacheUserPermissions(userId: string, permissions: Permission[]): Promise<void> {
    const key = `permissions:${userId}`;
    await this.set(key, permissions, 1800); // 30 minutes
  }
  
  async cacheTaskList(filters: TaskFilters, tasks: Task[]): Promise<void> {
    const key = `tasks:${this.hashFilters(filters)}`;
    await this.set(key, tasks, 300); // 5 minutes
  }
  
  async cacheDocumentMetadata(documentId: string, metadata: DocumentMetadata): Promise<void> {
    const key = `document:${documentId}`;
    await this.set(key, metadata, 3600); // 1 hour
  }
}
```

### 10.2 Database Optimization

```typescript
class QueryOptimizer {
  // Optimized task queries with proper indexing
  async getTasksByUser(
    userId: string, 
    filters: TaskFilters, 
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<Task>> {
    const query = this.prisma.task.findMany({
      where: {
        OR: [
          { assignedTo: userId },
          { createdBy: userId }
        ],
        status: filters.status ? { in: filters.status } : undefined,
        priority: filters.priority ? { in: filters.priority } : undefined,
        dueDate: filters.dateRange ? {
          gte: filters.dateRange[0],
          lte: filters.dateRange[1]
        } : undefined,
        tags: filters.tags ? {
          some: {
            tag: {
              id: { in: filters.tags }
            }
          }
        } : undefined
      },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true }
        },
        tags: {
          include: {
            tag: true
          }
        },
        _count: {
          select: {
            comments: true,
            attachments: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      skip: pagination.offset,
      take: pagination.limit
    });
    
    return this.executePaginatedQuery(query, pagination);
  }
  
  // Bulk operations for better performance
  async bulkUpdateTasks(updates: TaskUpdate[]): Promise<void> {
    const transaction = await this.prisma.$transaction(
      updates.map(update => 
        this.prisma.task.update({
          where: { id: update.id },
          data: update.data
        })
      )
    );
    
    // Invalidate relevant caches
    const affectedUsers = new Set(updates.map(u => u.data.assignedTo).filter(Boolean));
    for (const userId of affectedUsers) {
      await this.cacheService.invalidatePattern(`tasks:*${userId}*`);
    }
  }
  
  // Efficient tag-based queries
  async getResourcesByTag(
    tagId: string, 
    resourceTypes: string[] = ['task', 'document', 'email']
  ): Promise<TaggedResource[]> {
    const results: TaggedResource[] = [];
    
    // Use Promise.all for parallel queries
    const queries = resourceTypes.map(async (type) => {
      switch (type) {
        case 'task':
          return this.prisma.tagging.findMany({
            where: { 
              tagId, 
              taggableType: 'task' 
            },
            include: {
              task: {
                include: {
                  assignedUser: true,
                  createdByUser: true
                }
              }
            }
          });
        case 'document':
          return this.prisma.tagging.findMany({
            where: { 
              tagId, 
              taggableType: 'document' 
            },
            include: {
              document: {
                include: {
                  uploadedByUser: true
                }
              }
            }
          });
        // Add other resource types...
      }
    });
    
    const queryResults = await Promise.all(queries);
    
    // Flatten and format results
    for (const result of queryResults.flat()) {
      if (result) {
        results.push(this.formatTaggedResource(result));
      }
    }
    
    return results;
  }
}
```

### 10.3 Real-time Updates

```typescript
class RealtimeService {
  private io: SocketIOServer;
  private userSockets = new Map<string, string[]>(); // userId -> socketIds
  
  async initialize(server: HttpServer): Promise<void> {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
      }
    });
    
    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }
  
  private async authenticateSocket(socket: Socket, next: Function): Promise<void> {
    try {
      const token = socket.handshake.auth.token;
      const user = await this.authService.verifyToken(token);
      
      socket.userId = user.id;
      socket.organizationId = user.organizationId;
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  }
  
  private handleConnection(socket: Socket): void {
    const userId = socket.userId;
    
    // Track user's sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId)!.push(socket.id);
    
    // Join organization room
    socket.join(`org:${socket.organizationId}`);
    
    // Join user-specific room
    socket.join(`user:${userId}`);
    
    // Handle subscriptions
    socket.on('subscribe:tasks', (filters) => {
      socket.join(`tasks:${this.hashFilters(filters)}`);
    });
    
    socket.on('subscribe:chat', (channelId) => {
      socket.join(`chat:${channelId}`);
    });
    
    socket.on('disconnect', () => {
      this.removeUserSocket(userId, socket.id);
    });
  }
  
  // Broadcast methods
  async notifyTaskUpdate(task: Task): Promise<void> {
    // Notify assigned user
    if (task.assignedTo) {
      this.io.to(`user:${task.assignedTo}`).emit('task:updated', task);
    }
    
    // Notify creator
    if (task.createdBy !== task.assignedTo) {
      this.io.to(`user:${task.createdBy}`).emit('task:updated', task);
    }
    
    // Notify organization (for managers/partners)
    this.io.to(`org:${task.organizationId}`).emit('task:organization_update', {
      taskId: task.id,
      status: task.status,
      assignedTo: task.assignedTo
    });
  }
  
  async notifyDocumentUpload(document: Document): Promise<void> {
    // Notify based on folder access permissions
    const accessibleUsers = await this.getDocumentAccessUsers(document);
    
    for (const userId of accessibleUsers) {
      this.io.to(`user:${userId}`).emit('document:uploaded', document);
    }
  }
  
  async notifyNewMessage(message: ChatMessage, channelId: string): Promise<void> {
    this.io.to(`chat:${channelId}`).emit('message:new', message);
  }
  
  async notifySync(userId: string, syncResult: SyncResult): Promise<void> {
    this.io.to(`user:${userId}`).emit('sync:completed', syncResult);
  }
}
```

---

## 11. 🚀 Deployment Architecture

### 11.1 Infrastructure Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Main Application
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/zetra
      - REDIS_URL=redis://redis:6379
      - ELASTICSEARCH_URL=http://elasticsearch:9200
    depends_on:
      - postgres
      - redis
      - elasticsearch
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  # Database
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=zetra
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  # Cache & Session Store
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # Search Engine
  elasticsearch:
    image: elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    restart: unless-stopped

  # File Storage Proxy
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=admin
      - MINIO_ROOT_PASSWORD=admin123
    volumes:
      - minio_data:/data
    restart: unless-stopped

  # Background Jobs
  worker:
    build: .
    command: npm run worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/zetra
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  # Monitoring
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
  minio_data:
  prometheus_data:
  grafana_data:
```

### 11.2 Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zetra-app
  labels:
    app: zetra
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zetra
  template:
    metadata:
      labels:
        app: zetra
    spec:
      containers:
      - name: app
        image: zetra:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: zetra-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: zetra-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: zetra-service
spec:
  selector:
    app: zetra
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: zetra-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - zetra.example.com
    secretName: zetra-tls
  rules:
  - host: zetra.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: zetra-service
            port:
              number: 80
```

### 11.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Zetra

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: zetra_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run type check
      run: npm run type-check
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm run test:coverage
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/zetra_test
    
    - name: Check test coverage
      run: |
        COVERAGE=$(npm run test:coverage:json | grep -o '"total":{"lines":{"pct":[0-9.]*}' | grep -o '[0-9.]*')
        if (( $(echo "$COVERAGE < 100" | bc -l) )); then
          echo "Test coverage is $COVERAGE%, must be 100%"
          exit 1
        fi
    
    - name: Build application
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: |
        docker build -t zetra:${{ github.sha }} .
        docker tag zetra:${{ github.sha }} zetra:latest
    
    - name: Deploy to staging
      run: |
        # Deploy to staging environment
        kubectl set image deployment/zetra-app app=zetra:${{ github.sha }}
        kubectl rollout status deployment/zetra-app
    
    - name: Run integration tests
      run: npm run test:e2e
    
    - name: Deploy to production
      if: success()
      run: |
        # Deploy to production environment
        kubectl config use-context production
        kubectl set image deployment/zetra-app app=zetra:${{ github.sha }}
        kubectl rollout status deployment/zetra-app
```

---

## 12. 📅 Implementation Roadmap

### 12.1 Phase 1: Core Foundation (Months 1-3)

#### Sprint 1-2: Project Setup & Authentication
- [ ] Project initialization with TypeScript, Next.js/Flutter
- [ ] Database schema setup with Prisma
- [ ] Authentication system with JWT
- [ ] Role-based access control implementation
- [ ] Basic user management functionality
- [ ] Unit tests for auth system (100% coverage)

#### Sprint 3-4: Task Management Core
- [ ] Task CRUD operations with proper validation
- [ ] Task status workflow implementation
- [ ] Assignment and delegation functionality
- [ ] Task locking mechanism for completed tasks
- [ ] Basic task dashboard views
- [ ] Unit and integration tests (100% coverage)

#### Sprint 5-6: Tag System & Basic UI
- [ ] Hierarchical tag system implementation
- [ ] Tag application to tasks and documents
- [ ] Tag-based filtering and search
- [ ] Basic responsive UI components
- [ ] Task board (Kanban/List views)
- [ ] Component and integration tests

### 12.2 Phase 2: Document Management & Sync (Months 4-6)

#### Sprint 7-8: Document Management
- [ ] File upload and storage system
- [ ] Document metadata and versioning
- [ ] Folder structure and organization
- [ ] Document preview functionality
- [ ] Basic document search
- [ ] File sync service foundation

#### Sprint 9-10: Offline Sync Engine
- [ ] SQLite offline storage implementation
- [ ] Conflict detection and resolution
- [ ] Sync queue and retry mechanisms
- [ ] Offline-first architecture implementation
- [ ] Sync status indicators and manual sync
- [ ] Comprehensive sync testing

#### Sprint 11-12: Email Integration Foundation
- [ ] Email service provider integration (Nylas/Graph)
- [ ] Basic email sync functionality
- [ ] Email storage and indexing
- [ ] Email-to-task conversion basic workflow
- [ ] Email threading and organization

### 12.3 Phase 3: Advanced Features (Months 7-9)

#### Sprint 13-14: Chat System
- [ ] Real-time messaging infrastructure
- [ ] Channel-based chat organization
- [ ] Message threading and replies
- [ ] File sharing in chat
- [ ] Notification system integration

#### Sprint 15-16: Advanced Email Features
- [ ] Smart email-to-task suggestions
- [ ] Email content analysis and tagging
- [ ] Bi-directional email sync
- [ ] Email composition and sending
- [ ] Advanced email search and filtering

#### Sprint 17-18: Dashboard & Analytics
- [ ] Role-based dashboard widgets
- [ ] Customizable dashboard layouts
- [ ] Basic analytics and reporting
- [ ] Performance metrics tracking
- [ ] Compliance status monitoring

### 12.4 Phase 4: Polish & Production (Months 10-12)

#### Sprint 19-20: UX Enhancement
- [ ] Apple-grade UI polish and animations
- [ ] Accessibility improvements (WCAG 2.1 AA)
- [ ] Mobile app optimization
- [ ] Cross-platform consistency
- [ ] User onboarding flows

#### Sprint 21-22: Performance & Security
- [ ] Performance optimization and caching
- [ ] Security audit and penetration testing
- [ ] Compliance validation (ICAI, SOX)
- [ ] Data encryption implementation
- [ ] Backup and disaster recovery

#### Sprint 23-24: Production Deployment
- [ ] Production infrastructure setup
- [ ] Monitoring and alerting implementation
- [ ] Load testing and capacity planning
- [ ] Documentation and training materials
- [ ] Beta testing with pilot CA firms

### 12.5 Success Metrics & Quality Gates

#### Per Sprint Quality Gates
- [ ] 100% Test Coverage (no exceptions)
- [ ] 100% Test Pass Rate
- [ ] Zero TypeScript Errors
- [ ] Zero Lint Errors
- [ ] No function over 75 lines
- [ ] Performance benchmarks met
- [ ] Security scan passed

#### Phase Completion Criteria
- [ ] All user stories completed and tested
- [ ] Performance requirements met
- [ ] Security requirements validated
- [ ] Documentation updated
- [ ] Stakeholder approval received

#### Production Readiness Checklist
- [ ] Scalability testing completed
- [ ] Disaster recovery plan tested
- [ ] Monitoring and alerting operational
- [ ] Security audit passed
- [ ] Compliance requirements met
- [ ] User training completed
- [ ] Support processes established

---

## 🎯 Conclusion

This comprehensive design and implementation specification provides a detailed roadmap for building the Zetra platform. The architecture prioritizes:

1. **Scalability**: Modular microservices that can scale independently
2. **Security**: End-to-end encryption, role-based access, and comprehensive auditing
3. **Offline-First**: True offline functionality with intelligent sync
4. **Performance**: Optimized queries, caching strategies, and real-time updates
5. **Quality**: 100% test coverage, strict coding standards, and continuous validation

The implementation follows the strict quality gates defined in the pre-project settings, ensuring enterprise-grade reliability and maintainability throughout the development process.

**Next Steps**: Begin Phase 1 implementation with the foundational authentication and task management systems, maintaining the non-negotiable quality standards throughout development.