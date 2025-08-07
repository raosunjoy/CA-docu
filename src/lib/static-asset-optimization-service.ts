/**
 * Static Asset Optimization Service
 * Handles image optimization, lazy loading, and CDN integration
 */

import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'

// Asset Optimization Configuration
interface AssetOptimizationConfig {
  images: {
    formats: ('webp' | 'avif' | 'jpeg' | 'png')[]
    qualities: { [format: string]: number }
    sizes: number[]
    enableLazyLoading: boolean
    enableResponsive: boolean
  }
  css: {
    minify: boolean
    extractCritical: boolean
    inlineSmall: boolean
    maxInlineSize: number
  }
  js: {
    minify: boolean
    splitChunks: boolean
    enableTreeShaking: boolean
    enableCodeSplitting: boolean
  }
  cdn: {
    enabled: boolean
    baseUrl: string
    cacheBusting: boolean
    compression: boolean
  }
}

// Optimized Asset Metadata
interface OptimizedAsset {
  originalPath: string
  optimizedPath: string
  format: string
  size: number
  originalSize: number
  compressionRatio: number
  hash: string
  dimensions?: { width: number; height: number }
  responsive?: { [size: string]: string }
}

// Asset Performance Metrics
interface AssetMetrics {
  totalAssets: number
  totalOriginalSize: number
  totalOptimizedSize: number
  averageCompressionRatio: number
  formatDistribution: { [format: string]: number }
  sizeDistribution: { [range: string]: number }
  cacheHitRate: number
}

class StaticAssetOptimizer {
  private config: AssetOptimizationConfig
  private assetCache: Map<string, OptimizedAsset> = new Map()
  private optimizationQueue: Set<string> = new Set()

  constructor(config: AssetOptimizationConfig) {
    this.config = config
  }

  // Image Optimization
  async optimizeImage(
    inputPath: string,
    outputDir: string,
    options: {
      formats?: string[]
      sizes?: number[]
      quality?: number
    } = {}
  ): Promise<OptimizedAsset[]> {
    const {
      formats = this.config.images.formats,
      sizes = this.config.images.sizes,
      quality
    } = options

    const optimizedAssets: OptimizedAsset[] = []
    const inputBuffer = await fs.readFile(inputPath)
    const originalSize = inputBuffer.length
    const hash = this.generateHash(inputBuffer)

    // Get image metadata
    const metadata = await sharp(inputBuffer).metadata()
    const originalDimensions = {
      width: metadata.width || 0,
      height: metadata.height || 0
    }

    for (const format of formats) {
      const formatQuality = quality || this.config.images.qualities[format] || 80

      for (const size of sizes) {
        // Skip if size is larger than original
        if (size > originalDimensions.width) continue

        const outputFileName = this.generateOptimizedFileName(
          inputPath,
          format,
          size,
          hash
        )
        const outputPath = path.join(outputDir, outputFileName)

        try {
          // Check if already optimized
          if (await this.fileExists(outputPath)) {
            const stats = await fs.stat(outputPath)
            optimizedAssets.push({
              originalPath: inputPath,
              optimizedPath: outputPath,
              format,
              size: stats.size,
              originalSize,
              compressionRatio: (originalSize - stats.size) / originalSize,
              hash,
              dimensions: await this.getImageDimensions(outputPath)
            })
            continue
          }

          // Optimize image
          let sharpInstance = sharp(inputBuffer)

          // Resize if needed
          if (size < originalDimensions.width) {
            sharpInstance = sharpInstance.resize(size, null, {
              withoutEnlargement: true,
              fit: 'inside'
            })
          }

          // Apply format-specific optimizations
          switch (format) {
            case 'webp':
              sharpInstance = sharpInstance.webp({ quality: formatQuality })
              break
            case 'avif':
              sharpInstance = sharpInstance.avif({ quality: formatQuality })
              break
            case 'jpeg':
              sharpInstance = sharpInstance.jpeg({
                quality: formatQuality,
                progressive: true,
                mozjpeg: true
              })
              break
            case 'png':
              sharpInstance = sharpInstance.png({
                quality: formatQuality,
                compressionLevel: 9,
                adaptiveFiltering: true
              })
              break
          }

          // Save optimized image
          await sharpInstance.toFile(outputPath)

          const optimizedStats = await fs.stat(outputPath)
          const optimizedAsset: OptimizedAsset = {
            originalPath: inputPath,
            optimizedPath: outputPath,
            format,
            size: optimizedStats.size,
            originalSize,
            compressionRatio: (originalSize - optimizedStats.size) / originalSize,
            hash,
            dimensions: await this.getImageDimensions(outputPath)
          }

          optimizedAssets.push(optimizedAsset)
          this.assetCache.set(outputPath, optimizedAsset)

        } catch (error) {
          console.error(`Failed to optimize image ${inputPath} to ${format}:`, error)
        }
      }
    }

    return optimizedAssets
  }

