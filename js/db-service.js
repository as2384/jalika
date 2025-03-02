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
