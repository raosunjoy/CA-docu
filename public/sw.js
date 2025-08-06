// Zetra Platform Service Worker
// Handles offline functionality for document management

const CACHE_NAME = 'zetra-documents-v1'
const OFFLINE_CACHE_NAME = 'zetra-offline-v1'
const API_CACHE_NAME = 'zetra-api-v1'

// Files to cache for offline functionality
const STATIC_CACHE_FILES = [
  '/',
  '/documents',
  '/offline.html',
  '/_next/static/css/app.css',
  '/_next/static/js/app.js'
]

// API endpoints that can work offline
const OFFLINE_API_PATTERNS = [
  /\/api\/documents\/sync/,
  /\/api\/documents\/[^/]+\/annotations/,
  /\/api\/documents\/[^/]+\/comments/
]

// Document file patterns
const DOCUMENT_PATTERNS = [
  /\/api\/documents\/[^/]+\/preview/,
  /\/uploads\//
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files')
        return cache.addAll(STATIC_CACHE_FILES)
      })
      .then(() => {
        console.log('Service Worker: Installation complete')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== OFFLINE_CACHE_NAME && 
                cacheName !== API_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activation complete')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    // Handle offline POST/PUT/DELETE requests
    if (isOfflineApiRequest(url.pathname)) {
      event.respondWith(handleOfflineApiRequest(request))
    }
    return
  }

  // Handle different types of requests
  if (isDocumentRequest(url.pathname)) {
    event.respondWith(handleDocumentRequest(request))
  } else if (isApiRequest(url.pathname)) {
    event.respondWith(handleApiRequest(request))
  } else if (isStaticRequest(url.pathname)) {
    event.respondWith(handleStaticRequest(request))
  } else {
    event.respondWith(handlePageRequest(request))
  }
})

// Check if request is for a document file
function isDocumentRequest(pathname) {
  return DOCUMENT_PATTERNS.some(pattern => pattern.test(pathname))
}

// Check if request is for API
function isApiRequest(pathname) {
  return pathname.startsWith('/api/')
}

// Check if request is for static files
function isStaticRequest(pathname) {
  return pathname.startsWith('/_next/') || 
         pathname.startsWith('/static/') ||
         pathname.includes('.')
}

// Check if API request can work offline
function isOfflineApiRequest(pathname) {
  return OFFLINE_API_PATTERNS.some(pattern => pattern.test(pathname))
}

// Handle document requests (images, PDFs, etc.)
async function handleDocumentRequest(request) {
  try {
    // Try network first for documents
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(OFFLINE_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Network failed for document, trying cache')
    
    // Try cache if network fails
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline placeholder for documents
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'OFFLINE_ERROR',
          message: 'Document not available offline'
        }
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle API requests
async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  // For sync and offline-capable APIs, try cache first when offline
  if (isOfflineApiRequest(url.pathname)) {
    return handleOfflineCapableApi(request)
  }
  
  try {
    // Try network first for regular APIs
    const networkResponse = await fetch(request)
    
    // Cache successful GET responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Network failed for API, trying cache')
    
    // Try cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }
    }
    
    // Return offline error
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'OFFLINE_ERROR',
          message: 'API not available offline'
        }
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle offline-capable API requests
async function handleOfflineCapableApi(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Handling offline API request')
    
    // Handle offline based on request type
    if (request.method === 'GET') {
      return handleOfflineGet(request)
    } else {
      return handleOfflineWrite(request)
    }
  }
}

// Handle offline GET requests
async function handleOfflineGet(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Return empty data for offline GET requests
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        annotations: [],
        comments: [],
        offline: true,
        message: 'Offline data - sync when online'
      }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// Handle offline write requests (POST, PUT, DELETE)
async function handleOfflineWrite(request) {
  try {
    // Store the request for later sync
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    }
    
    // Store in IndexedDB for sync later
    await storeOfflineRequest(requestData)
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          offline: true,
          queued: true,
          message: 'Request queued for sync when online'
        }
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'OFFLINE_STORAGE_ERROR',
          message: 'Failed to queue request for offline sync'
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle static file requests
async function handleStaticRequest(request) {
  // Cache first strategy for static files
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Static file not available offline')
    return new Response('Not available offline', { status: 503 })
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    // Try network first for pages
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Page not available, serving offline page')
    
    // Try to serve cached page
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Serve offline page
    const offlinePage = await caches.match('/offline.html')
    if (offlinePage) {
      return offlinePage
    }
    
    // Fallback offline response
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Zetra Platform</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-message { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 64px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="icon">📱</div>
            <h1>You're Offline</h1>
            <p>Some features may not be available while you're offline. Your changes will be synced when you're back online.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

// Store offline requests in IndexedDB
async function storeOfflineRequest(requestData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zetra-offline', 1)
    
    request.onerror = () => reject(request.error)
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['requests'], 'readwrite')
      const store = transaction.objectStore('requests')
      
      const addRequest = store.add({
        ...requestData,
        id: Date.now() + Math.random()
      })
      
      addRequest.onsuccess = () => resolve()
      addRequest.onerror = () => reject(addRequest.error)
    }
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp')
      }
    }
  })
}

// Listen for sync events
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered')
  
  if (event.tag === 'offline-sync') {
    event.waitUntil(syncOfflineRequests())
  }
})

// Sync offline requests when back online
async function syncOfflineRequests() {
  try {
    const requests = await getOfflineRequests()
    console.log(`Service Worker: Syncing ${requests.length} offline requests`)
    
    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        })
        
        if (response.ok) {
          await removeOfflineRequest(requestData.id)
          console.log('Service Worker: Synced offline request', requestData.url)
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync request', requestData.url, error)
      }
    }
  } catch (error) {
    console.error('Service Worker: Sync failed', error)
  }
}

// Get offline requests from IndexedDB
async function getOfflineRequests() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zetra-offline', 1)
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['requests'], 'readonly')
      const store = transaction.objectStore('requests')
      const getAllRequest = store.getAll()
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result)
      getAllRequest.onerror = () => reject(getAllRequest.error)
    }
    
    request.onerror = () => reject(request.error)
  })
}

// Remove synced offline request
async function removeOfflineRequest(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zetra-offline', 1)
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['requests'], 'readwrite')
      const store = transaction.objectStore('requests')
      const deleteRequest = store.delete(id)
      
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    }
    
    request.onerror = () => reject(request.error)
  })
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_DOCUMENTS') {
    event.waitUntil(cacheDocuments(event.data.documents))
  }
})

// Cache documents for offline access
async function cacheDocuments(documents) {
  const cache = await caches.open(OFFLINE_CACHE_NAME)
  
  for (const document of documents) {
    try {
      // Cache document preview
      const previewUrl = `/api/documents/${document.id}/preview`
      await cache.add(previewUrl)
      
      // Cache document file if available
      if (document.filePath) {
        await cache.add(document.filePath)
      }
      
      console.log('Service Worker: Cached document', document.name)
    } catch (error) {
      console.error('Service Worker: Failed to cache document', document.name, error)
    }
  }
}