  // Generate responsive image set
  async generateResponsiveImages(
    inputPath: string,
    outputDir: string
  ): Promise<{ [size: string]: OptimizedAsset[] }> {
    const responsiveSet: { [size: string]: OptimizedAsset[] } = {}

    for (const size of this.config.images.sizes) {
      const assets = await this.optimizeImage(inputPath, outputDir, {
        sizes: [size]
      })
      responsiveSet[`${size}w`] = assets
    }

    return responsiveSet
  }

  // CSS Optimization
  async optimizeCSS(
    inputPath: string,
    outputPath: string,
    options: {
      extractCritical?: boolean
      inline?: boolean
    } = {}
  ): Promise<OptimizedAsset> {
    const inputBuffer = await fs.readFile(inputPath)
    const originalSize = inputBuffer.length
    let optimizedCSS = inputBuffer.toString()

    // Minify CSS
    if (this.config.css.minify) {
      optimizedCSS = this.minifyCSS(optimizedCSS)
    }

    // Extract critical CSS if requested
    if (options.extractCritical && this.config.css.extractCritical) {
      const { critical, remaining } = await this.extractCriticalCSS(optimizedCSS)
      
      // Save critical CSS separately
      const criticalPath = outputPath.replace('.css', '.critical.css')
      await fs.writeFile(criticalPath, critical)
      
      optimizedCSS = remaining
    }

    // Write optimized CSS
    await fs.writeFile(outputPath, optimizedCSS)

    const optimizedSize = Buffer.byteLength(optimizedCSS)
    const hash = this.generateHash(Buffer.from(optimizedCSS))

    const optimizedAsset: OptimizedAsset = {
      originalPath: inputPath,
      optimizedPath: outputPath,
      format: 'css',
      size: optimizedSize,
      originalSize,
      compressionRatio: (originalSize - optimizedSize) / originalSize,
      hash
    }

    this.assetCache.set(outputPath, optimizedAsset)
    return optimizedAsset
  }

  // JavaScript Optimization
  async optimizeJS(
    inputPath: string,
    outputPath: string,
    options: {
      minify?: boolean
      sourceMap?: boolean
    } = {}
  ): Promise<OptimizedAsset> {
    const inputBuffer = await fs.readFile(inputPath)
    const originalSize = inputBuffer.length
    let optimizedJS = inputBuffer.toString()

    // Minify JavaScript
    if (options.minify !== false && this.config.js.minify) {
      optimizedJS = await this.minifyJS(optimizedJS)
    }

    // Write optimized JavaScript
    await fs.writeFile(outputPath, optimizedJS)

    const optimizedSize = Buffer.byteLength(optimizedJS)
    const hash = this.generateHash(Buffer.from(optimizedJS))

    const optimizedAsset: OptimizedAsset = {
      originalPath: inputPath,
      optimizedPath: outputPath,
      format: 'js',
      size: optimizedSize,
      originalSize,
      compressionRatio: (originalSize - optimizedSize) / originalSize,
      hash
    }

    this.assetCache.set(outputPath, optimizedAsset)
    return optimizedAsset
  }

