// Jalika - Photo Album Enhancement
// This module adds a photo album feature to the Plants tab

const JalikaPhotoAlbum = (function() {
    'use strict';
    
    // Configuration
    const config = {
        dbName: 'jalika_photos_db',
        dbVersion: 1,
        storeName: 'photos',
        weeksToShow: 12 // Default number of weeks to display
    };
    
    // Database handle
    let db;
    
    // Initialize the module
    function init() {
        console.log('[JalikaPhotoAlbum] Initializing...');
        
        // Open IndexedDB
        initDatabase()
            .then(() => {
                console.log('[JalikaPhotoAlbum] Database initialized');
                
                // Create UI
                createPhotoAlbumUI();
                
                // First clean up any duplicates
                removeDuplicatesByFilename()
                    .then(() => {
                        // Then load photos to display
                        loadAndDisplayPhotos();
                    })
                    .catch(error => {
                        console.error('[JalikaPhotoAlbum] Error cleaning duplicates:', error);
                        // Still try to load photos even if cleanup fails
                        loadAndDisplayPhotos();
                    });
            })
            .catch(error => {
                console.error('[JalikaPhotoAlbum] Initialization error:', error);
            });
    }
    
    // Initialize IndexedDB
    function initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(config.dbName, config.dbVersion);
            
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(config.storeName)) {
                    const objectStore = db.createObjectStore(config.storeName, { keyPath: 'id' });
                    objectStore.createIndex('name', 'name', { unique: false });
                    objectStore.createIndex('date', 'date', { unique: false });
                    console.log('[JalikaPhotoAlbum] Object store created');
                }
            };
            
            request.onsuccess = function(event) {
                db = event.target.result;
                console.log('[JalikaPhotoAlbum] Database opened successfully');
                resolve();
            };
            
            request.onerror = function(event) {
                console.error('[JalikaPhotoAlbum] Database error:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // Create the Photo Album UI in the Plants tab
    function createPhotoAlbumUI() {
        // Find the plants tab
        const plantsTab = document.getElementById('plants');
        if (!plantsTab) {
            console.error('[JalikaPhotoAlbum] Plants tab not found');
            return;
        }
        
        // Check if the album already exists
        if (document.getElementById('jalika-photo-album')) {
            console.log('[JalikaPhotoAlbum] Photo album already exists');
            return;
        }
        
        // Create the album container
        const albumContainer = document.createElement('div');
        albumContainer.id = 'jalika-photo-album';
        albumContainer.className = 'jalika-photo-album';
        
        // Add heading and controls
        albumContainer.innerHTML = `
            <h2>Plant Photos By Week</h2>
            <div class="jalika-album-controls">
                <button id="import-photos-button" class="jalika-button">
                    <i class="fas fa-file-import"></i> Import Photos
                </button>
                <button id="cleanup-photos-button" class="jalika-button jalika-cleanup-button">
                    <i class="fas fa-broom"></i> Remove Duplicates
                </button>
                <div class="jalika-weeks-selector">
                    <label for="weeks-to-show">Weeks to show:</label>
                    <select id="weeks-to-show">
                        <option value="4">4 weeks</option>
                        <option value="8">8 weeks</option>
                        <option value="12" selected>12 weeks</option>
                        <option value="16">16 weeks</option>
                        <option value="24">24 weeks</option>
                        <option value="52">52 weeks</option>
                    </select>
                </div>
            </div>
            <div class="album-content">
                <div class="empty-album">
                    <i class="fas fa-leaf"></i>
                    <p>No photos imported yet</p>
                    <p>Click "Import Photos" to add photos to your plants</p>
                </div>
            </div>
        `;
        
        // Add to plants tab
        plantsTab.appendChild(albumContainer);
        
        // Add event listeners
        const importButton = document.getElementById('import-photos-button');
        if (importButton) {
            importButton.addEventListener('click', handlePhotoImport);
        }
        
        const cleanupButton = document.getElementById('cleanup-photos-button');
        if (cleanupButton) {
            cleanupButton.addEventListener('click', function() {
                if (confirm("This will remove duplicate photos. Continue?")) {
                    showLoadingIndicator("Removing duplicates...");
                    removeDuplicatesByFilename()
                        .then(() => {
                            loadAndDisplayPhotos();
                            hideLoadingIndicator();
                            alert("Duplicates removed successfully");
                        })
                        .catch(error => {
                            console.error('[JalikaPhotoAlbum] Cleanup error:', error);
                            hideLoadingIndicator();
                            alert("Error removing duplicates: " + error.message);
                        });
                }
            });
        }
        
        // Add weeks selector event listener
        const weeksSelector = document.getElementById('weeks-to-show');
        if (weeksSelector) {
            weeksSelector.addEventListener('change', function() {
                config.weeksToShow = parseInt(this.value);
                loadAndDisplayPhotos();
            });
        }
        
        console.log('[JalikaPhotoAlbum] Photo album UI created');
    }
    
    // Handle import button click
    function handlePhotoImport() {
        console.log('[JalikaPhotoAlbum] Import button clicked');
        
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/jpeg,image/png,application/xml,.xml,.xmp,text/xml';
        
        // Alert user about including XMP files
        alert("Please select BOTH your image files AND their .XMP metadata files to correctly import dates. Select all files at once in the file dialog.");
        
        // Handle file selection
        fileInput.addEventListener('change', function(event) {
            if (!event.target.files.length) return;
            
            console.log(`[JalikaPhotoAlbum] Selected ${event.target.files.length} files`);
            
            // Process the files
            processFiles(event.target.files);
        });
        
        // Trigger file dialog
        fileInput.click();
    }
    
    // Process selected files
    function processFiles(fileList) {
        console.log('[JalikaPhotoAlbum] Processing files...');
        
        // Show loading indicator
        showLoadingIndicator(`Processing ${fileList.length} files...`);
        
        // Convert FileList to array
        const files = Array.from(fileList);
        
        // Separate image files and metadata files
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        const metadataFiles = files.filter(file => 
            file.name.toLowerCase().endsWith('.xml') || 
            file.name.toLowerCase().endsWith('.xmp') ||
            file.type === 'application/xml' ||
            file.type === 'text/xml'
        );
        
        console.log(`[JalikaPhotoAlbum] Found ${imageFiles.length} images and ${metadataFiles.length} metadata files`);
        
        // Process each image
        const photoPromises = imageFiles.map(imageFile => {
            return new Promise((resolve, reject) => {
                // Create unique ID from filename
                const photoId = imageFile.name;
                
                // Find matching metadata file
                const baseName = imageFile.name.substring(0, imageFile.name.lastIndexOf('.'));
                const matchingMetadata = metadataFiles.find(metaFile => {
                    const metaBaseName = metaFile.name.substring(0, metaFile.name.lastIndexOf('.'));
                    return metaBaseName === baseName || 
                           metaFile.name === baseName + '.xmp' ||
                           metaBaseName.includes(baseName) || 
                           baseName.includes(metaBaseName);
                });
                
                // Read image as data URL
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const photoData = {
                        id: photoId,
                        url: e.target.result,
                        name: imageFile.name,
                        date: null,
                        type: imageFile.type,
                        importDate: new Date().toISOString()
                    };
                    
                    if (matchingMetadata) {
                        // Process metadata
                        processMetadataFile(matchingMetadata)
                            .then(metadata => {
                                if (metadata.dateCreated) {
                                    photoData.date = metadata.dateCreated;
                                }
                                resolve(photoData);
                            })
                            .catch(error => {
                                console.warn('[JalikaPhotoAlbum] Metadata error:', error);
                                resolve(photoData);
                            });
                    } else {
                        // No metadata, just use image
                        resolve(photoData);
                    }
                };
                
                reader.onerror = function() {
                    reject(new Error(`Failed to read file: ${imageFile.name}`));
                };
                
                reader.readAsDataURL(imageFile);
            });
        });
        
        // Process all photos
        Promise.all(photoPromises)
            .then(photos => {
                console.log(`[JalikaPhotoAlbum] Processed ${photos.length} photos`);
                return savePhotos(photos);
            })
            .then(() => {
                hideLoadingIndicator();
                removeDuplicatesByFilename()
                    .then(() => {
                        loadAndDisplayPhotos();
                    });
            })
            .catch(error => {
                console.error('[JalikaPhotoAlbum] Error processing photos:', error);
                hideLoadingIndicator();
                alert('Error processing photos. Please try again.');
            });
    }
    
    // Process metadata file
    function processMetadataFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const content = e.target.result;
                
                try {
                    // Extract metadata (especially date)
                    const metadata = {};
                    
                    // Try different ways to find date
                    const dateMatch = content.match(/<photoshop:DateCreated>(.*?)<\/photoshop:DateCreated>/);
                    if (dateMatch && dateMatch[1]) {
                        metadata.dateCreated = dateMatch[1];
                    } else {
                        const anyDateMatch = content.match(/DateCreated[^>]*>(.*?)</);
                        if (anyDateMatch && anyDateMatch[1]) {
                            metadata.dateCreated = anyDateMatch[1];
                        }
                    }
                    
                    resolve(metadata);
                } catch (error) {
                    console.error('[JalikaPhotoAlbum] Error parsing metadata:', error);
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error(`Failed to read metadata file: ${file.name}`));
            };
            
            reader.readAsText(file);
        });
    }
    
    // Remove duplicate photos based on filename
    function removeDuplicatesByFilename() {
        return new Promise((resolve, reject) => {
            console.log('[JalikaPhotoAlbum] Removing duplicate photos...');
            
            if (!db) {
                console.error('[JalikaPhotoAlbum] Database not initialized');
                return reject(new Error('Database not initialized'));
            }
            
            getAllPhotos()
                .then(photos => {
                    if (!photos || photos.length === 0) {
                        console.log('[JalikaPhotoAlbum] No photos to deduplicate');
                        return resolve();
                    }
                    
                    // Group photos by filename
                    const photosByName = {};
                    photos.forEach(photo => {
                        if (!photosByName[photo.name]) {
                            photosByName[photo.name] = photo;
                        }
                    });
                    
                    // Get unique photos
                    const uniquePhotos = Object.values(photosByName);
                    console.log(`[JalikaPhotoAlbum] Found ${uniquePhotos.length} unique photos out of ${photos.length} total`);
                    
                    if (uniquePhotos.length === photos.length) {
                        console.log('[JalikaPhotoAlbum] No duplicates to remove');
                        return resolve();
                    }
                    
                    // Clear database and add unique photos
                    const transaction = db.transaction([config.storeName], 'readwrite');
                    const store = transaction.objectStore(config.storeName);
                    
                    store.clear().onsuccess = function() {
                        uniquePhotos.forEach(photo => {
                            store.add(photo);
                        });
                    };
                    
                    transaction.oncomplete = function() {
                        console.log(`[JalikaPhotoAlbum] Removed ${photos.length - uniquePhotos.length} duplicates`);
                        resolve();
                    };
                    
                    transaction.onerror = function(event) {
                        reject(event.target.error);
                    };
                })
                .catch(reject);
        });
    }
    
    // Save photos to database
    function savePhotos(photos) {
        return new Promise((resolve, reject) => {
            if (!db) {
                return reject(new Error('Database not initialized'));
            }
            
            console.log(`[JalikaPhotoAlbum] Saving ${photos.length} photos`);
            
            getAllPhotos()
                .then(existingPhotos => {
                    // Create a map of existing photos by name
                    const existingByName = {};
                    existingPhotos.forEach(photo => {
                        existingByName[photo.name] = photo;
                    });
                    
                    // For each new photo, update or add
                    const transaction = db.transaction([config.storeName], 'readwrite');
                    const store = transaction.objectStore(config.storeName);
                    
                    photos.forEach(photo => {
                        if (existingByName[photo.name]) {
                            // If existing photo has date but new one doesn't, keep date
                            if (!photo.date && existingByName[photo.name].date) {
                                photo.date = existingByName[photo.name].date;
                            }
                            store.put(photo);
                        } else {
                            store.add(photo);
                        }
                    });
                    
                    transaction.oncomplete = function() {
                        console.log('[JalikaPhotoAlbum] Photos saved successfully');
                        resolve();
                    };
                    
                    transaction.onerror = function(event) {
                        reject(event.target.error);
                    };
                })
                .catch(reject);
        });
    }
    
    // Get all photos from database
    function getAllPhotos() {
        return new Promise((resolve, reject) => {
            if (!db) {
                return reject(new Error('Database not initialized'));
            }
            
            const transaction = db.transaction([config.storeName], 'readonly');
            const store = transaction.objectStore(config.storeName);
            const request = store.getAll();
            
            request.onsuccess = function() {
                resolve(request.result || []);
            };
            
            request.onerror = function(event) {
                reject(event.target.error);
            };
        });
    }
    
    // Categorize photos by week
    function categorizePhotosByWeek(photos) {
        // First, ensure all photos have a usable date
        const photosWithDates = photos.map(photo => {
            let usableDate;
            if (photo.date) {
                usableDate = new Date(photo.date);
            } else {
                usableDate = new Date(photo.importDate);
            }
            
            // Make sure date is valid
            if (isNaN(usableDate.getTime())) {
                usableDate = new Date(photo.importDate);
            }
            
            return {
                ...photo,
                usableDate: usableDate
            };
        });
        
        // Sort photos by date (oldest first)
        photosWithDates.sort((a, b) => a.usableDate - b.usableDate);
        
        // If no photos, return empty array
        if (photosWithDates.length === 0) {
            return [];
        }
        
        // Get the earliest date
        const earliestDate = new Date(photosWithDates[0].usableDate);
        
        // Initialize weeks array
        const weeks = [];
        
        for (let i = 0; i < config.weeksToShow; i++) {
            // Calculate start and end of week
            const weekStartDate = new Date(earliestDate);
            weekStartDate.setDate(weekStartDate.getDate() + (i * 7));
            
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekEndDate.getDate() + 6);
            
            // Filter photos for this week
            const photosInWeek = photosWithDates.filter(photo => {
                return photo.usableDate >= weekStartDate && photo.usableDate <= weekEndDate;
            });
            
            // Add week to array if it has photos
            if (photosInWeek.length > 0) {
                weeks.push({
                    weekNumber: i + 1,
                    startDate: weekStartDate,
                    endDate: weekEndDate,
                    photos: photosInWeek
                });
            }
        }
        
        return weeks;
    }
    
    // Load and display photos from database
    function loadAndDisplayPhotos() {
        getAllPhotos()
            .then(photos => {
                console.log(`[JalikaPhotoAlbum] Loaded ${photos.length} photos from database`);
                const photosByWeek = categorizePhotosByWeek(photos);
                displayPhotosByWeek(photosByWeek, photos.length);
            })
            .catch(error => {
                console.error('[JalikaPhotoAlbum] Error loading photos:', error);
            });
    }
    
    // Display photos categorized by week
    function displayPhotosByWeek(weeks, totalPhotoCount) {
        const albumContent = document.querySelector('.album-content');
        if (!albumContent) {
            console.error('[JalikaPhotoAlbum] Album content element not found');
            return;
        }
        
        if (totalPhotoCount === 0) {
            // Show empty state
            albumContent.innerHTML = `
                <div class="empty-album">
                    <i class="fas fa-leaf"></i>
                    <p>No photos imported yet</p>
                    <p>Click "Import Photos" to add photos to your plants</p>
                </div>
            `;
            return;
        }
        
        // Display photo count
        let html = `
            <div class="jalika-photos-header">
                <span class="jalika-photo-count">${totalPhotoCount} photos in library</span>
            </div>
        `;
        
        // If no grouped photos, show message
        if (weeks.length === 0) {
            html += `
                <div class="jalika-no-weekly-photos">
                    <p>Photos imported but couldn't be organized by week. They may be missing dates or all fall outside the selected week range.</p>
                </div>
            `;
            albumContent.innerHTML = html;
            return;
        }
        
        // Add each week
        weeks.forEach(week => {
            const formattedStartDate = formatDateForDisplay(week.startDate, true);
            const formattedEndDate = formatDateForDisplay(week.endDate, true);
            
            html += `
                <div class="jalika-week-section">
                    <div class="jalika-week-header">
                        <h3>Week ${week.weekNumber}</h3>
                        <span class="jalika-week-date">${formattedStartDate} - ${formattedEndDate}</span>
                        <span class="jalika-week-photo-count">${week.photos.length} photos</span>
                    </div>
                    <div class="jalika-photo-grid">
            `;
            
            // Add photos for this week
            week.photos.forEach(photo => {
                const dateText = formatDateForDisplay(photo.usableDate);
                
                html += `
                    <div class="jalika-photo-item" data-photo-id="${photo.id}">
                        <div class="jalika-photo-day-badge">${photo.usableDate.getDate()}</div>
                        <img src="${photo.url}" alt="${photo.name}">
                        <div class="jalika-photo-info">
                            <div class="jalika-photo-name">${photo.name}</div>
                            <div class="jalika-photo-date">${dateText}</div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        // Update content
        albumContent.innerHTML = html;
        
        // Add click handlers for photo details
        document.querySelectorAll('.jalika-photo-item').forEach(item => {
            item.addEventListener('click', function() {
                const photoId = this.getAttribute('data-photo-id');
                
                // Find the photo in the weeks data
                let clickedPhoto = null;
                for (const week of weeks) {
                    const found = week.photos.find(p => p.id === photoId);
                    if (found) {
                        clickedPhoto = found;
                        break;
                    }
                }
                
                if (clickedPhoto) {
                    showPhotoDetail(clickedPhoto);
                }
            });
        });
    }
    
    // Format date for display
    function formatDateForDisplay(dateObj, shortFormat = false) {
        if (!dateObj) return 'No date available';
        
        try {
            if (shortFormat) {
                // Short format for week headers (e.g., Mar 1)
                return dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
            } else {
                // Full format for photo details
                return dateObj.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (e) {
            return 'Invalid date format';
        }
    }
    
    // Show photo detail in modal
    function showPhotoDetail(photo) {
        let modal = document.getElementById('jalika-photo-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'jalika-photo-modal';
            modal.className = 'jalika-photo-modal';
            document.body.appendChild(modal);
        }
        
        const dateText = formatDateForDisplay(photo.usableDate);
        const importDateText = formatDateForDisplay(new Date(photo.importDate));
        
        // Calculate week number
        const weekNumber = Math.floor(
            (photo.usableDate - new Date(photo.usableDate).setDate(
                new Date(photo.usableDate).getDate() - new Date(photo.usableDate).getDay()
            )) / (7 * 24 * 60 * 60 * 1000)
        ) + 1;
        
        modal.innerHTML = `
            <div class="jalika-photo-modal-content">
                <span class="jalika-photo-modal-close">&times;</span>
                <div class="jalika-photo-modal-image">
                    <img src="${photo.url}" alt="${photo.name}">
                </div>
                <div class="jalika-photo-modal-info">
                    <h3>${photo.name}</h3>
                    <p><strong>Week:</strong> Week ${weekNumber}</p>
                    <p><strong>Date Captured:</strong> ${dateText}</p>
                    <p><strong>Imported:</strong> ${importDateText}</p>
                </div>
            </div>
        `;
        
        // Show modal
        modal.style.display = 'flex';
        
        // Close modal on X or outside click
        const closeBtn = modal.querySelector('.jalika-photo-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        modal.addEventListener('click', event => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Show loading indicator
    function showLoadingIndicator(message) {
        let indicator = document.querySelector('.jalika-loading-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'jalika-loading-indicator';
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <div class="jalika-loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <p>${message || 'Loading...'}</p>
            </div>
        `;
        
        indicator.style.display = 'flex';
    }
    
    // Hide loading indicator
    function hideLoadingIndicator() {
        const indicator = document.querySelector('.jalika-loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    // Return public API
    return {
        init
    };
})();

// Initialize photo album when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for the main app to initialize first
    setTimeout(function() {
        JalikaPhotoAlbum.init();
    }, 2000);
});

// Direct Photo Delete Script
// This is a standalone script that adds photo deletion capabilities

// Wait for the page to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('[PhotoDelete] Script loaded');
    
    // Wait a bit for the main app to initialize
    setTimeout(function() {
        console.log('[PhotoDelete] Initializing delete functionality');
        initDeleteFeatures();
        
        // Remove the duplicates button since we handle this automatically
        removeDuplicatesButton();
    }, 3000);
});

