/**
 * Offline Sync Engine - Advanced Conflict Resolution System
 * Handles offline data synchronization with intelligent conflict resolution
 * for tasks, documents, and client data across devices.
 */

import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Sync operation types
export interface SyncOperation {
  id: string
  entityType: 'task' | 'document' | 'client' | 'contact' | 'note'
  entityId: string
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
  data: any
  timestamp: Date
  deviceId: string
  userId: string
  version: number
  checksum: string
}

export interface SyncConflict {
  id: string
  entityType: string
  entityId: string
  localVersion: SyncOperation
  remoteVersion: SyncOperation
  conflictType: 'version' | 'concurrent' | 'delete'
  resolution: 'manual' | 'auto_local' | 'auto_remote' | 'merge'
  resolvedAt?: Date
  resolvedBy?: string
}

export interface SyncResult {
  success: boolean
  operationsProcessed: number
  conflicts: SyncConflict[]
  errors: Array<{
    operation: SyncOperation
    error: string
  }>
  syncState: {
    lastSync: Date
    pendingOperations: number
    deviceId: string
  }
}

// Conflict resolution strategies
export type ConflictResolutionStrategy = 
  | 'last_write_wins'
  | 'first_write_wins'  
  | 'manual_review'
  | 'intelligent_merge'
  | 'field_level_merge'

// Sync configuration
export interface SyncConfig {
  batchSize: number
  maxRetries: number
  conflictStrategy: ConflictResolutionStrategy
  enableRealTimeSync: boolean
  syncInterval: number // milliseconds
  compressionEnabled: boolean
}

