-- AI Integration Database Schema
-- Add tables for AI data persistence

-- AI Analysis Results
CREATE TABLE IF NOT EXISTS "AIAnalysisResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- 'DOCUMENT_ANALYSIS', 'EMAIL_CATEGORIZATION', 'TASK_SUGGESTION', 'CHAT'
    "inputData" JSONB NOT NULL,
    "outputData" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "processingTime" INTEGER NOT NULL DEFAULT 0,
    "aiModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AI Usage Analytics
CREATE TABLE IF NOT EXISTS "AIUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL, -- '/api/ai/process', '/api/emails/categorize', etc.
    "requestType" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "businessContext" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "tokensUsed" INTEGER DEFAULT 0,
    "processingTime" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Vector Embeddings Cache
CREATE TABLE IF NOT EXISTS "VectorEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentHash" TEXT NOT NULL UNIQUE,
    "content" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[] NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "dimensions" INTEGER NOT NULL DEFAULT 1536,
    "organizationId" TEXT NOT NULL,
    "documentType" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AI-Generated Tasks
CREATE TABLE IF NOT EXISTS "AIGeneratedTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL, -- 'EMAIL', 'DOCUMENT', 'SUGGESTION', 'INSIGHT'
    "sourceId" TEXT,
    "aiAnalysisId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "userAccepted" BOOLEAN,
    "userFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("aiAnalysisId") REFERENCES "AIAnalysisResult"("id")
);

-- AI Email Classifications
CREATE TABLE IF NOT EXISTS "AIEmailClassification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailId" TEXT NOT NULL,
    "categories" JSONB NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "suggestedActions" JSONB NOT NULL DEFAULT '[]',
    "requiresResponse" BOOLEAN NOT NULL DEFAULT false,
    "estimatedResponseTime" TEXT,
    "taskGenerated" BOOLEAN NOT NULL DEFAULT false,
    "taskId" TEXT,
    "aiAnalysisId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("aiAnalysisId") REFERENCES "AIAnalysisResult"("id")
);

-- User AI Preferences
CREATE TABLE IF NOT EXISTS "UserAIPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "organizationId" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "insightLevel" TEXT NOT NULL DEFAULT 'ADVANCED', -- 'BASIC', 'ADVANCED', 'EXPERT'
    "autoTaskGeneration" BOOLEAN NOT NULL DEFAULT true,
    "autoEmailCategorization" BOOLEAN NOT NULL DEFAULT true,
    "notificationPreferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "AIAnalysisResult_userId_type_idx" ON "AIAnalysisResult"("userId", "type");
CREATE INDEX IF NOT EXISTS "AIAnalysisResult_organizationId_createdAt_idx" ON "AIAnalysisResult"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "AIUsageLog_userId_timestamp_idx" ON "AIUsageLog"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "AIUsageLog_organizationId_endpoint_idx" ON "AIUsageLog"("organizationId", "endpoint");
CREATE INDEX IF NOT EXISTS "VectorEmbedding_contentHash_idx" ON "VectorEmbedding"("contentHash");
CREATE INDEX IF NOT EXISTS "VectorEmbedding_organizationId_documentType_idx" ON "VectorEmbedding"("organizationId", "documentType");
CREATE INDEX IF NOT EXISTS "AIGeneratedTask_taskId_idx" ON "AIGeneratedTask"("taskId");
CREATE INDEX IF NOT EXISTS "AIEmailClassification_emailId_idx" ON "AIEmailClassification"("emailId");
CREATE INDEX IF NOT EXISTS "UserAIPreference_userId_idx" ON "UserAIPreference"("userId");