// Remove the "Remove Duplicates" button since we handle duplications automatically
function removeDuplicatesButton() {
    console.log('[PhotoDelete] Removing duplicates button');
    
    // Find the button by text content and/or class
    const buttons = document.querySelectorAll('.jalika-album-controls button');
    
    buttons.forEach(button => {
        const buttonText = button.textContent.trim();
        if (buttonText.includes('Remove Duplicates') || 
            buttonText.includes('duplicates') ||
            button.classList.contains('jalika-cleanup-button')) {
            
            console.log('[PhotoDelete] Found duplicates button, removing it');
            button.remove();
        }
    });
}

// Initialize delete features
function initDeleteFeatures() {
    // Add delete all button
    addDeleteAllButton();
    
    // Set up event listener for detecting photo clicks
    setupPhotoDetailListener();
}

// Add Delete All button
function addDeleteAllButton() {
    console.log('[PhotoDelete] Adding Delete All button');
    
    // Find the controls bar
    const controlsBar = document.querySelector('.jalika-album-controls');
    if (!controlsBar) {
        console.error('[PhotoDelete] Could not find controls bar');
        return;
    }
    
    // Create button
    const deleteAllBtn = document.createElement('button');
    deleteAllBtn.className = 'jalika-button';
    deleteAllBtn.style.backgroundColor = 'red';
    deleteAllBtn.style.color = 'white';
    deleteAllBtn.style.marginLeft = 'auto';
    deleteAllBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete All Photos';
    
    // Add event handler
    deleteAllBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete ALL photos? This cannot be undone.')) {
            deleteAllPhotos();
        }
    });
    
    // Add to controls
    controlsBar.appendChild(deleteAllBtn);
    console.log('[PhotoDelete] Delete All button added');
}

