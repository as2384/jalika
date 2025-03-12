// Jalika - IndexedDB Service for Persistent Storage

const JalikaDB = (function() {
    'use strict';
    
    // Configuration
    const config = {
        dbName: 'jalika-db',
        version: 1,
        stores: {
            plants: 'plants',
            images: 'images'
        }
    };
    
    // Database connection
    let db = null;
    
    // Initialize the database
    function init() {
        return new Promise((resolve, reject) => {
            console.log('[JalikaDB] Initializing database...');
            
            const request = indexedDB.open(config.dbName, config.version);
            
            // Create or upgrade the database structure
            request.onupgradeneeded = function(event) {
                console.log('[JalikaDB] Database upgrade needed');
                const db = event.target.result;
                
                // Create the plants store if it doesn't exist
                if (!db.objectStoreNames.contains(config.stores.plants)) {
                    db.createObjectStore(config.stores.plants, { keyPath: 'id' });
                    console.log('[JalikaDB] Created plants store');
                }
                
                // Create the images store if it doesn't exist
                if (!db.objectStoreNames.contains(config.stores.images)) {
                    db.createObjectStore(config.stores.images, { keyPath: 'id' });
                    console.log('[JalikaDB] Created images store');
                }
            };
            
            // Success handler
            request.onsuccess = function(event) {
                db = event.target.result;
                console.log('[JalikaDB] Database initialized successfully');
                resolve(db);
            };
            
            // Error handler
            request.onerror = function(event) {
                console.error('[JalikaDB] Error initializing database:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // Save or update a plant image
    function savePlantImage(podId, imageData, isCartoon = false) {
        return new Promise((resolve, reject) => {
            if (!db) {
                return reject(new Error('Database not initialized'));
            }
            
            const transaction = db.transaction(config.stores.images, 'readwrite');
            const store = transaction.objectStore(config.stores.images);
            
            // Create a unique ID for the image
            const id = isCartoon ? `cartoon-${podId}` : `original-${podId}`;
            
            // Create image object
            const imageObject = {
                id: id,
                podId: podId,
                type: isCartoon ? 'cartoon' : 'original',
                data: imageData,
                timestamp: new Date().toISOString()
            };
            
            // Store the image
            const request = store.put(imageObject);
            
            request.onsuccess = function() {
                console.log(`[JalikaDB] Successfully saved ${isCartoon ? 'cartoon' : 'original'} image for pod ${podId}`);
                resolve();
            };
            
            request.onerror = function(event) {
                console.error('[JalikaDB] Error saving image:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // Get images for all plants
    function getAllPlantImages() {
        return new Promise((resolve, reject) => {
            if (!db) {
                return reject(new Error('Database not initialized'));
            }
            
            const transaction = db.transaction(config.stores.images, 'readonly');
            const store = transaction.objectStore(config.stores.images);
            const request = store.getAll();
            
            request.onsuccess = function() {
                const images = request.result;
                console.log(`[JalikaDB] Retrieved ${images.length} images from database`);
                resolve(images);
            };
            
            request.onerror = function(event) {
                console.error('[JalikaDB] Error getting images:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // Get a specific plant image
    function getPlantImage(podId, isCartoon = false) {
        return new Promise((resolve, reject) => {
            if (!db) {
                return reject(new Error('Database not initialized'));
            }
            
            const id = isCartoon ? `cartoon-${podId}` : `original-${podId}`;
            const transaction = db.transaction(config.stores.images, 'readonly');
            const store = transaction.objectStore(config.stores.images);
            const request = store.get(id);
            
            request.onsuccess = function() {
                const image = request.result;
                if (image) {
                    console.log(`[JalikaDB] Retrieved ${isCartoon ? 'cartoon' : 'original'} image for pod ${podId}`);
                    resolve(image.data);
                } else {
                    console.log(`[JalikaDB] No ${isCartoon ? 'cartoon' : 'original'} image found for pod ${podId}`);
                    resolve(null);
                }
            };
            
            request.onerror = function(event) {
                console.error('[JalikaDB] Error getting image:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // Delete a plant image
    function deletePlantImage(podId, isCartoon = false) {
        return new Promise((resolve, reject) => {
            if (!db) {
                return reject(new Error('Database not initialized'));
            }
            
            const id = isCartoon ? `cartoon-${podId}` : `original-${podId}`;
            const transaction = db.transaction(config.stores.images, 'readwrite');
            const store = transaction.objectStore(config.stores.images);
            const request = store.delete(id);
            
            request.onsuccess = function() {
                console.log(`[JalikaDB] Deleted ${isCartoon ? 'cartoon' : 'original'} image for pod ${podId}`);
                resolve();
            };
            
            request.onerror = function(event) {
                console.error('[JalikaDB] Error deleting image:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // Clear all data
    function clearAllData() {
        return new Promise((resolve, reject) => {
            if (!db) {
                return reject(new Error('Database not initialized'));
            }
            
            const transaction = db.transaction([config.stores.plants, config.stores.images], 'readwrite');
            
            // Clear plants store
            const plantsStore = transaction.objectStore(config.stores.plants);
            const plantsRequest = plantsStore.clear();
            
            plantsRequest.onsuccess = function() {
                console.log('[JalikaDB] Plants store cleared');
            };
            
            // Clear images store
            const imagesStore = transaction.objectStore(config.stores.images);
            const imagesRequest = imagesStore.clear();
            
            imagesRequest.onsuccess = function() {
                console.log('[JalikaDB] Images store cleared');
            };
            
            // Transaction complete
            transaction.oncomplete = function() {
                console.log('[JalikaDB] All data cleared successfully');
                resolve();
            };
            
            transaction.onerror = function(event) {
                console.error('[JalikaDB] Error clearing data:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // Public API
    return {
        init,
        savePlantImage,
        getPlantImage,
        getAllPlantImages,
        deletePlantImage,
        clearAllData
    };
})();

// Initialize database when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize with a small delay to ensure other modules have loaded
    setTimeout(JalikaDB.init, 500);
});

// Photo Database Manager for storing library photos
const JalikaPhotoDB = (function() {
    const DB_NAME = 'jalika_photos_db';
    const DB_VERSION = 1;
    const STORE_NAME = 'photos';
    
    let db = null;
    
    // Initialize the database
    function init() {
      return new Promise((resolve, reject) => {
        if (db) {
          resolve(db);
          return;
        }
        
        console.log('Initializing IndexedDB for photos...');
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
          console.error('Error opening IndexedDB:', event.target.error);
          reject('Could not open photo database');
        };
        
        request.onsuccess = (event) => {
          db = event.target.result;
          console.log('IndexedDB opened successfully');
          resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
          console.log('Creating or upgrading photo database...');
          const database = event.target.result;
          
          // Create the photos object store if it doesn't exist
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            
            // Create indexes for quick lookups
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('name', 'name', { unique: false });
            
            console.log('Photo object store created');
          }
        };
      });
    }
    
    // Save photos to IndexedDB - properly append instead of replace
    function savePhotos(newPhotos) {
      return new Promise((resolve, reject) => {
        if (!newPhotos || !Array.isArray(newPhotos) || newPhotos.length === 0) {
          console.warn('No photos to save');
          resolve([]);
          return;
        }
        
        console.log(`Attempting to save ${newPhotos.length} photos to IndexedDB`);
        
        init()
          .then(() => {
            // First get all existing photos
            return getAllPhotos();
          })
          .then(existingPhotos => {
            console.log(`Found ${existingPhotos.length} existing photos in database`);
            
            // Create a deduplication map using photo ID
            const photoMap = new Map();
            
            // Add existing photos to the map
            existingPhotos.forEach(photo => {
              photoMap.set(photo.id, photo);
            });
            
            // Add new photos to the map - this will replace any with the same ID
            let newUniqueCount = 0;
            newPhotos.forEach(photo => {
              if (!photoMap.has(photo.id)) {
                newUniqueCount++;
              }
              photoMap.set(photo.id, photo);
            });
            
            console.log(`Adding ${newUniqueCount} new unique photos to database`);
            
            // Now save all photos back to the database
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // Get all photos from the map
            const allPhotos = Array.from(photoMap.values());
            
            // Clear the existing store and add all photos
            store.clear();
            
            // Add each photo individually to avoid errors with large batches
            let completedCount = 0;
            
            const saveNext = (index) => {
              if (index >= allPhotos.length) {
                // All done
                return;
              }
              
              try {
                const request = store.add(allPhotos[index]);
                
                request.onsuccess = () => {
                  completedCount++;
                  saveNext(index + 1);
                };
                
                request.onerror = (event) => {
                  console.warn(`Error adding photo at index ${index}:`, event.target.error);
                  // Continue with next photo
                  completedCount++;
                  saveNext(index + 1);
                };
              } catch (e) {
                console.warn(`Exception adding photo at index ${index}:`, e);
                // Continue with next photo
                completedCount++;
                saveNext(index + 1);
              }
            };
            
            // Start saving photos
            saveNext(0);
            
            // Handle transaction completion
            return new Promise((resolveTransaction, rejectTransaction) => {
              transaction.oncomplete = () => {
                console.log(`Successfully saved ${completedCount} of ${allPhotos.length} photos to database`);
                resolveTransaction(allPhotos);
              };
              
              transaction.onerror = (event) => {
                console.error('Error saving photos to database:', event.target.error);
                rejectTransaction(event.target.error);
              };
            });
          })
          .then(allPhotos => {
            resolve(allPhotos);
          })
          .catch(error => {
            console.error('Error in savePhotos:', error);
            reject(error);
          });
      });
    }
    
    // Get all photos from IndexedDB
    function getAllPhotos() {
      return new Promise((resolve, reject) => {
        init()
          .then(() => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.getAll();
            
            request.onsuccess = () => {
              const photos = request.result || [];
              resolve(photos);
            };
            
            request.onerror = (event) => {
              console.error('Error getting photos from database:', event.target.error);
              reject(event.target.error);
            };
          })
          .catch(error => {
            console.error('Error in getAllPhotos:', error);
            reject(error);
          });
      });
    }
    
    // Get photos sorted by date
    function getPhotosSortedByDate(ascending = false) {
      return new Promise((resolve, reject) => {
        getAllPhotos()
          .then(photos => {
            // Sort photos by date
            const sortedPhotos = photos.sort((a, b) => {
              const dateA = a.date ? new Date(a.date) : new Date(0);
              const dateB = b.date ? new Date(b.date) : new Date(0);
              return ascending ? dateA - dateB : dateB - dateA;
            });
            
            resolve(sortedPhotos);
          })
          .catch(error => {
            reject(error);
          });
      });
    }
    
    // Clear all photos
    function clearAllPhotos() {
      return new Promise((resolve, reject) => {
        init()
          .then(() => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.clear();
            
            request.onsuccess = () => {
              console.log('All photos cleared from database');
              resolve(true);
            };
            
            request.onerror = (event) => {
              console.error('Error clearing photos from database:', event.target.error);
              reject(event.target.error);
            };
          })
          .catch(error => {
            console.error('Error in clearAllPhotos:', error);
            reject(error);
          });
      });
    }
    
    // Delete a specific photo
    function deletePhoto(photoId) {
      return new Promise((resolve, reject) => {
        init()
          .then(() => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.delete(photoId);
            
            request.onsuccess = () => {
              console.log(`Photo ${photoId} deleted from database`);
              resolve(true);
            };
            
            request.onerror = (event) => {
              console.error(`Error deleting photo ${photoId}:`, event.target.error);
              reject(event.target.error);
            };
          })
          .catch(error => {
            console.error('Error in deletePhoto:', error);
            reject(error);
          });
      });
    }
    
    // Get the count of photos
    function getPhotoCount() {
      return new Promise((resolve, reject) => {
        init()
          .then(() => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            const request = store.count();
            
            request.onsuccess = () => {
              resolve(request.result);
            };
            
            request.onerror = (event) => {
              console.error('Error getting photo count:', event.target.error);
              reject(event.target.error);
            };
          })
          .catch(error => {
            console.error('Error in getPhotoCount:', error);
            reject(error);
          });
      });
    }
    
    // Public API
    return {
      init,
      savePhotos,
      getAllPhotos,
      getPhotosSortedByDate,
      clearAllPhotos,
      deletePhoto,
      getPhotoCount
    };
})();

// Initialize the database when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  JalikaPhotoDB.init()
    .then(() => {
      console.log('Photo database initialized');
    })
    .catch(error => {
      console.error('Error initializing photo database:', error);
    });
});

// Define these functions to be used by jalika-enhancements.js
// These replace the localStorage implementations

// Save photos to IndexedDB
function savePhotosToStorage(newPhotos) {
  // Show a loading indicator if there are many photos
  if (newPhotos.length > 10) {
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'jalika-saving-indicator';
    loadingMsg.innerHTML = `
      <div class="jalika-saving-content">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Saving ${newPhotos.length} photos...</p>
      </div>
    `;
    document.body.appendChild(loadingMsg);
  }
  
  // Save photos to IndexedDB
  return JalikaPhotoDB.savePhotos(newPhotos)
    .then(allPhotos => {
      console.log(`Successfully saved ${newPhotos.length} new photos. Total: ${allPhotos.length}`);
      
      // Remove loading indicator if it exists
      const loadingMsg = document.querySelector('.jalika-saving-indicator');
      if (loadingMsg) {
        document.body.removeChild(loadingMsg);
      }
      
      return allPhotos;
    })
    .catch(error => {
      console.error('Error saving photos:', error);
      
      // Remove loading indicator if it exists
      const loadingMsg = document.querySelector('.jalika-saving-indicator');
      if (loadingMsg) {
        document.body.removeChild(loadingMsg);
      }
      
      // Show error message if not already handled
      if (!document.querySelector('.jalika-error-message')) {
        alert(`Error saving photos: ${error.message || 'Storage limit exceeded. Try importing fewer or smaller photos.'}`);
      }
      
      // Still return the new photos for display
      return Promise.resolve(newPhotos);
    });
}

// Get photos from IndexedDB
function getPhotosFromStorage() {
  return JalikaPhotoDB.getAllPhotos()
    .then(photos => {
      console.log(`Retrieved ${photos.length} photos from database`);
      return photos;
    })
    .catch(error => {
      console.error('Error getting photos from storage:', error);
      return [];
    });
}

// Display photos from storage or provided array
function displayPhotos(photos) {
  // If photos is provided directly, use it
  // Otherwise load from storage
  const getPhotosPromise = photos 
    ? Promise.resolve(photos)
    : JalikaPhotoDB.getPhotosSortedByDate();
  
  // Get album content
  const albumContent = document.querySelector('.album-content');
  if (!albumContent) {
    console.error('Album content container not found');
    return Promise.reject(new Error('Album content container not found'));
  }
  
  // Show loading
  albumContent.innerHTML = `
    <div class="jalika-loading-indicator">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading photos...</p>
    </div>
  `;
  
  // Load and display photos
  return getPhotosPromise
    .then(loadedPhotos => {
      // If no photos, show empty state
      if (!loadedPhotos || loadedPhotos.length === 0) {
        albumContent.innerHTML = `
          <div class="empty-album">
            <i class="fas fa-leaf"></i>
            <p>No photos imported yet</p>
            <p>Click "Import Photos" to add photos to your plants</p>
            
            <div class="jalika-help-box">
              <h4><i class="fab fa-apple"></i> Apple Photos Instructions</h4>
              <p>To import photos from Apple Photos:</p>
              <ol class="jalika-help-steps">
                <li>Open Photos app on your Mac</li>
                <li>Go to your "Hydroponic Garden 2025" album</li>
                <li>Select photos (Cmd+click for multiple)</li>
                <li>File → Export → Export <strong>Unmodified Original</strong></li>
                <li>Check the "Include IPTC as XMP" option</li>
                <li>Save to a location you can find easily</li>
                <li>Return to Jalika and click "Import Photos"</li>
                <li>Select <strong>both</strong> the image files and XMP files</li>
              </ol>
              <p class="jalika-tip"><i class="fas fa-lightbulb"></i> Tip: Select all files (images and .xmp files) when importing to preserve capture dates for your plant photos.</p>
            </div>
          </div>
        `;
        return [];
      }
      
      // Show photo count
      let html = `
        <div class="jalika-photos-header">
          <span class="jalika-photo-count">${loadedPhotos.length} photos in library</span>
        </div>
        <div class="jalika-photo-grid">
      `;
      
      // Add each photo
      loadedPhotos.forEach(function(photo) {
        const dateStr = photo.date ? formatDateForDisplay(photo.date) : 'Unknown date';
        
        html += `
          <div class="jalika-photo-item" data-id="${photo.id}">
            <img src="${photo.url}" alt="${photo.name || 'Plant photo'}">
            <div class="jalika-photo-info">
              <div class="jalika-photo-name">${photo.name || 'Photo'}</div>
              <div class="jalika-photo-date">${dateStr}</div>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      
      // Set content
      albumContent.innerHTML = html;
      
      // Add click handlers to photos
      const photoItems = albumContent.querySelectorAll('.jalika-photo-item');
      photoItems.forEach(function(item) {
        item.addEventListener('click', function() {
          const photoId = this.getAttribute('data-id');
          const photo = loadedPhotos.find(p => p.id === photoId);
          
          if (photo) {
            showPhotoDetail(photo);
          }
        });
      });
      
      return loadedPhotos;
    })
    .catch(error => {
      console.error('Error displaying photos:', error);
      
      // Show error state
      albumContent.innerHTML = `
        <div class="jalika-error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error loading photos: ${error.message || 'Unknown error'}</p>
          <button id="retry-load-button" class="jalika-retry-button">
            <i class="fas fa-redo"></i> Try Again
          </button>
        </div>
      `;
      
      // Add retry button handler
      const retryButton = document.getElementById('retry-load-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          displayPhotos();
        });
      }
      
      return [];
    });
}

// Helper function for displayPhotos
function formatDateForDisplay(date) {
  if (!date) return 'Unknown';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Unknown';
    
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.warn('Error formatting date:', e);
    return String(date);
  }
}

// Add these styles to the document once it's loaded
document.addEventListener('DOMContentLoaded', function() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
  .jalika-saving-indicator {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }
  
  .jalika-saving-content {
    text-align: center;
    background-color: white;
    padding: 25px 30px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }
  
  .jalika-saving-content i {
    font-size: 30px;
    margin-bottom: 15px;
    color: #4CAF50;
  }
  
  .jalika-retry-button {
    margin-top: 15px;
    padding: 8px 16px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  
  .jalika-retry-button:hover {
    background-color: #3e8e41;
  }
  `;
  document.head.appendChild(styleEl);
});