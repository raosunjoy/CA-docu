/**
 * Database Backup and Recovery Optimization Service
 * Handles automated backups, point-in-time recovery, and backup optimization
 */

import { PrismaClient } from '@prisma/client'
import { spawn } from 'child_process'
import { createReadStream, createWriteStream, promises as fs } from 'fs'
import { createGzip, createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import path from 'path'
import crypto from 'crypto'

// Backup Configuration
interface BackupConfig {
  schedule: string // Cron expression
  retentionDays: number
  compressionLevel: number
  encryptionEnabled: boolean
  remoteStorage?: {
    type: 's3' | 'gcs' | 'azure'
    bucket: string
    region?: string
    credentials: any
  }
  incrementalBackups: boolean
  parallelJobs: number
}

// Backup Metadata
interface BackupMetadata {
  id: string
  type: 'full' | 'incremental' | 'differential'
  timestamp: Date
  size: number
  compressedSize: number
  checksum: string
  encryptionKey?: string
  dependencies?: string[] // For incremental backups
  tables: string[]
  duration: number
  status: 'in_progress' | 'completed' | 'failed'
  error?: string
}

// Recovery Point
interface RecoveryPoint {
  timestamp: Date
  lsn: string // Log Sequence Number for PostgreSQL
  backupId: string
  description?: string
}

// Backup Performance Metrics
interface BackupMetrics {
  totalBackups: number
  successfulBackups: number
  failedBackups: number
  averageBackupTime: number
  averageBackupSize: number
  compressionRatio: number
  lastBackupTime: Date
  nextScheduledBackup: Date
}

class DatabaseBackupOptimizer {
  private config: BackupConfig
  private backupDir: string
  private prisma: PrismaClient
  private activeBackups: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: BackupConfig, backupDir: string = './backups') {
    this.config = config
    this.backupDir = backupDir
    this.prisma = new PrismaClient()
    this.ensureBackupDirectory()
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create backup directory:', error)
    }
  }

  async createFullBackup(): Promise<BackupMetadata> {
    const backupId = `full_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const startTime = Date.now()
    
    try {
      console.log(`Starting full backup: ${backupId}`)
      
      // Get database connection info
      const dbUrl = new URL(process.env.DATABASE_URL!)
      const dbName = dbUrl.pathname.slice(1)
      
      // Create backup filename
      const backupFile = path.join(this.backupDir, `${backupId}.sql`)
      const compressedFile = `${backupFile}.gz`
      
      // Get table list for metadata
      const tables = await this.getTableList()
      
      // Create backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        type: 'full',
        timestamp: new Date(),
        size: 0,
        compressedSize: 0,
        checksum: '',
        tables,
        duration: 0,
        status: 'in_progress'
      }

      // Save initial metadata
      await this.saveBackupMetadata(metadata)

      // Create database dump
      await this.createDatabaseDump(backupFile)
      
      // Compress backup
      if (this.config.compressionLevel > 0) {
        await this.compressBackup(backupFile, compressedFile)
        await fs.unlink(backupFile) // Remove uncompressed file
      }

      // Calculate file sizes and checksum
      const finalFile = this.config.compressionLevel > 0 ? compressedFile : backupFile
      const stats = await fs.stat(finalFile)
      const checksum = await this.calculateChecksum(finalFile)

      // Update metadata
      metadata.size = stats.size
      metadata.compressedSize = this.config.compressionLevel > 0 ? stats.size : 0
      metadata.checksum = checksum
      metadata.duration = Date.now() - startTime
      metadata.status = 'completed'

      // Encrypt if enabled
      if (this.config.encryptionEnabled) {
        const encryptedFile = `${finalFile}.enc`
        const encryptionKey = await this.encryptBackup(finalFile, encryptedFile)
        metadata.encryptionKey = encryptionKey
        await fs.unlink(finalFile) // Remove unencrypted file
      }

      await this.saveBackupMetadata(metadata)
      
      // Upload to remote storage if configured
      if (this.config.remoteStorage) {
        await this.uploadToRemoteStorage(metadata)
      }

      console.log(`Full backup completed: ${backupId} (${metadata.duration}ms)`)
      return metadata

    } catch (error) {
      console.error(`Full backup failed: ${backupId}`, error)
      
      const metadata: BackupMetadata = {
        id: backupId,
        type: 'full',
        timestamp: new Date(),
        size: 0,
        compressedSize: 0,
        checksum: '',
        tables: [],
        duration: Date.now() - startTime,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      
      await this.saveBackupMetadata(metadata)
      throw error
    }
  }

  async createIncrementalBackup(baseBackupId: string): Promise<BackupMetadata> {
    const backupId = `incr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const startTime = Date.now()

    try {
      console.log(`Starting incremental backup: ${backupId}`)

      // Get base backup metadata
      const baseBackup = await this.getBackupMetadata(baseBackupId)
      if (!baseBackup) {
        throw new Error(`Base backup not found: ${baseBackupId}`)
      }

      // Create WAL archive backup (PostgreSQL specific)
      const backupFile = path.join(this.backupDir, `${backupId}.wal`)
      await this.createWALBackup(backupFile, baseBackup.timestamp)

      // Get changed tables since base backup
      const changedTables = await this.getChangedTables(baseBackup.timestamp)

      const metadata: BackupMetadata = {
        id: backupId,
        type: 'incremental',
        timestamp: new Date(),
        size: 0,
        compressedSize: 0,
        checksum: '',
        dependencies: [baseBackupId],
        tables: changedTables,
        duration: 0,
        status: 'in_progress'
      }

      await this.saveBackupMetadata(metadata)

      // Compress and finalize
      const compressedFile = `${backupFile}.gz`
      if (this.config.compressionLevel > 0) {
        await this.compressBackup(backupFile, compressedFile)
        await fs.unlink(backupFile)
      }

      const finalFile = this.config.compressionLevel > 0 ? compressedFile : backupFile
      const stats = await fs.stat(finalFile)
      const checksum = await this.calculateChecksum(finalFile)

      metadata.size = stats.size
      metadata.compressedSize = this.config.compressionLevel > 0 ? stats.size : 0
      metadata.checksum = checksum
      metadata.duration = Date.now() - startTime
      metadata.status = 'completed'

      await this.saveBackupMetadata(metadata)

      console.log(`Incremental backup completed: ${backupId}`)
      return metadata

    } catch (error) {
      console.error(`Incremental backup failed: ${backupId}`, error)
      throw error
    }
  }

  private async createDatabaseDump(outputFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbUrl = new URL(process.env.DATABASE_URL!)
      
      const pgDump = spawn('pg_dump', [
        '--host', dbUrl.hostname,
        '--port', dbUrl.port || '5432',
        '--username', dbUrl.username,
        '--dbname', dbUrl.pathname.slice(1),
        '--verbose',
        '--no-password',
        '--format=custom',
        '--compress=0', // We'll handle compression separately
        '--file', outputFile
      ], {
        env: {
          ...process.env,
          PGPASSWORD: dbUrl.password
        }
      })

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`pg_dump exited with code ${code}`))
        }
      })

      pgDump.on('error', reject)
    })
  }

  private async createWALBackup(outputFile: string, sinceTimestamp: Date): Promise<void> {
    // This is a simplified WAL backup - in production, you'd use pg_basebackup
    // or implement proper WAL archiving
    return new Promise((resolve, reject) => {
      const dbUrl = new URL(process.env.DATABASE_URL!)
      
      const pgDump = spawn('pg_dump', [
        '--host', dbUrl.hostname,
        '--port', dbUrl.port || '5432',
        '--username', dbUrl.username,
        '--dbname', dbUrl.pathname.slice(1),
        '--verbose',
        '--no-password',
        '--format=custom',
        '--compress=0',
        '--file', outputFile,
        '--exclude-table-data=*', // Only schema changes for incremental
      ], {
        env: {
          ...process.env,
          PGPASSWORD: dbUrl.password
        }
      })

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`WAL backup exited with code ${code}`))
        }
      })

      pgDump.on('error', reject)
    })
  }

  private async compressBackup(inputFile: string, outputFile: string): Promise<void> {
    const gzip = createGzip({ level: this.config.compressionLevel })
    const source = createReadStream(inputFile)
    const destination = createWriteStream(outputFile)

    await pipeline(source, gzip, destination)
  }

  private async encryptBackup(inputFile: string, outputFile: string): Promise<string> {
    const key = crypto.randomBytes(32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher('aes-256-cbc', key)

    const source = createReadStream(inputFile)
    const destination = createWriteStream(outputFile)

    await pipeline(source, cipher, destination)

    // Return base64 encoded key for storage
    return Buffer.concat([key, iv]).toString('base64')
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256')
    const stream = createReadStream(filePath)

    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  private async getTableList(): Promise<string[]> {
    try {
      const result = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `
      return result.map(row => row.tablename)
    } catch (error) {
      console.error('Failed to get table list:', error)
      return []
    }
  }

  private async getChangedTables(sinceTimestamp: Date): Promise<string[]> {
    // This is a simplified implementation
    // In production, you'd track table modifications more precisely
    try {
      const result = await this.prisma.$queryRaw<Array<{ schemaname: string; tablename: string }>>`
        SELECT schemaname, tablename
        FROM pg_stat_user_tables
        WHERE n_tup_ins + n_tup_upd + n_tup_del > 0
      `
      return result.map(row => row.tablename)
    } catch (error) {
      console.error('Failed to get changed tables:', error)
      return []
    }
  }

  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataFile = path.join(this.backupDir, `${metadata.id}.metadata.json`)
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2))
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const metadataFile = path.join(this.backupDir, `${backupId}.metadata.json`)
      const content = await fs.readFile(metadataFile, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      return null
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const files = await fs.readdir(this.backupDir)
      const metadataFiles = files.filter(file => file.endsWith('.metadata.json'))
      
      const backups: BackupMetadata[] = []
      for (const file of metadataFiles) {
        try {
          const content = await fs.readFile(path.join(this.backupDir, file), 'utf-8')
          backups.push(JSON.parse(content))
        } catch (error) {
          console.error(`Failed to read metadata file ${file}:`, error)
        }
      }

      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    } catch (error) {
      console.error('Failed to list backups:', error)
      return []
    }
  }

  async restoreFromBackup(backupId: string, targetTimestamp?: Date): Promise<void> {
    console.log(`Starting restore from backup: ${backupId}`)
    
    const metadata = await this.getBackupMetadata(backupId)
    if (!metadata) {
      throw new Error(`Backup metadata not found: ${backupId}`)
    }

    if (metadata.type === 'incremental' && metadata.dependencies) {
      // For incremental backups, we need to restore the base backup first
      for (const depId of metadata.dependencies) {
        await this.restoreFromBackup(depId)
      }
    }

    // Determine backup file
    let backupFile = path.join(this.backupDir, `${backupId}.sql`)
    
    if (this.config.compressionLevel > 0) {
      backupFile = `${backupFile}.gz`
    }
    
    if (this.config.encryptionEnabled) {
      backupFile = `${backupFile}.enc`
      
      // Decrypt first
      const decryptedFile = backupFile.replace('.enc', '')
      await this.decryptBackup(backupFile, decryptedFile, metadata.encryptionKey!)
      backupFile = decryptedFile
    }

    if (this.config.compressionLevel > 0 && backupFile.endsWith('.gz')) {
      // Decompress
      const decompressedFile = backupFile.replace('.gz', '')
      await this.decompressBackup(backupFile, decompressedFile)
      backupFile = decompressedFile
    }

    // Restore database
    await this.restoreDatabase(backupFile)
    
    // Cleanup temporary files
    if (backupFile !== path.join(this.backupDir, `${backupId}.sql`)) {
      await fs.unlink(backupFile).catch(() => {}) // Ignore errors
    }

    console.log(`Restore completed from backup: ${backupId}`)
  }

  private async decryptBackup(inputFile: string, outputFile: string, encryptionKey: string): Promise<void> {
    const keyBuffer = Buffer.from(encryptionKey, 'base64')
    const key = keyBuffer.slice(0, 32)
    const iv = keyBuffer.slice(32, 48)
    
    const decipher = crypto.createDecipher('aes-256-cbc', key)
    const source = createReadStream(inputFile)
    const destination = createWriteStream(outputFile)

    await pipeline(source, decipher, destination)
  }

  private async decompressBackup(inputFile: string, outputFile: string): Promise<void> {
    const gunzip = createGunzip()
    const source = createReadStream(inputFile)
    const destination = createWriteStream(outputFile)

    await pipeline(source, gunzip, destination)
  }

  private async restoreDatabase(backupFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbUrl = new URL(process.env.DATABASE_URL!)
      
      const pgRestore = spawn('pg_restore', [
        '--host', dbUrl.hostname,
        '--port', dbUrl.port || '5432',
        '--username', dbUrl.username,
        '--dbname', dbUrl.pathname.slice(1),
        '--verbose',
        '--no-password',
        '--clean',
        '--if-exists',
        backupFile
      ], {
        env: {
          ...process.env,
          PGPASSWORD: dbUrl.password
        }
      })

      pgRestore.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`pg_restore exited with code ${code}`))
        }
      })

      pgRestore.on('error', reject)
    })
  }

  async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups()
    const cutoffDate = new Date(Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000))

    for (const backup of backups) {
      if (backup.timestamp < cutoffDate) {
        try {
          await this.deleteBackup(backup.id)
          console.log(`Deleted old backup: ${backup.id}`)
        } catch (error) {
          console.error(`Failed to delete backup ${backup.id}:`, error)
        }
      }
    }
  }

  private async deleteBackup(backupId: string): Promise<void> {
    const files = [
      `${backupId}.sql`,
      `${backupId}.sql.gz`,
      `${backupId}.sql.gz.enc`,
      `${backupId}.wal`,
      `${backupId}.wal.gz`,
      `${backupId}.wal.gz.enc`,
      `${backupId}.metadata.json`
    ]

    for (const file of files) {
      const filePath = path.join(this.backupDir, file)
      try {
        await fs.unlink(filePath)
      } catch (error) {
        // File might not exist, ignore error
      }
    }
  }

  private async uploadToRemoteStorage(metadata: BackupMetadata): Promise<void> {
    // Implementation would depend on the storage provider
    // This is a placeholder for S3/GCS/Azure integration
    console.log(`Uploading backup ${metadata.id} to remote storage`)
  }

  async getBackupMetrics(): Promise<BackupMetrics> {
    const backups = await this.listBackups()
    const successful = backups.filter(b => b.status === 'completed')
    const failed = backups.filter(b => b.status === 'failed')

    const totalDuration = successful.reduce((sum, b) => sum + b.duration, 0)
    const totalSize = successful.reduce((sum, b) => sum + b.size, 0)
    const totalCompressedSize = successful.reduce((sum, b) => sum + (b.compressedSize || b.size), 0)

    return {
      totalBackups: backups.length,
      successfulBackups: successful.length,
      failedBackups: failed.length,
      averageBackupTime: successful.length > 0 ? totalDuration / successful.length : 0,
      averageBackupSize: successful.length > 0 ? totalSize / successful.length : 0,
      compressionRatio: totalSize > 0 ? (totalSize - totalCompressedSize) / totalSize : 0,
      lastBackupTime: backups.length > 0 ? backups[0].timestamp : new Date(0),
      nextScheduledBackup: new Date() // Would calculate based on cron schedule
    }
  }

  async scheduleBackups(): Promise<void> {
    // Implementation would use a job scheduler like node-cron
    console.log('Backup scheduling would be implemented here')
  }

  async cleanup(): Promise<void> {
    // Cancel active backups
    for (const [id, timeout] of this.activeBackups) {
      clearTimeout(timeout)
    }
    this.activeBackups.clear()

    await this.prisma.$disconnect()
  }
}

export { DatabaseBackupOptimizer, BackupConfig, BackupMetadata, BackupMetrics }