// Delete all photos from database
function deleteAllPhotos() {
    console.log('[PhotoDelete] Deleting all photos');
    
    // Show loading overlay
    showLoading('Deleting all photos...');
    
    // Get database instance
    openDatabase().then(db => {
        // Clear photos store
        const transaction = db.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');
        const request = store.clear();
        
        request.onsuccess = function() {
            console.log('[PhotoDelete] All photos deleted');
            
            // Refresh the page to show empty state
            hideLoading();
            alert('All photos have been deleted.');
            window.location.reload();
        };
        
        request.onerror = function(event) {
            console.error('[PhotoDelete] Error deleting photos:', event.target.error);
            hideLoading();
            alert('Error deleting photos. Please try again.');
        };
    }).catch(error => {
        console.error('[PhotoDelete] Database error:', error);
        hideLoading();
        alert('Database error. Please try again.');
    });
}

// Set up listener for photo detail modal
function setupPhotoDetailListener() {
    console.log('[PhotoDelete] Setting up photo detail listener');
    
    // Listen for clicks on photo items
    document.addEventListener('click', function(event) {
        // Check if a photo was clicked
        const photoItem = event.target.closest('.jalika-photo-item');
        if (photoItem) {
            console.log('[PhotoDelete] Photo clicked, watching for modal');
            
            // Set a timer to check for the modal appearing
            setTimeout(checkForModal, 300);
        }
    });
    
    // Listen for modal appearance
    function checkForModal() {
        const modal = document.querySelector('.jalika-photo-modal');
        if (modal && modal.style.display === 'flex') {
            console.log('[PhotoDelete] Modal detected, adding delete button');
            
            // Add delete button if not already present
            if (!document.querySelector('#direct-delete-button')) {
                addDeleteButtonToModal(modal);
            }
        } else {
            // Try again in case modal appears with delay
            setTimeout(checkForModal, 300);
        }
    }
}

