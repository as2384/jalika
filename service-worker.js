// Jalika Service Worker for offline functionality

const CACHE_NAME = 'jalika-cache-v1';

// Get the base path for our application (handles GitHub Pages deployment)
const getBasePath = () => {
  const path = location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
  return path === '/' ? '' : path; // If root path, use empty string
};

const BASE_PATH = getBasePath();

// Files to cache for offline use
const filesToCache = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/css/styles.css',
  BASE_PATH + '/js/app.js',
  BASE_PATH + '/js/data.js',
  BASE_PATH + '/js/image-processor.js',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/img/icons/icon-192x192.png',
  BASE_PATH + '/img/icons/icon-512x512.png',
  BASE_PATH + '/img/plants/placeholder.svg',
  BASE_PATH + '/data/catchphrases.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(filesToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => {
      console.log('Service Worker: Now active');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache if available, otherwise fetch and cache
self.addEventListener('fetch', event => {
  // For API calls, we want to use network first
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For all other assets, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response
        if (response) {
          return response;
        }
        
        // Clone the request as it can only be used once
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response as it can only be used once
            const responseToCache = response.clone();
            
            // Open cache and store the new response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(error => {
            console.error('Service Worker: Fetch failed', error);
            // Can add specific fallback content here
          });
      })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-sensor-data') {
    event.waitUntil(syncSensorData());
  }
});

// Function to sync data when online
async function syncSensorData() {
  try {
    // Get data from IndexedDB
    const dataToSync = await getOfflineData();
    
    if (dataToSync && dataToSync.length > 0) {
      // Send data to server
      await Promise.all(dataToSync.map(async (item) => {
        // Simulate API request
        const response = await fetch('/api/sensor-data', {
          method: 'POST',
          body: JSON.stringify(item),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          // Remove from offline store
          await removeOfflineData(item.id);
        }
      }));
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Dummy functions to get/remove offline data (would use IndexedDB in production)
function getOfflineData() {
  // This would actually access IndexedDB
  return Promise.resolve([]);
}

function removeOfflineData(id) {
  // This would actually delete from IndexedDB
  return Promise.resolve();
}