// Advanced Service Worker for Zetra Platform
// Implements intelligent caching, offline functionality, and performance optimization

const CACHE_NAME = 'zetra-v2.0.0'
const STATIC_CACHE = 'zetra-static-v2.0.0'
const DYNAMIC_CACHE = 'zetra-dynamic-v2.0.0'
const API_CACHE = 'zetra-api-v2.0.0'
const IMAGE_CACHE = 'zetra-images-v2.0.0'

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
}

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/js/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/auth\/me/,
  /\/api\/dashboard\/metrics/,
  /\/api\/tasks\?/,
  /\/api\/documents\?/,
  /\/api\/tags/
]

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/',
  '/tasks',
  '/documents',
  '/dashboard'
]

// Performance monitoring
let performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  offlineRequests: 0
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS.filter(url => !url.endsWith('/')))
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  event.respondWith(handleRequest(request))
})

// Main request handler
async function handleRequest(request) {
  const url = new URL(request.url)
  
  try {
    // API requests
    if (url.pathname.startsWith('/api/')) {
      return await handleAPIRequest(request)
    }
    
    // Static assets
    if (isStaticAsset(url.pathname)) {
      return await handleStaticAsset(request)
    }
    
    // Images
    if (isImage(url.pathname)) {
      return await handleImage(request)
    }
    
    // Navigation requests (HTML pages)
    if (request.mode === 'navigate') {
      return await handleNavigation(request)
    }
    
    // Default: network first with cache fallback
    return await networkFirstWithCache(request, DYNAMIC_CACHE)
    
  } catch (error) {
    console.error('Service Worker fetch error:', error)
    return await handleOfflineRequest(request)
  }
}

// Handle API requests with intelligent caching
async function handleAPIRequest(request) {
  const url = new URL(request.url)
  
  // Check if this API should be cached
  const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))
  
  if (shouldCache) {
    // Use stale-while-revalidate for API data
    return await staleWhileRevalidate(request, API_CACHE)
  } else {
    // Network only for sensitive operations
    performanceMetrics.networkRequests++
    return await fetch(request)
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  return await cacheFirst(request, STATIC_CACHE)
}

// Handle images with cache-first strategy
async function handleImage(request) {
  return await cacheFirst(request, IMAGE_CACHE)
}

// Handle navigation requests
async function handleNavigation(request) {
  try {
    // Try network first for navigation
    const response = await fetch(request)
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    
    performanceMetrics.networkRequests++
    return response
    
  } catch (error) {
    // Fallback to cache or offline page
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      performanceMetrics.cacheHits++
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    const url = new URL(request.url)
    if (OFFLINE_ROUTES.some(route => url.pathname.startsWith(route))) {
      performanceMetrics.offlineRequests++
      return await caches.match('/offline.html')
    }
    
    throw error
  }
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++
    return cachedResponse
  }
  
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    
    performanceMetrics.networkRequests++
    performanceMetrics.cacheMisses++
    return response
    
  } catch (error) {
    throw error
  }
}

// Network-first with cache fallback
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    
    performanceMetrics.networkRequests++
    return response
    
  } catch (error) {
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      performanceMetrics.cacheHits++
      return cachedResponse
    }
    
    throw error
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request)
  
  // Always try to fetch fresh data in the background
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  }).catch(() => {
    // Ignore network errors for background updates
  })
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++
    // Return cached response immediately, update in background
    fetchPromise.then(() => {
      // Notify clients of updated data
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'DATA_UPDATED',
            url: request.url
          })
        })
      })
    })
    return cachedResponse
  }
  
  // No cached response, wait for network
  try {
    const response = await fetchPromise
    performanceMetrics.networkRequests++
    performanceMetrics.cacheMisses++
    return response
  } catch (error) {
    throw error
  }
}

// Handle offline requests
async function handleOfflineRequest(request) {
  const url = new URL(request.url)
  
  // Try to find any cached version
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    performanceMetrics.cacheHits++
    performanceMetrics.offlineRequests++
    return cachedResponse
  }
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    performanceMetrics.offlineRequests++
    return await caches.match('/offline.html')
  }
  
  // Return a generic offline response
  return new Response(
    JSON.stringify({ 
      error: 'Offline', 
      message: 'This request is not available offline' 
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// Utility functions
function isStaticAsset(pathname) {
  return pathname.startsWith('/_next/static/') ||
         pathname.startsWith('/static/') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.woff') ||
         pathname.endsWith('.woff2')
}

function isImage(pathname) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(pathname)
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    // Get offline actions from IndexedDB
    const offlineActions = await getOfflineActions()
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })
        
        // Remove successful action
        await removeOfflineAction(action.id)
        
        // Notify client of successful sync
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              action: action
            })
          })
        })
        
      } catch (error) {
        console.error('Background sync failed for action:', action, error)
      }
    }
  } catch (error) {
    console.error('Background sync error:', error)
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const data = event.notification.data
  
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      // Check if app is already open
      const client = clients.find(c => c.visibilityState === 'visible')
      
      if (client) {
        client.focus()
        client.postMessage({
          type: 'NOTIFICATION_CLICK',
          data: data
        })
      } else {
        // Open new window/tab
        self.clients.openWindow(data.url || '/')
      }
    })
  )
})

// Message handling from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'GET_PERFORMANCE_METRICS':
      event.ports[0].postMessage(performanceMetrics)
      break
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches())
      break
      
    case 'PREFETCH_RESOURCES':
      event.waitUntil(prefetchResources(data.urls))
      break
      
    default:
      console.log('Unknown message type:', type)
  }
})

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map(name => caches.delete(name)))
  
  // Reset performance metrics
  performanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0,
    offlineRequests: 0
  }
}

// Prefetch resources
async function prefetchResources(urls) {
  const cache = await caches.open(DYNAMIC_CACHE)
  
  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        await cache.put(url, response)
      }
    } catch (error) {
      console.error('Prefetch failed for:', url, error)
    }
  }
}

// IndexedDB helpers for offline actions
async function getOfflineActions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zetra-offline-v2', 1)
    
    request.onerror = () => reject(request.error)
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['actions'], 'readonly')
      const store = transaction.objectStore('actions')
      const getAllRequest = store.getAll()
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || [])
      getAllRequest.onerror = () => reject(getAllRequest.error)
    }
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('actions')) {
        const store = db.createObjectStore('actions', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp')
        store.createIndex('url', 'url')
      }
    }
  })
}

async function removeOfflineAction(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zetra-offline-v2', 1)
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['actions'], 'readwrite')
      const store = transaction.objectStore('actions')
      const deleteRequest = store.delete(id)
      
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    }
    
    request.onerror = () => reject(request.error)
  })
}

console.log('Advanced Service Worker loaded successfully')