// Add delete button to photo modal
function addDeleteButtonToModal(modal) {
    // Find the info section
    const infoSection = modal.querySelector('.jalika-photo-modal-info');
    if (!infoSection) {
        console.error('[PhotoDelete] Info section not found in modal');
        return;
    }
    
    // Get photo name for deletion
    const photoName = infoSection.querySelector('h3').textContent;
    
    // Create action section if it doesn't exist
    let actionsSection = infoSection.querySelector('.jalika-photo-actions');
    if (!actionsSection) {
        actionsSection = document.createElement('div');
        actionsSection.className = 'jalika-photo-actions';
        actionsSection.style.marginTop = '20px';
        actionsSection.style.display = 'flex';
        actionsSection.style.justifyContent = 'flex-end';
        infoSection.appendChild(actionsSection);
    }
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'direct-delete-button';
    deleteBtn.className = 'jalika-button';
    deleteBtn.style.backgroundColor = 'red';
    deleteBtn.style.color = 'white';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Photo';
    
    // Add event handler
    deleteBtn.addEventListener('click', function() {
        if (confirm(`Are you sure you want to delete "${photoName}"?`)) {
            deletePhoto(photoName, modal);
        }
    });
    
    // Add button to actions
    actionsSection.appendChild(deleteBtn);
    console.log('[PhotoDelete] Delete button added to modal');
}