  // Batch optimization
  async optimizeDirectory(
    inputDir: string,
    outputDir: string,
    options: {
      recursive?: boolean
      fileTypes?: string[]
    } = {}
  ): Promise<OptimizedAsset[]> {
    const { recursive = true, fileTypes = ['jpg', 'jpeg', 'png', 'webp', 'css', 'js'] } = options
    const optimizedAssets: OptimizedAsset[] = []

    const processFile = async (filePath: string): Promise<void> => {
      const ext = path.extname(filePath).toLowerCase().slice(1)
      
      if (!fileTypes.includes(ext)) return

      const relativePath = path.relative(inputDir, filePath)
      const outputPath = path.join(outputDir, relativePath)
      const outputDirPath = path.dirname(outputPath)

      // Ensure output directory exists
      await fs.mkdir(outputDirPath, { recursive: true })

      try {
        switch (ext) {
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'webp':
            const imageAssets = await this.optimizeImage(filePath, outputDirPath)
            optimizedAssets.push(...imageAssets)
            break
          
          case 'css':
            const cssAsset = await this.optimizeCSS(filePath, outputPath)
            optimizedAssets.push(cssAsset)
            break
          
          case 'js':
            const jsAsset = await this.optimizeJS(filePath, outputPath)
            optimizedAssets.push(jsAsset)
            break
        }
      } catch (error) {
        console.error(`Failed to optimize ${filePath}:`, error)
      }
    }

    const processDirectory = async (dirPath: string): Promise<void> => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory() && recursive) {
          await processDirectory(fullPath)
        } else if (entry.isFile()) {
          await processFile(fullPath)
        }
      }
    }

    await processDirectory(inputDir)
    return optimizedAssets
  }

  // Generate asset manifest for cache busting
  async generateAssetManifest(
    assetsDir: string,
    manifestPath: string
  ): Promise<{ [originalPath: string]: string }> {
    const manifest: { [originalPath: string]: string } = {}

    for (const [optimizedPath, asset] of this.assetCache) {
      if (optimizedPath.startsWith(assetsDir)) {
        const relativePath = path.relative(assetsDir, asset.originalPath)
        const optimizedRelativePath = path.relative(assetsDir, optimizedPath)
        
        // Add hash to filename for cache busting
        if (this.config.cdn.cacheBusting) {
          const hashedPath = this.addHashToFilename(optimizedRelativePath, asset.hash)
          manifest[relativePath] = hashedPath
        } else {
          manifest[relativePath] = optimizedRelativePath
        }
      }
    }

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
    return manifest
  }

  // CDN Integration
  async uploadToCDN(
    localPath: string,
    cdnPath: string
  ): Promise<string> {
    if (!this.config.cdn.enabled) {
      return localPath
    }

    // This would integrate with actual CDN providers (AWS S3, Cloudflare, etc.)
    const cdnUrl = `${this.config.cdn.baseUrl}/${cdnPath}`
    
    console.log(`Uploading ${localPath} to CDN: ${cdnUrl}`)
    
    // Placeholder for actual CDN upload logic
    return cdnUrl
  }

  // Lazy Loading Implementation
  generateLazyLoadingHTML(
    src: string,
    alt: string,
    options: {
      sizes?: string
      srcset?: string
      className?: string
      placeholder?: string
    } = {}
  ): string {
    const {
      sizes = '100vw',
      srcset,
      className = '',
      placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNGNUY1RjUiLz48L3N2Zz4='
    } = options

    if (!this.config.images.enableLazyLoading) {
      return `<img src="${src}" alt="${alt}" ${srcset ? `srcset="${srcset}"` : ''} ${sizes ? `sizes="${sizes}"` : ''} class="${className}" />`
    }

    return `
      <img 
        src="${placeholder}"
        data-src="${src}"
        ${srcset ? `data-srcset="${srcset}"` : ''}
        ${sizes ? `data-sizes="${sizes}"` : ''}
        alt="${alt}"
        class="lazy ${className}"
        loading="lazy"
      />
    `
  }

  // Performance Metrics
  getOptimizationMetrics(): AssetMetrics {
    const assets = Array.from(this.assetCache.values())
    
    const totalAssets = assets.length
    const totalOriginalSize = assets.reduce((sum, asset) => sum + asset.originalSize, 0)
    const totalOptimizedSize = assets.reduce((sum, asset) => sum + asset.size, 0)
    const averageCompressionRatio = totalAssets > 0 
      ? assets.reduce((sum, asset) => sum + asset.compressionRatio, 0) / totalAssets 
      : 0

    // Format distribution
    const formatDistribution: { [format: string]: number } = {}
    assets.forEach(asset => {
      formatDistribution[asset.format] = (formatDistribution[asset.format] || 0) + 1
    })

    // Size distribution
    const sizeDistribution: { [range: string]: number } = {
      'small (<10KB)': 0,
      'medium (10KB-100KB)': 0,
      'large (100KB-1MB)': 0,
      'xlarge (>1MB)': 0
    }

    assets.forEach(asset => {
      if (asset.size < 10 * 1024) {
        sizeDistribution['small (<10KB)']++
      } else if (asset.size < 100 * 1024) {
        sizeDistribution['medium (10KB-100KB)']++
      } else if (asset.size < 1024 * 1024) {
        sizeDistribution['large (100KB-1MB)']++
      } else {
        sizeDistribution['xlarge (>1MB)']++
      }
    })

    return {
      totalAssets,
      totalOriginalSize,
      totalOptimizedSize,
      averageCompressionRatio,
      formatDistribution,
      sizeDistribution,
      cacheHitRate: 0 // Would need to track this separately
    }
  }

  // Utility Methods
  private generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 8)
  }

  private generateOptimizedFileName(
    originalPath: string,
    format: string,
    size: number,
    hash: string
  ): string {
    const basename = path.basename(originalPath, path.extname(originalPath))
    return `${basename}_${size}w_${hash}.${format}`
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  private async getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    try {
      const metadata = await sharp(imagePath).metadata()
      return {
        width: metadata.width || 0,
        height: metadata.height || 0
      }
    } catch {
      return { width: 0, height: 0 }
    }
  }

  private minifyCSS(css: string): string {
    // Simple CSS minification
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
      .replace(/\s*{\s*/g, '{') // Clean up braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';') // Clean up semicolons
      .replace(/\s*:\s*/g, ':') // Clean up colons
      .trim()
  }

  private async extractCriticalCSS(css: string): Promise<{ critical: string; remaining: string }> {
    // Simplified critical CSS extraction
    // In production, use a proper critical CSS extraction tool
    const lines = css.split('\n')
    const critical = lines.slice(0, Math.floor(lines.length * 0.2)).join('\n')
    const remaining = lines.slice(Math.floor(lines.length * 0.2)).join('\n')
    
    return { critical, remaining }
  }

  private async minifyJS(js: string): Promise<string> {
    // Simple JS minification
    // In production, use a proper minifier like Terser
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim()
  }

  private addHashToFilename(filename: string, hash: string): string {
    const ext = path.extname(filename)
    const basename = path.basename(filename, ext)
    const dirname = path.dirname(filename)
    
    return path.join(dirname, `${basename}.${hash}${ext}`)
  }
}

export { StaticAssetOptimizer, AssetOptimizationConfig, OptimizedAsset, AssetMetrics }