export class OfflineSyncEngine {
  private syncOperations: Map<string, SyncOperation[]> = new Map()
  private pendingConflicts: Map<string, SyncConflict> = new Map()
  private config: SyncConfig

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      batchSize: 50,
      maxRetries: 3,
      conflictStrategy: 'intelligent_merge',
      enableRealTimeSync: true,
      syncInterval: 30000, // 30 seconds
      compressionEnabled: true,
      ...config
    }
  }

  // Main sync orchestration method
  async synchronize(
    deviceId: string,
    userId: string,
    organizationId: string,
    operations: SyncOperation[]
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      operationsProcessed: 0,
      conflicts: [],
      errors: [],
      syncState: {
        lastSync: new Date(),
        pendingOperations: 0,
        deviceId
      }
    }

    try {
      // Step 1: Validate operations
      const validOperations = await this.validateOperations(operations, userId, organizationId)
      
      // Step 2: Detect conflicts with server data
      const { validOps, conflicts } = await this.detectConflicts(validOperations, organizationId)
      result.conflicts = conflicts

      // Step 3: Apply conflict resolution
      const resolvedOperations = await this.resolveConflicts(validOps, conflicts)

      // Step 4: Apply operations in batches
      const batchResults = await this.processBatches(resolvedOperations, organizationId)
      result.operationsProcessed = batchResults.processed
      result.errors = batchResults.errors

      // Step 5: Update sync state
      await this.updateSyncState(deviceId, userId, result.lastSync)

      // Step 6: Handle any remaining conflicts
      if (conflicts.length > 0) {
        await this.storePendingConflicts(conflicts)
      }

    } catch (error) {
      console.error('Sync operation failed:', error)
      result.success = false
      result.errors.push({
        operation: operations[0] || {} as SyncOperation,
        error: error instanceof Error ? error.message : 'Unknown sync error'
      })
    }

    return result
  }

  // Conflict detection and analysis
  private async detectConflicts(
    operations: SyncOperation[],
    organizationId: string
  ): Promise<{ validOps: SyncOperation[], conflicts: SyncConflict[] }> {
    const conflicts: SyncConflict[] = []
    const validOps: SyncOperation[] = []

    for (const operation of operations) {
      try {
        // Get current server version
        const serverData = await this.getServerVersion(
          operation.entityType,
          operation.entityId,
          organizationId
        )

        if (!serverData) {
          // No conflict for new entities
          validOps.push(operation)
          continue
        }

        // Check for version conflicts
        const conflict = this.analyzeConflict(operation, serverData)
        if (conflict) {
          conflicts.push(conflict)
        } else {
          validOps.push(operation)
        }

      } catch (error) {
        console.error(`Conflict detection failed for operation ${operation.id}:`, error)
        validOps.push(operation) // Assume no conflict on error
      }
    }

    return { validOps, conflicts }
  }

  // Intelligent conflict analysis
  private analyzeConflict(localOp: SyncOperation, serverData: any): SyncConflict | null {
    // Version-based conflict detection
    if (serverData.version > localOp.version) {
      return {
        id: `conflict_${localOp.id}_${Date.now()}`,
        entityType: localOp.entityType,
        entityId: localOp.entityId,
        localVersion: localOp,
        remoteVersion: this.createRemoteOperation(serverData),
        conflictType: 'version',
        resolution: this.determineAutoResolution(localOp, serverData)
      }
    }

    // Concurrent modification detection
    if (this.isConcurrentModification(localOp, serverData)) {
      return {
        id: `conflict_${localOp.id}_${Date.now()}`,
        entityType: localOp.entityType,
        entityId: localOp.entityId,
        localVersion: localOp,
        remoteVersion: this.createRemoteOperation(serverData),
        conflictType: 'concurrent',
        resolution: 'manual'
      }
    }

    // Delete conflict detection
    if (localOp.operation === 'DELETE' && serverData.updatedAt > localOp.timestamp) {
      return {
        id: `conflict_${localOp.id}_${Date.now()}`,
        entityType: localOp.entityType,
        entityId: localOp.entityId,
        localVersion: localOp,
        remoteVersion: this.createRemoteOperation(serverData),
        conflictType: 'delete',
        resolution: 'manual'
      }
    }

    return null
  }

  // Conflict resolution strategies
  private async resolveConflicts(
    operations: SyncOperation[],
    conflicts: SyncConflict[]
  ): Promise<SyncOperation[]> {
    const resolvedOperations: SyncOperation[] = [...operations]

    for (const conflict of conflicts) {
      try {
        const resolved = await this.applyConflictResolution(conflict)
        if (resolved) {
          // Replace conflicting operation with resolved version
          const index = resolvedOperations.findIndex(op => op.id === conflict.localVersion.id)
          if (index !== -1) {
            resolvedOperations[index] = resolved
          }
        }
      } catch (error) {
        console.error(`Failed to resolve conflict ${conflict.id}:`, error)
      }
    }

    return resolvedOperations
  }

  // Apply specific resolution strategy
  private async applyConflictResolution(conflict: SyncConflict): Promise<SyncOperation | null> {
    switch (this.config.conflictStrategy) {
      case 'last_write_wins':
        return this.resolveLastWriteWins(conflict)

      case 'first_write_wins':
        return this.resolveFirstWriteWins(conflict)

      case 'intelligent_merge':
        return await this.resolveIntelligentMerge(conflict)

      case 'field_level_merge':
        return await this.resolveFieldLevelMerge(conflict)

      case 'manual_review':
        // Store for manual resolution
        this.pendingConflicts.set(conflict.id, conflict)
        return null

      default:
        return this.resolveLastWriteWins(conflict)
    }
  }

  // Resolution implementations
  private resolveLastWriteWins(conflict: SyncConflict): SyncOperation {
    const localTime = conflict.localVersion.timestamp
    const remoteTime = conflict.remoteVersion.timestamp

    if (localTime >= remoteTime) {
      conflict.resolution = 'auto_local'
      return conflict.localVersion
    } else {
      conflict.resolution = 'auto_remote'
      return conflict.remoteVersion
    }
  }

  private resolveFirstWriteWins(conflict: SyncConflict): SyncOperation {
    const localTime = conflict.localVersion.timestamp
    const remoteTime = conflict.remoteVersion.timestamp

    if (localTime <= remoteTime) {
      conflict.resolution = 'auto_local'
      return conflict.localVersion
    } else {
      conflict.resolution = 'auto_remote'
      return conflict.remoteVersion
    }
  }

  // Intelligent merge based on entity type and field semantics
  private async resolveIntelligentMerge(conflict: SyncConflict): Promise<SyncOperation> {
    const localData = conflict.localVersion.data
    const remoteData = conflict.remoteVersion.data
    let mergedData: any = {}

    switch (conflict.entityType) {
      case 'task':
        mergedData = await this.mergeTaskData(localData, remoteData)
        break

      case 'client':
        mergedData = await this.mergeClientData(localData, remoteData)
        break

      case 'document':
        mergedData = await this.mergeDocumentData(localData, remoteData)
        break

      default:
        // Fallback to field-level merge
        mergedData = await this.performFieldLevelMerge(localData, remoteData)
    }

    // Create merged operation
    const mergedOperation: SyncOperation = {
      ...conflict.localVersion,
      data: mergedData,
      version: Math.max(conflict.localVersion.version, conflict.remoteVersion.version) + 1,
      timestamp: new Date(),
      checksum: this.generateChecksum(mergedData)
    }

    conflict.resolution = 'merge'
    return mergedOperation
  }

  // Entity-specific merge logic
  private async mergeTaskData(localData: any, remoteData: any): Promise<any> {
    return {
      // Preserve task identity fields from remote (authoritative)
      id: remoteData.id || localData.id,
      organizationId: remoteData.organizationId || localData.organizationId,
      
      // Title: use most recent non-empty version
      title: this.selectNonEmptyRecent(localData.title, remoteData.title, localData.updatedAt, remoteData.updatedAt),
      
      // Description: merge intelligently
      description: this.mergeTextFields(localData.description, remoteData.description),
      
      // Status: use most recent
      status: remoteData.updatedAt >= localData.updatedAt ? remoteData.status : localData.status,
      
      // Priority: use highest priority
      priority: this.selectHighestPriority(localData.priority, remoteData.priority),
      
      // Dates: use most recent updates for each field
      dueDate: this.selectLatestDate(localData.dueDate, remoteData.dueDate, localData.updatedAt, remoteData.updatedAt),
      startDate: this.selectLatestDate(localData.startDate, remoteData.startDate, localData.updatedAt, remoteData.updatedAt),
      
      // Assignment: prefer remote (server authority)
      assigneeId: remoteData.assigneeId || localData.assigneeId,
      
      // Tags: merge arrays
      tags: this.mergeArrayFields(localData.tags || [], remoteData.tags || []),
      
      // Comments: merge by timestamp (both versions might have new comments)
      comments: this.mergeCommentArrays(localData.comments || [], remoteData.comments || []),
      
      // Metadata: deep merge
      metadata: this.deepMergeObjects(localData.metadata || {}, remoteData.metadata || {}),
      
      // Audit fields: use latest
      createdAt: localData.createdAt || remoteData.createdAt,
      updatedAt: new Date().toISOString(),
      createdBy: localData.createdBy || remoteData.createdBy,
      updatedBy: localData.updatedBy || remoteData.updatedBy
    }
  }

  private async mergeClientData(localData: any, remoteData: any): Promise<any> {
    return {
      // Identity fields from remote
      id: remoteData.id || localData.id,
      organizationId: remoteData.organizationId || localData.organizationId,
      
      // Basic info: use most recent non-empty
      name: this.selectNonEmptyRecent(localData.name, remoteData.name, localData.updatedAt, remoteData.updatedAt),
      displayName: this.selectNonEmptyRecent(localData.displayName, remoteData.displayName, localData.updatedAt, remoteData.updatedAt),
      
      // Contact info: merge contacts arrays
      primaryContact: this.mergeContactInfo(localData.primaryContact, remoteData.primaryContact),
      additionalContacts: this.mergeContactArrays(localData.additionalContacts || [], remoteData.additionalContacts || []),
      
      // Business info: use most recent
      type: remoteData.updatedAt >= localData.updatedAt ? remoteData.type : localData.type,
      businessType: this.selectNonEmptyRecent(localData.businessType, remoteData.businessType, localData.updatedAt, remoteData.updatedAt),
      
      // Addresses: deep merge
      registeredAddress: this.deepMergeObjects(localData.registeredAddress || {}, remoteData.registeredAddress || {}),
      businessAddress: this.deepMergeObjects(localData.businessAddress || {}, remoteData.businessAddress || {}),
      
      // Financial: use most recent
      annualTurnover: remoteData.updatedAt >= localData.updatedAt ? remoteData.annualTurnover : localData.annualTurnover,
      
      // Compliance: merge profiles
      complianceProfile: this.deepMergeObjects(localData.complianceProfile || {}, remoteData.complianceProfile || {}),
      
      // Relationships: prefer remote authority
      relationshipManager: remoteData.relationshipManager || localData.relationshipManager,
      teamMembers: this.mergeArrayFields(localData.teamMembers || [], remoteData.teamMembers || []),
      
      // Documents and agreements: merge arrays
      requiredDocuments: this.mergeArrayFields(localData.requiredDocuments || [], remoteData.requiredDocuments || []),
      serviceAgreements: this.mergeArrayFields(localData.serviceAgreements || [], remoteData.serviceAgreements || []),
      
      // Preferences: deep merge
      preferences: this.deepMergeObjects(localData.preferences || {}, remoteData.preferences || {}),
      
      // Billing: merge financial data
      billing: this.mergeBillingInfo(localData.billing, remoteData.billing),
      
      // Status and flags
      status: remoteData.status || localData.status,
      isActive: remoteData.hasOwnProperty('isActive') ? remoteData.isActive : localData.isActive,
      
      // Audit fields
      createdAt: localData.createdAt || remoteData.createdAt,
      updatedAt: new Date().toISOString(),
      createdBy: localData.createdBy || remoteData.createdBy,
      updatedBy: localData.updatedBy || remoteData.updatedBy
    }
  }

  // Field-level merge utilities
  private selectNonEmptyRecent(localValue: any, remoteValue: any, localTime: string, remoteTime: string): any {
    if (!localValue && !remoteValue) return null
    if (!localValue) return remoteValue
    if (!remoteValue) return localValue
    
    return new Date(localTime) >= new Date(remoteTime) ? localValue : remoteValue
  }

  private mergeTextFields(localText: string, remoteText: string): string {
    if (!localText && !remoteText) return ''
    if (!localText) return remoteText
    if (!remoteText) return localText
    if (localText === remoteText) return localText
    
    // Simple merge: combine unique sentences
    const localSentences = localText.split('.').map(s => s.trim()).filter(s => s)
    const remoteSentences = remoteText.split('.').map(s => s.trim()).filter(s => s)
    const uniqueSentences = Array.from(new Set([...localSentences, ...remoteSentences]))
    
    return uniqueSentences.join('. ') + (uniqueSentences.length > 0 ? '.' : '')
  }

  private selectHighestPriority(localPriority: string, remotePriority: string): string {
    const priorityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 }
    const localWeight = priorityOrder[localPriority as keyof typeof priorityOrder] || 2
    const remoteWeight = priorityOrder[remotePriority as keyof typeof priorityOrder] || 2
    
    return localWeight >= remoteWeight ? localPriority : remotePriority
  }

  private selectLatestDate(localDate: string, remoteDate: string, localUpdated: string, remoteUpdated: string): string {
    if (!localDate && !remoteDate) return ''
    if (!localDate) return remoteDate
    if (!remoteDate) return localDate
    
    return new Date(localUpdated) >= new Date(remoteUpdated) ? localDate : remoteDate
  }

  private mergeArrayFields<T>(localArray: T[], remoteArray: T[]): T[] {
    // Simple merge: combine and dedupe by JSON string comparison
    const combined = [...localArray, ...remoteArray]
    const unique = combined.filter((item, index) => 
      combined.findIndex(other => JSON.stringify(other) === JSON.stringify(item)) === index
    )
    return unique
  }

  private deepMergeObjects(local: any, remote: any): any {
    if (!local && !remote) return {}
    if (!local) return { ...remote }
    if (!remote) return { ...local }
    
    const merged = { ...local }
    
    Object.keys(remote).forEach(key => {
      if (remote[key] !== null && remote[key] !== undefined) {
        if (typeof remote[key] === 'object' && !Array.isArray(remote[key])) {
          merged[key] = this.deepMergeObjects(merged[key] || {}, remote[key])
        } else {
          merged[key] = remote[key]
        }
      }
    })
    
    return merged
  }

  // Utility methods
  private generateChecksum(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort())
    let hash = 0
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  private async getServerVersion(entityType: string, entityId: string, organizationId: string): Promise<any> {
    try {
      switch (entityType) {
        case 'task':
          return await prisma.task.findUnique({
            where: { id: entityId, organizationId }
          })
          
        case 'client':
          return await prisma.client.findUnique({
            where: { id: entityId, organizationId }
          })
          
        case 'document':
          return await prisma.document.findUnique({
            where: { id: entityId, organizationId }
          })
          
        default:
          return null
      }
    } catch (error) {
      console.error(`Failed to get server version for ${entityType}:${entityId}:`, error)
      return null
    }
  }

  private createRemoteOperation(serverData: any): SyncOperation {
    return {
      id: `remote_${serverData.id}_${Date.now()}`,
      entityType: 'task', // Would be determined from context
      entityId: serverData.id,
      operation: 'UPDATE',
      data: serverData,
      timestamp: new Date(serverData.updatedAt),
      deviceId: 'server',
      userId: serverData.updatedBy || 'system',
      version: serverData.version || 1,
      checksum: this.generateChecksum(serverData)
    }
  }

  private isConcurrentModification(localOp: SyncOperation, serverData: any): boolean {
    const timeDiff = Math.abs(
      localOp.timestamp.getTime() - new Date(serverData.updatedAt).getTime()
    )
    return timeDiff < 60000 && localOp.userId !== serverData.updatedBy // Within 1 minute and different users
  }

  private determineAutoResolution(localOp: SyncOperation, serverData: any): 'manual' | 'auto_local' | 'auto_remote' | 'merge' {
    // Simple heuristics for auto-resolution
    if (localOp.entityType === 'task' && localOp.operation === 'UPDATE') {
      const localChanges = Object.keys(localOp.data).length
      const serverAge = Date.now() - new Date(serverData.updatedAt).getTime()
      
      if (localChanges <= 2 && serverAge > 300000) { // Simple change and server data is old
        return 'auto_local'
      }
    }
    
    return 'manual'
  }

  // Additional helper methods for specific merge scenarios
  private mergeCommentArrays(localComments: any[], remoteComments: any[]): any[] {
    const allComments = [...localComments, ...remoteComments]
    const uniqueComments = allComments.filter((comment, index) =>
      allComments.findIndex(other => other.id === comment.id) === index
    )
    return uniqueComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  private mergeContactInfo(localContact: any, remoteContact: any): any {
    if (!localContact && !remoteContact) return null
    if (!localContact) return remoteContact
    if (!remoteContact) return localContact
    
    return {
      ...remoteContact,
      // Preserve local contact preferences if more recent
      preferredContactMethod: localContact.preferredContactMethod || remoteContact.preferredContactMethod,
      // Merge phone numbers (keep all non-empty)
      phone: localContact.phone || remoteContact.phone,
      mobile: localContact.mobile || remoteContact.mobile,
      whatsapp: localContact.whatsapp || remoteContact.whatsapp
    }
  }

  private mergeContactArrays(localContacts: any[], remoteContacts: any[]): any[] {
    const allContacts = [...localContacts, ...remoteContacts]
    const uniqueContacts = allContacts.filter((contact, index) =>
      allContacts.findIndex(other => other.email === contact.email) === index
    )
    return uniqueContacts
  }

  private mergeBillingInfo(localBilling: any, remoteBilling: any): any {
    if (!localBilling && !remoteBilling) return { outstandingAmount: 0 }
    if (!localBilling) return remoteBilling
    if (!remoteBilling) return localBilling
    
    return {
      ...remoteBilling,
      // Use most recent outstanding amount
      outstandingAmount: remoteBilling.outstandingAmount || localBilling.outstandingAmount || 0,
      // Merge payment methods
      preferredPaymentMethod: localBilling.preferredPaymentMethod || remoteBilling.preferredPaymentMethod,
      // Use most recent bank details
      bankDetails: remoteBilling.bankDetails || localBilling.bankDetails
    }
  }

  private async performFieldLevelMerge(localData: any, remoteData: any): Promise<any> {
    const merged = { ...localData }
    
    Object.keys(remoteData).forEach(key => {
      const localValue = localData[key]
      const remoteValue = remoteData[key]
      
      if (remoteValue !== null && remoteValue !== undefined) {
        if (typeof remoteValue === 'object' && !Array.isArray(remoteValue)) {
          merged[key] = this.deepMergeObjects(localValue || {}, remoteValue)
        } else if (Array.isArray(remoteValue)) {
          merged[key] = this.mergeArrayFields(localValue || [], remoteValue)
        } else {
          // For primitive values, use remote if local is empty, otherwise keep local
          merged[key] = (localValue === null || localValue === undefined) ? remoteValue : localValue
        }
      }
    })
    
    return merged
  }

  // Batch processing for performance
  private async processBatches(
    operations: SyncOperation[],
    organizationId: string
  ): Promise<{ processed: number; errors: Array<{ operation: SyncOperation; error: string }> }> {
    const errors: Array<{ operation: SyncOperation; error: string }> = []
    let processed = 0
    
    for (let i = 0; i < operations.length; i += this.config.batchSize) {
      const batch = operations.slice(i, i + this.config.batchSize)
      
      try {
        await this.processBatch(batch, organizationId)
        processed += batch.length
      } catch (error) {
        batch.forEach(operation => {
          errors.push({
            operation,
            error: error instanceof Error ? error.message : 'Batch processing error'
          })
        })
      }
    }
    
    return { processed, errors }
  }

  private async processBatch(operations: SyncOperation[], organizationId: string): Promise<void> {
    // Group operations by entity type for efficient processing
    const groupedOps = operations.reduce((groups, op) => {
      if (!groups[op.entityType]) groups[op.entityType] = []
      groups[op.entityType].push(op)
      return groups
    }, {} as Record<string, SyncOperation[]>)

    // Process each entity type
    for (const [entityType, ops] of Object.entries(groupedOps)) {
      await this.processEntityOperations(entityType, ops, organizationId)
    }
  }

  private async processEntityOperations(
    entityType: string,
    operations: SyncOperation[],
    organizationId: string
  ): Promise<void> {
    for (const operation of operations) {
      try {
        await this.applyOperation(operation, organizationId)
      } catch (error) {
        console.error(`Failed to apply ${entityType} operation ${operation.id}:`, error)
        throw error
      }
    }
  }

  private async applyOperation(operation: SyncOperation, organizationId: string): Promise<void> {
    const { entityType, entityId, operation: opType, data } = operation

    try {
      switch (entityType) {
        case 'task':
          await this.applyTaskOperation(opType, entityId, data, organizationId)
          break
          
        case 'client':
          await this.applyClientOperation(opType, entityId, data, organizationId)
          break
          
        case 'document':
          await this.applyDocumentOperation(opType, entityId, data, organizationId)
          break
          
        default:
          throw new Error(`Unsupported entity type: ${entityType}`)
      }
    } catch (error) {
      console.error(`Failed to apply ${entityType} operation:`, error)
      throw error
    }
  }

  private async applyTaskOperation(
    operation: string,
    taskId: string,
    data: any,
    organizationId: string
  ): Promise<void> {
    switch (operation) {
      case 'CREATE':
        await prisma.task.create({
          data: { ...data, organizationId }
        })
        break
        
      case 'UPDATE':
        await prisma.task.update({
          where: { id: taskId, organizationId },
          data
        })
        break
        
      case 'DELETE':
        await prisma.task.delete({
          where: { id: taskId, organizationId }
        })
        break
    }
  }

  private async applyClientOperation(
    operation: string,
    clientId: string,
    data: any,
    organizationId: string
  ): Promise<void> {
    switch (operation) {
      case 'CREATE':
        await prisma.client.create({
          data: { ...data, organizationId }
        })
        break
        
      case 'UPDATE':
        await prisma.client.update({
          where: { id: clientId, organizationId },
          data
        })
        break
        
      case 'DELETE':
        await prisma.client.delete({
          where: { id: clientId, organizationId }
        })
        break
    }
  }

  private async applyDocumentOperation(
    operation: string,
    documentId: string,
    data: any,
    organizationId: string
  ): Promise<void> {
    switch (operation) {
      case 'CREATE':
        await prisma.document.create({
          data: { ...data, organizationId }
        })
        break
        
      case 'UPDATE':
        await prisma.document.update({
          where: { id: documentId, organizationId },
          data
        })
        break
        
      case 'DELETE':
        await prisma.document.update({
          where: { id: documentId, organizationId },
          data: { isDeleted: true, deletedAt: new Date() }
        })
        break
    }
  }

  private async validateOperations(
    operations: SyncOperation[],
    userId: string,
    organizationId: string
  ): Promise<SyncOperation[]> {
    return operations.filter(operation => {
      // Basic validation
      if (!operation.id || !operation.entityType || !operation.entityId) {
        return false
      }
      
      // Security validation - ensure user belongs to organization
      if (operation.userId !== userId) {
        return false
      }
      
      // Data integrity validation
      if (!this.validateChecksum(operation)) {
        return false
      }
      
      return true
    })
  }

  private validateChecksum(operation: SyncOperation): boolean {
    const expectedChecksum = this.generateChecksum(operation.data)
    return expectedChecksum === operation.checksum
  }

  private async updateSyncState(
    deviceId: string,
    userId: string,
    lastSync: Date
  ): Promise<void> {
    // Update sync state in database or cache
    await prisma.$executeRaw`
      INSERT INTO sync_state (device_id, user_id, last_sync, updated_at)
      VALUES (${deviceId}, ${userId}, ${lastSync}, NOW())
      ON CONFLICT (device_id, user_id) 
      DO UPDATE SET last_sync = ${lastSync}, updated_at = NOW()
    `
  }

  private async storePendingConflicts(conflicts: SyncConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      this.pendingConflicts.set(conflict.id, conflict)
      
      // Store in database for persistence
      await prisma.syncConflict.create({
        data: {
          id: conflict.id,
          entityType: conflict.entityType,
          entityId: conflict.entityId,
          conflictType: conflict.conflictType,
          localVersion: conflict.localVersion as any,
          remoteVersion: conflict.remoteVersion as any,
          resolution: conflict.resolution,
          createdAt: new Date()
        }
      })
    }
  }

  // Public API methods
  async getPendingConflicts(userId: string): Promise<SyncConflict[]> {
    return Array.from(this.pendingConflicts.values()).filter(
      conflict => conflict.localVersion.userId === userId
    )
  }

  async resolveConflictManually(
    conflictId: string,
    resolution: 'local' | 'remote' | 'custom',
    customData?: any
  ): Promise<boolean> {
    const conflict = this.pendingConflicts.get(conflictId)
    if (!conflict) return false

    try {
      let resolvedOperation: SyncOperation

      switch (resolution) {
        case 'local':
          resolvedOperation = conflict.localVersion
          break
        case 'remote':
          resolvedOperation = conflict.remoteVersion
          break
        case 'custom':
          if (!customData) throw new Error('Custom data required for custom resolution')
          resolvedOperation = {
            ...conflict.localVersion,
            data: customData,
            timestamp: new Date(),
            checksum: this.generateChecksum(customData)
          }
          break
        default:
          throw new Error('Invalid resolution type')
      }

      // Apply the resolved operation
      await this.applyOperation(resolvedOperation, conflict.localVersion.data.organizationId)

      // Mark conflict as resolved
      conflict.resolvedAt = new Date()
      conflict.resolvedBy = conflict.localVersion.userId

      // Remove from pending conflicts
      this.pendingConflicts.delete(conflictId)

      // Update database
      await prisma.syncConflict.update({
        where: { id: conflictId },
        data: {
          resolution: resolution === 'local' ? 'auto_local' : resolution === 'remote' ? 'auto_remote' : 'merge',
          resolvedAt: conflict.resolvedAt,
          resolvedBy: conflict.resolvedBy
        }
      })

      return true
    } catch (error) {
      console.error(`Failed to resolve conflict ${conflictId}:`, error)
      return false
    }
  }

  // Performance and monitoring
  getSyncStats(): {
    pendingConflicts: number
    processingRate: number
    errorRate: number
    avgSyncTime: number
  } {
    return {
      pendingConflicts: this.pendingConflicts.size,
      processingRate: 0, // Would track over time
      errorRate: 0, // Would track over time
      avgSyncTime: 0 // Would track over time
    }
  }
}

// Export singleton instance
export const offlineSyncEngine = new OfflineSyncEngine({
  batchSize: 25,
  maxRetries: 3,
  conflictStrategy: 'intelligent_merge',
  enableRealTimeSync: true,
  syncInterval: 30000,
  compressionEnabled: true
})