// Delete specific photo
function deletePhoto(photoName, modal) {
    console.log(`[PhotoDelete] Deleting photo: ${photoName}`);
    
    // Show loading overlay
    showLoading(`Deleting ${photoName}...`);
    
    // Get database instance
    openDatabase().then(db => {
        // Get all photos
        const transaction = db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const request = store.getAll();
        
        request.onsuccess = function() {
            const photos = request.result;
            
            // Find photo by name
            const photoToDelete = photos.find(p => p.name === photoName);
            
            if (photoToDelete) {
                // Delete the photo
                const deleteTransaction = db.transaction(['photos'], 'readwrite');
                const deleteStore = deleteTransaction.objectStore('photos');
                const deleteRequest = deleteStore.delete(photoToDelete.id);
                
                deleteRequest.onsuccess = function() {
                    console.log(`[PhotoDelete] Photo "${photoName}" deleted`);
                    
                    // Close modal and refresh
                    modal.style.display = 'none';
                    hideLoading();
                    alert(`"${photoName}" has been deleted.`);
                    window.location.reload();
                };
                
                deleteRequest.onerror = function(event) {
                    console.error('[PhotoDelete] Error deleting photo:', event.target.error);
                    hideLoading();
                    alert('Error deleting photo. Please try again.');
                };
            } else {
                console.error(`[PhotoDelete] Could not find photo: ${photoName}`);
                hideLoading();
                alert('Could not find photo. Please try again.');
            }
        };
        
        request.onerror = function(event) {
            console.error('[PhotoDelete] Error getting photos:', event.target.error);
            hideLoading();
            alert('Error retrieving photos. Please try again.');
        };
    }).catch(error => {
        console.error('[PhotoDelete] Database error:', error);
        hideLoading();
        alert('Database error. Please try again.');
    });
}

// Open database connection
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('jalika_photos_db', 1);
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            resolve(db);
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // Create photos store if it doesn't exist
            if (!db.objectStoreNames.contains('photos')) {
                db.createObjectStore('photos', { keyPath: 'id' });
            }
        };
    });
}

// Show loading overlay
function showLoading(message) {
    // Check if overlay exists
    let overlay = document.querySelector('.photo-delete-loading');
    
    if (!overlay) {
        // Create overlay
        overlay = document.createElement('div');
        overlay.className = 'photo-delete-loading';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        
        // Create content
        const content = document.createElement('div');
        content.style.backgroundColor = 'white';
        content.style.padding = '20px';
        content.style.borderRadius = '8px';
        content.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        content.style.textAlign = 'center';
        
        // Add spinner (Font Awesome)
        const spinner = document.createElement('div');
        spinner.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 36px; color: #8DC26F; margin-bottom: 10px;"></i>';
        
        // Add message
        const messageEl = document.createElement('div');
        messageEl.textContent = message || 'Loading...';
        
        // Assemble
        content.appendChild(spinner);
        content.appendChild(messageEl);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    } else {
        // Update message
        const messageEl = overlay.querySelector('div > div:last-child');
        if (messageEl) {
            messageEl.textContent = message || 'Loading...';
        }
        
        // Show overlay
        overlay.style.display = 'flex';
    }
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.querySelector('.photo-delete-loading');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Auto-initialize when added to the page
console.log('[PhotoDelete] Script ready');