// Main Application Logic for Jalika

// Immediately invoked function expression to avoid polluting global namespace
(function() {
    'use strict';
    
    // App state
    const app = {
        // Current active tab
        currentTab: 'dashboard',
        
        // Sensor data (will be updated from Google Sheets)
        sensorData: {
            ph: 6.5,
            tds: 840,
            ec: 1.2,
            temp: 22.5,
            lastUpdated: new Date()
        },

        optimalRanges: JalikaConfig.optimalRanges,
        
        // Plant data array (will be populated from Google Sheets)
        plants: [],
        
        // Priority actions and recommendations
        actions: [
            {
                title: 'Check pH levels',
                description: 'pH is above optimal range. Adjust nutrient solution.',
                priority: 'urgent'
            },
            {
                title: 'Prune Basil (Pod #1)',
                description: 'Plant is getting too bushy, prune to promote growth.',
                priority: 'warning'
            }
        ],
        
        recommendations: [
            {
                title: 'Water Change Schedule',
                description: 'Consider changing reservoir water in the next 3 days.',
                icon: 'tint'
            },
            {
                title: 'Light Duration',
                description: 'Current light schedule is optimal for vegetative growth.',
                icon: 'sun'
            }
        ]
    };
    
    // DOM elements
    const elements = {
        tabButtons: document.querySelectorAll('.tab-button'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        sensorValues: {
            ph: document.getElementById('ph-value'),
            tds: document.getElementById('tds-value'),
            ec: document.getElementById('ec-value'),
            temp: document.getElementById('temp-value')
        },
        sensorGraph: document.getElementById('sensor-graph'),
        plantPods: document.querySelector('.plant-pods'),
        plantDetailModal: document.getElementById('plant-detail-modal'),
        closeModal: document.querySelector('.close-modal'),
        modalPlantName: document.getElementById('modal-plant-name'),
        modalPodNumber: document.getElementById('modal-pod-number'),
        modalPlantCartoon: document.getElementById('modal-plant-cartoon'),
        modalCatchPhrase: document.getElementById('modal-catch-phrase'),
        modalGrowthStage: document.getElementById('modal-growth-stage'),
        modalHealthStatus: document.getElementById('modal-health-status'),
        modalDays: document.getElementById('modal-days'),
        modalIssuesList: document.getElementById('issues-list'),
        updatePhotoButton: document.getElementById('update-plant-photo'),
        editPlantInfoButton: document.getElementById('edit-plant-info'),
        priorityActionsList: document.getElementById('priority-actions-list'),
        generalRecommendationsList: document.getElementById('general-recommendations-list'),
        lastUpdatedTime: document.getElementById('last-updated-time'),
        refreshButton: document.getElementById('refresh-data'),
        appVersion: document.getElementById('app-version')
    };
    
    // Initialize the application
    function init() {
        console.log('Initializing Jalika app...');
        
        // Set up event listeners
        setupEventListeners();
        
        // Ensure the modal has all required elements
        ensureModalElements();
        
        // Listen for data updates from the JalikaData module
        document.addEventListener('jalika:dataUpdated', handleDataUpdate);
        
        // Initial UI setup with loading states
        showLoadingState();
        
        // Set app version
        updateAppVersion();
        
        console.log('Jalika app initialized successfully!');
    }
    
    // Update app version display
    function updateAppVersion() {
        // Default version
        let version = '1.0.0';
        
        // Get current date for timestamping if no version is available
        const now = new Date();
        const dateString = `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()}`;
        
        // Try to fetch version.json which can be updated on deployment
        fetch('version.json')
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Version file not found');
                }
            })
            .then(data => {
                if (data && data.version) {
                    version = data.version;
                } else if (data && data.commit) {
                    version = `1.0.0-${data.commit.substring(0, 7)}`;
                }
                elements.appVersion.textContent = version;
            })
            .catch(error => {
                console.warn('Could not load version info:', error);
                // Use date-based version as fallback
                elements.appVersion.textContent = `${dateString}`;
            });
    }
    
    // Function to update the handleDataUpdate in app.js
    // This ensures the dashboard displays the latest measurements

    // Function to update the handleDataUpdate in app.js
    // This ensures the dashboard displays the latest measurements
    function handleDataUpdate() {
        console.log('[Jalika] Data updated, refreshing UI...');
        
        try {
            // Get latest data
            app.plants = JalikaData.getPlants();
            const measurements = JalikaData.getMeasurements();
            
            // Update sensor data from latest measurements
            if (measurements && measurements.latest) {
                app.sensorData = {
                    ph: measurements.latest.ph,
                    tds: measurements.latest.tds,
                    ec: measurements.latest.ec,
                    temp: measurements.latest.temp,
                    lastUpdated: new Date(measurements.latest.timestamp)
                };
                
                console.log('[Jalika] Updated dashboard with latest measurements:', {
                    pH: app.sensorData.ph.toFixed(1),
                    TDS: Math.round(app.sensorData.tds),
                    EC: app.sensorData.ec.toFixed(1),
                    Temperature: app.sensorData.temp.toFixed(1),
                    Timestamp: app.sensorData.lastUpdated.toLocaleString()
                });
            }
            
            // Update UI components with the latest values
            updateSensorDisplay();
            renderPlantPods();
            
            // Load saved images from IndexedDB and apply them to plants
            loadSavedImages().then(() => {
                console.log('[Jalika] Saved images loaded and applied to plants');
                // Re-render plant pods after loading images
                renderPlantPods();
            });
            
            renderActionLists();
            updateLastUpdatedTime();
            
            // Update charts if JalikaCharts is available
            if (typeof JalikaCharts !== 'undefined' && JalikaCharts.updateCharts) {
                console.log('[Jalika] Updating charts with measurement data');
                JalikaCharts.updateCharts(measurements);
            } else {
                console.warn('[Jalika] JalikaCharts not available, charts will not be updated');
            }
            
            // Remove loading state
            hideLoadingState();
        } catch (error) {
            console.error('[Jalika] Error in handleDataUpdate:', error);
        }
    }

    // Update sensor display with current values
    function updateSensorDisplay() {
        // Update value displays with formatted values
        elements.sensorValues.ph.textContent = app.sensorData.ph.toFixed(1);
        elements.sensorValues.tds.textContent = Math.round(app.sensorData.tds);
        elements.sensorValues.ec.textContent = app.sensorData.ec.toFixed(1);
        elements.sensorValues.temp.textContent = app.sensorData.temp.toFixed(1);
        
        // Apply warning/danger classes based on optimal ranges
        applyValueStatusClass(elements.sensorValues.ph, app.sensorData.ph, app.optimalRanges.ph);
        applyValueStatusClass(elements.sensorValues.tds, app.sensorData.tds, app.optimalRanges.tds);
        applyValueStatusClass(elements.sensorValues.ec, app.sensorData.ec, app.optimalRanges.ec);
        applyValueStatusClass(elements.sensorValues.temp, app.sensorData.temp, app.optimalRanges.temp);
        
        // Update graph area with timestamp information - using friendly date format
        if (app.sensorData.lastUpdated) {
            const formattedTimestamp = JalikaConfig.formatDate(app.sensorData.lastUpdated);
            elements.sensorGraph.innerHTML = `
                <p class="placeholder-text">Latest measurement from: ${formattedTimestamp}</p>
                <p class="placeholder-text">Sensor graph will be implemented soon!</p>
            `;
        } else {
            elements.sensorGraph.innerHTML = '<p class="placeholder-text">Sensor graph will be implemented soon!</p>';
        }
    }
        
    // Show loading state
    function showLoadingState() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-seedling fa-spin"></i>
            </div>
            <div class="loading-text">Growing Jalika...</div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    
    // Hide loading state
    function hideLoadingState() {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 500);
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Tab switching
        elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                switchTab(tabName);
            });
        });
        
        // Close modal
        elements.closeModal.addEventListener('click', () => {
            elements.plantDetailModal.style.display = 'none';
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === elements.plantDetailModal) {
                elements.plantDetailModal.style.display = 'none';
            }
        });
        
        // Update photo button
        elements.updatePhotoButton.addEventListener('click', () => {
            // TODO: Implement photo upload functionality
            console.log('Update photo button clicked');
            
            // For demo purposes, we'll show a mock file input dialog
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = handleImageUpload;
            fileInput.click();
        });
        
        // Edit plant info button
        elements.editPlantInfoButton.addEventListener('click', () => {
            // TODO: Implement plant info editing
            console.log('Edit plant info button clicked');
            alert('Plant info editing will be implemented in a future update.');
        });
        
        // Refresh button
        elements.refreshButton.addEventListener('click', () => {
            refreshData();
        });
    }
    
    // Switch between tabs
    function switchTab(tabName) {
        // Update current tab
        app.currentTab = tabName;
        
        // Update tab buttons
        elements.tabButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update tab panels
        elements.tabPanels.forEach(panel => {
            if (panel.id === tabName) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
        
        console.log(`Switched to ${tabName} tab`);
    }
       
    // Apply status class based on value and optimal range
    function applyValueStatusClass(element, value, range) {
        // Clear existing classes
        element.classList.remove('warning', 'danger');
        
        // Get the status class from the shared config
        const statusClass = JalikaConfig.getValueStatusClass(value, 
            // Determine sensor type from range
            Object.keys(JalikaConfig.optimalRanges).find(key => 
                JalikaConfig.optimalRanges[key] === range
            )
        );
        
        // Apply the class if one was returned
        if (statusClass) {
            element.classList.add(statusClass);
        }
    }
    
    // Render plant pods in the plants tab
    function renderPlantPods() {
        // Clear existing pods
        elements.plantPods.innerHTML = '';
        
        // Add each plant pod
        app.plants.forEach(plant => {
            const podElement = document.createElement('div');
            podElement.className = 'plant-pod';
            podElement.setAttribute('data-pod-id', plant.podNumber);
            
            podElement.innerHTML = `
                <div class="pod-number">${plant.podNumber}</div>
                <div class="pod-plant-image">
                    <img src="${plant.image}" alt="${plant.name}">
                </div>
                <div class="pod-plant-name">${plant.name}</div>
            `;
            
            // Add click event to show plant details
            podElement.addEventListener('click', () => {
                showPlantDetails(plant);
            });
            
            elements.plantPods.appendChild(podElement);
        });
    }
    
    // Show plant details in modal
    function showPlantDetails(plant) {
        // Log the plant object for debugging
        console.log('[Jalika] Showing details for plant:', plant);
        
        // Display plant name with custom name in parentheses if available
        if (plant.customName) {
            elements.modalPlantName.textContent = `${plant.name} (${plant.customName})`;
        } else {
            elements.modalPlantName.textContent = plant.name;
        }
        
        elements.modalPodNumber.textContent = `Pod #${plant.podNumber}`;
        elements.modalPlantCartoon.src = plant.cartoonImage;
        elements.modalCatchPhrase.textContent = `"${plant.catchPhrase}"`;
        
        // Log the plant data we want to display
        console.log('[Jalika] Plant category:', plant.category);
        console.log('[Jalika] Plant brand:', plant.brand);
        console.log('[Jalika] Plant date planted:', plant.datePlanted);
        console.log('[Jalika] Plant growing crop:', plant.growingCrop);
        
        // Get fresh references to the DOM elements
        const categoryElement = document.getElementById('modal-category');
        const brandElement = document.getElementById('modal-brand');
        const datePlantedElement = document.getElementById('modal-date-planted');
        const growingCropElement = document.getElementById('modal-growing-crop');
        
        // Check if elements exist and update them
        if (categoryElement) {
            console.log('[Jalika] Updating category element');
            categoryElement.textContent = plant.category || 'N/A';
        } else {
            console.warn('[Jalika] Category element not found in DOM');
        }
        
        if (brandElement) {
            console.log('[Jalika] Updating brand element');
            brandElement.textContent = plant.brand || 'N/A';
        } else {
            console.warn('[Jalika] Brand element not found in DOM');
        }
        
        if (datePlantedElement) {
            console.log('[Jalika] Updating date planted element');
            // Format the date if it exists
            if (plant.datePlanted && plant.datePlanted !== 'N/A') {
                try {
                    const date = new Date(plant.datePlanted);
                    if (!isNaN(date.getTime())) {
                        // Use the medium format (MMM D, YYYY) from JalikaConfig
                        const formattedDate = JalikaConfig.formatDate(date, JalikaConfig.formats.dateTime.medium);
                        datePlantedElement.textContent = formattedDate;
                    } else {
                        datePlantedElement.textContent = plant.datePlanted;
                    }
                } catch (error) {
                    console.warn('[Jalika] Error formatting date:', error);
                    datePlantedElement.textContent = plant.datePlanted;
                }
            } else {
                datePlantedElement.textContent = plant.datePlanted || 'N/A';
            }
        } else {
            console.warn('[Jalika] Date planted element not found in DOM');
        }
        
        if (growingCropElement) {
            console.log('[Jalika] Updating growing crop element');
            growingCropElement.textContent = plant.growingCrop || 'N/A';
        } else {
            console.warn('[Jalika] Growing crop element not found in DOM');
        }
        
        // Existing plant health information
        elements.modalGrowthStage.textContent = plant.growthStage;
        elements.modalHealthStatus.textContent = plant.healthStatus;
        elements.modalDays.textContent = plant.daysInSystem;
        
        // Add class based on health status
        elements.modalHealthStatus.className = 'stat-value';
        if (plant.healthStatus === 'Warning') {
            elements.modalHealthStatus.classList.add('warning');
        } else if (plant.healthStatus === 'Poor') {
            elements.modalHealthStatus.classList.add('danger');
        } else if (plant.healthStatus === 'Good') {
            elements.modalHealthStatus.classList.add('success');
        }
        
        // Render issues list
        if (plant.issues && plant.issues.length > 0) {
            elements.modalIssuesList.innerHTML = plant.issues
                .filter(issue => issue) // Filter out empty issues
                .map(issue => `<li>${issue}</li>`)
                .join('');
        } else {
            elements.modalIssuesList.innerHTML = '<li class="no-issues">No issues detected</li>';
        }
        
        // Show the modal
        elements.plantDetailModal.style.display = 'flex';
        
        // Store current plant ID for edit functionality
        elements.plantDetailModal.setAttribute('data-current-plant-id', plant.id);
    }

    // This will create the missing modal elements if they don't exist
    function ensureModalElements() {
        console.log('[Jalika] Ensuring plant detail modal elements exist...');
        
        // Check if we need to modify the modal
        const modalContent = document.querySelector('.plant-detail-modal .modal-content');
        if (!modalContent) {
            console.warn('[Jalika] Modal content not found');
            return;
        }
        
        // Check if the elements already exist
        const existingCategory = document.getElementById('modal-category');
        if (existingCategory) {
            console.log('[Jalika] Plant info elements already exist');
            return;
        }
        
        console.log('[Jalika] Creating plant info elements');
        
        // Find where to insert the new section
        const plantCatchPhrase = document.getElementById('modal-catch-phrase');
        if (!plantCatchPhrase) {
            console.warn('[Jalika] Could not find catch phrase element');
            return;
        }
        
        // Create the new plant information section
        const plantInfoSection = document.createElement('div');
        plantInfoSection.className = 'plant-stats';
        plantInfoSection.innerHTML = `
            <h4>Plant Information</h4>
            <div class="stat-item">
                <div class="stat-label">Category</div>
                <div class="stat-value" id="modal-category">N/A</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Brand</div>
                <div class="stat-value" id="modal-brand">N/A</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Date Planted</div>
                <div class="stat-value" id="modal-date-planted">N/A</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Growing Crop</div>
                <div class="stat-value" id="modal-growing-crop">N/A</div>
            </div>
        `;
        
        // Insert the plant info section after the catch phrase
        plantCatchPhrase.parentNode.insertBefore(plantInfoSection, plantCatchPhrase.nextSibling);
        
        // Verify elements were created
        const categoryElement = document.getElementById('modal-category');
        if (categoryElement) {
            console.log('[Jalika] Successfully created category element');
        } else {
            console.warn('[Jalika] Failed to create category element');
        }
        
        const brandElement = document.getElementById('modal-brand');
        if (brandElement) {
            console.log('[Jalika] Successfully created brand element');
        } else {
            console.warn('[Jalika] Failed to create brand element');
        }
        
        const datePlantedElement = document.getElementById('modal-date-planted');
        if (datePlantedElement) {
            console.log('[Jalika] Successfully created date planted element');
        } else {
            console.warn('[Jalika] Failed to create date planted element');
        }
        
        const growingCropElement = document.getElementById('modal-growing-crop');
        if (growingCropElement) {
            console.log('[Jalika] Successfully created growing crop element');
        } else {
            console.warn('[Jalika] Failed to create growing crop element');
        }
        
        console.log('[Jalika] Plant detail modal elements created successfully!');
    }
    
    // Handle image upload
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Only allow image files
        if (!file.type.match('image.*')) {
            alert('Please select an image file.');
            return;
        }
        
        // Show processing indicator
        showProcessingIndicator('Processing your image... Creating kawaii version!');
        
        // Create a FileReader to read the image
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imageUrl = e.target.result;
            
            // Get the current plant
            const podId = parseInt(elements.modalPodNumber.textContent.replace('Pod #', ''));
            const plant = app.plants.find(p => p.podNumber === podId);
            
            if (plant) {
                // Update the original image
                plant.image = imageUrl;
                
                // Save the original image to IndexedDB
                JalikaDB.savePlantImage(podId, imageUrl, false)
                    .then(() => {
                        console.log('[Jalika] Original image saved to database for pod', podId);
                    })
                    .catch(error => {
                        console.error('[Jalika] Error saving original image to database:', error);
                    });
                
                // Process the image to create a cartoon version
                ImageProcessor.createThematicCartoonFromImage(imageUrl)
                    .then(cartoonizedImageUrl => {
                        // Update the cartoon image
                        plant.cartoonImage = cartoonizedImageUrl;
                        elements.modalPlantCartoon.src = cartoonizedImageUrl;
                        
                        // Save the cartoon image to IndexedDB
                        JalikaDB.savePlantImage(podId, cartoonizedImageUrl, true)
                            .then(() => {
                                console.log('[Jalika] Cartoon image saved to database for pod', podId);
                            })
                            .catch(error => {
                                console.error('[Jalika] Error saving cartoon image to database:', error);
                            });
                        
                        // Refresh the plant pods display
                        renderPlantPods();
                        
                        // Hide processing indicator
                        hideProcessingIndicator();
                        
                        console.log('Image processed for plant:', plant.name);
                    })
                    .catch(error => {
                        console.error('Error processing image:', error);
                        
                        // Fallback to original image if processing fails
                        plant.cartoonImage = imageUrl;
                        elements.modalPlantCartoon.src = imageUrl;
                        
                        // Save the fallback image to IndexedDB as cartoon
                        JalikaDB.savePlantImage(podId, imageUrl, true)
                            .then(() => {
                                console.log('[Jalika] Fallback cartoon image saved to database for pod', podId);
                            })
                            .catch(error => {
                                console.error('[Jalika] Error saving fallback cartoon image to database:', error);
                            });
                        
                        // Hide processing indicator
                        hideProcessingIndicator();
                        
                        // Refresh the plant pods display
                        renderPlantPods();
                        
                        alert('Could not create cartoon version. Using original image instead.');
                    });
            }
        };
        
        // Read the image file as a data URL
        reader.readAsDataURL(file);
    }
    
    // Show processing indicator
    function showProcessingIndicator(message) {
        const processingOverlay = document.createElement('div');
        processingOverlay.className = 'processing-overlay';
        processingOverlay.innerHTML = `
            <div class="processing-content">
                <div class="processing-spinner">
                    <i class="fas fa-paint-brush fa-spin"></i>
                </div>
                <div class="processing-message">${message}</div>
            </div>
        `;
        document.body.appendChild(processingOverlay);
    }
    
    // Hide processing indicator
    function hideProcessingIndicator() {
        const processingOverlay = document.querySelector('.processing-overlay');
        if (processingOverlay) {
            processingOverlay.classList.add('fade-out');
            setTimeout(() => {
                if (processingOverlay.parentNode) {
                    processingOverlay.parentNode.removeChild(processingOverlay);
                }
            }, 500);
        }
    }
    
    // Render action and recommendation lists
    function renderActionLists() {
        // Clear existing lists
        elements.priorityActionsList.innerHTML = '';
        elements.generalRecommendationsList.innerHTML = '';
        
        // Add priority actions
        app.actions.forEach(action => {
            const actionElement = document.createElement('li');
            actionElement.className = 'action-item';
            
            actionElement.innerHTML = `
                <div class="action-icon ${action.priority}">
                    <i class="fas fa-${action.priority === 'urgent' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                </div>
                <div class="action-content">
                    <div class="action-title">${action.title}</div>
                    <div class="action-description">${action.description}</div>
                </div>
            `;
            
            elements.priorityActionsList.appendChild(actionElement);
        });
        
        // Add general recommendations
        app.recommendations.forEach(recommendation => {
            const recElement = document.createElement('li');
            recElement.className = 'recommendation-item';
            
            recElement.innerHTML = `
                <div class="recommendation-icon">
                    <i class="fas fa-${recommendation.icon}"></i>
                </div>
                <div class="recommendation-content">
                    <div class="recommendation-title">${recommendation.title}</div>
                    <div class="recommendation-description">${recommendation.description}</div>
                </div>
            `;
            
            elements.generalRecommendationsList.appendChild(recElement);
        });
    }

    function formatFriendlyDate(date) {
        return JalikaConfig.formatDate(date);
    }
    
    // Update last updated time
    function updateLastUpdatedTime() {
        const now = app.sensorData.lastUpdated;
        if (!now) return;
        
        const timeString = JalikaConfig.formatDate(now);
        elements.lastUpdatedTime.textContent = timeString;
    }
    
    // Refresh data from Google Sheets
    function refreshData() {
        console.log('Refreshing data...');
        
        // Show loading indicator
        elements.refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        
        // Call the JalikaData refresh function
        JalikaData.refreshData()
            .then(result => {
                if (!result.success) {
                    console.error('Failed to refresh data', result.error);
                    alert('Could not update data. Please try again later.');
                }
                
                // Reset button regardless of success/failure
                elements.refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            })
            .catch(error => {
                console.error('Error refreshing data', error);
                alert('Could not update data. Please try again later.');
                
                // Reset button
                elements.refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            });
    }

    // Load saved images from IndexedDB and apply them to plants
    function loadSavedImages() {
        console.log('[Jalika] Loading saved images from database...');
        
        // Check if JalikaDB is available
        if (!JalikaDB) {
            console.warn('[Jalika] JalikaDB not available, cannot load saved images');
            return Promise.resolve();
        }
        
        return JalikaDB.getAllPlantImages()
            .then(images => {
                if (!images || images.length === 0) {
                    console.log('[Jalika] No saved images found in database');
                    return;
                }
                
                console.log(`[Jalika] Found ${images.length} saved images in database`);
                
                // Group images by pod ID
                const imagesByPod = {};
                
                images.forEach(image => {
                    if (!imagesByPod[image.podId]) {
                        imagesByPod[image.podId] = {};
                    }
                    imagesByPod[image.podId][image.type] = image.data;
                });
                
                // Apply images to plants
                Object.keys(imagesByPod).forEach(podId => {
                    const podIdNum = parseInt(podId);
                    const plant = app.plants.find(p => p.podNumber === podIdNum);
                    
                    if (plant) {
                        console.log(`[Jalika] Applying saved images to plant in pod ${podId}`);
                        
                        // Apply original image if available
                        if (imagesByPod[podId].original) {
                            plant.image = imagesByPod[podId].original;
                        }
                        
                        // Apply cartoon image if available
                        if (imagesByPod[podId].cartoon) {
                            plant.cartoonImage = imagesByPod[podId].cartoon;
                        }
                    } else {
                        console.warn(`[Jalika] No plant found for pod ${podId}`);
                    }
                });
                
                // Refresh plant pods to show the loaded images
                renderPlantPods();
            })
            .catch(error => {
                console.error('[Jalika] Error loading saved images:', error);
            });
    }
    
    // Initialize the app when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', init);
})();

// Jalika Enhancement Script - Focusing on Sensor Cards
(function() {
    'use strict';
    
    // Base path for loading images
    function getBasePath() {
        const path = location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
        return path === '/' ? '' : path; // If root path, use empty string
    }
    
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Jalika] UI enhancements loading...');
        
        // Apply initial enhancements
        enhanceSensorCards();
        
        // Set up event listeners for dynamic updates
        setupEventListeners();
    });
    
    // Set up event listeners
    function setupEventListeners() {
        // Listen for data updates to refresh UI
        document.addEventListener('jalika:dataUpdated', function() {
            console.log('[Jalika] Data updated, refreshing UI enhancements...');
            setTimeout(enhanceSensorCards, 100);
        });
    }
    
    // Enhance the sensor cards with status indicators
    function enhanceSensorCards() {
        console.log('[Jalika] Enhancing sensor cards...');
        
        // Add status indicators to all sensor cards
        const sensorCards = document.querySelectorAll('.sensor-card');
        if (!sensorCards.length) {
            console.warn('[Jalika] No sensor cards found');
            return;
        }
        
        // Types of sensors
        const sensorTypes = ['ph', 'tds', 'ec', 'temp'];
        
        // Add status indicators to each card
        sensorCards.forEach((card, index) => {
            if (index < sensorTypes.length) {
                addStatusIndicator(card, sensorTypes[index]);
            }
        });
    }
    
    // Add a status indicator to a sensor card
    function addStatusIndicator(cardElement, sensorType) {
        if (!cardElement) return;
        
        // Remove existing indicator if any
        const existingIndicator = cardElement.querySelector('.status-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Get sensor value
        const valueElement = cardElement.querySelector('.sensor-value');
        if (!valueElement) {
            console.warn(`[Jalika] No value element found for ${sensorType}`);
            return;
        }
        
        const value = parseFloat(valueElement.textContent);
        if (isNaN(value)) {
            console.warn(`[Jalika] Invalid value for ${sensorType}: ${valueElement.textContent}`);
            return;
        }
        
        // Determine status based on value
        let statusClass = 'success'; // Default status
        let bgClass = 'success-bg';  // Default background class
        
        // Try to use JalikaConfig if available
        if (window.JalikaConfig && typeof JalikaConfig.getValueStatusClass === 'function') {
            const configStatus = JalikaConfig.getValueStatusClass(value, sensorType);
            if (configStatus === 'warning') {
                statusClass = 'fair';
                bgClass = 'fair-bg';
            } else if (configStatus === 'danger') {
                statusClass = 'poor';
                bgClass = 'poor-bg';
            }
        } else {
            // Fallback logic if JalikaConfig isn't available
            console.warn('[Jalika] JalikaConfig not available, using fallback logic');
            
            // Simple fallback ranges
            const fallbackRanges = {
                ph: { min: 5.5, max: 6.5 },
                tds: { min: 700, max: 1200 },
                ec: { min: 1000, max: 2200 },
                temp: { min: 60, max: 75 }
            };
            
            if (fallbackRanges[sensorType]) {
                const range = fallbackRanges[sensorType];
                if (value < range.min || value > range.max) {
                    // How far outside the range?
                    const rangeSize = range.max - range.min;
                    const deviation = value < range.min 
                        ? (range.min - value) / rangeSize 
                        : (value - range.max) / rangeSize;
                    
                    if (deviation > 0.2) {
                        statusClass = 'poor';
                        bgClass = 'poor-bg';
                    } else {
                        statusClass = 'fair';
                        bgClass = 'fair-bg';
                    }
                }
            }
        }
        
        // Get base path for images
        const basePath = getBasePath();
        
        // Determine the image path
        const imagePath = `${basePath}img/icons/icon-${statusClass}.png`;
        
        // Create outer div for background color with stronger styling
        const outerDiv = document.createElement('div');
        outerDiv.className = `status-indicator ${bgClass}`;
        outerDiv.style.backgroundColor = bgClass === 'success-bg' 
            ? '#E6F4D7' 
            : (bgClass === 'fair-bg' ? '#FFF8E1' : '#FFEBEE');
        
        // Create image element
        const imgElement = document.createElement('img');
        imgElement.src = imagePath;
        imgElement.alt = `${statusClass} status`;
        imgElement.style.backgroundColor = 'transparent';
        imgElement.style.borderRadius = '50%'; // Make image circular
        imgElement.style.overflow = 'hidden'; // Ensure content doesn't overflow the border radius
        
        // Add image to outer div
        outerDiv.appendChild(imgElement);
        
        // Add to card
        cardElement.appendChild(outerDiv);
        
        console.log(`[Jalika] Added ${statusClass} indicator with ${bgClass} background to ${sensorType} card`);
    }
    
    // Call handler immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceSensorCards);
    } else {
        enhanceSensorCards();
    }
    
})();

(function() {
    'use strict';
    console.log('Direct plant image fix: Script loaded');
    
    // Function to extract pod number from modal
    function getPodNumberFromModal() {
        const podElement = document.getElementById('modal-pod-number');
        if (!podElement) return null;
        
        const podText = podElement.textContent || '';
        const match = podText.match(/Pod #(\d+)/);
        return match ? match[1] : null;
    }
    
    // Function to get plant image for a given pod
    function getPlantImageForPod(podId) {
        try {
            // First try direct plant pod query - most reliable source
            const podElement = document.querySelector(`.plant-pod[data-pod-id="${podId}"]`);
            if (podElement) {
                const img = podElement.querySelector('.pod-plant-image img');
                if (img && img.src) {
                    console.log(`Direct plant image fix: Found image in pod element: ${img.src}`);
                    return img.src;
                }
            }
            
            // Then try JalikaData if available
            if (window.JalikaData && typeof window.JalikaData.getPlantById === 'function') {
                const plant = window.JalikaData.getPlantById(parseInt(podId));
                if (plant && plant.image) {
                    console.log(`Direct plant image fix: Found image in JalikaData: ${plant.image}`);
                    return plant.image;
                }
            }
            
            console.log(`Direct plant image fix: No image found for pod ${podId}`);
            return null;
        } catch (error) {
            console.error('Direct plant image fix: Error getting plant image:', error);
            return null;
        }
    }
    
    // Function to update modal image
    function updateModalImage() {
        const podId = getPodNumberFromModal();
        if (!podId) {
            console.log('Direct plant image fix: Could not determine pod number');
            return;
        }
        
        console.log(`Direct plant image fix: Modal opened for pod ${podId}, attempting image update`);
        
        const imageUrl = getPlantImageForPod(podId);
        if (!imageUrl) {
            console.log('Direct plant image fix: No image found to update with');
            return;
        }
        
        // Get the modal image element
        const modalImg = document.querySelector('.plant-cartoon-container img');
        if (modalImg) {
            console.log(`Direct plant image fix: Updating image to ${imageUrl}`);
            modalImg.src = imageUrl;
        } else {
            console.log('Direct plant image fix: Modal image element not found');
        }
    }
    
    // Set up a MutationObserver to watch for the modal becoming visible
    function setupModalObserver() {
        const modal = document.getElementById('plant-detail-modal');
        if (!modal) {
            console.log('Direct plant image fix: Modal element not found');
            return;
        }
        
        const observer = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'style' && 
                    modal.style.display === 'flex') {
                    console.log('Direct plant image fix: Modal display detected');
                    
                    // Run immediately but also with a slight delay to ensure content is loaded
                    updateModalImage();
                    setTimeout(updateModalImage, 100);
                    setTimeout(updateModalImage, 300);
                }
            }
        });
        
        observer.observe(modal, { attributes: true });
        console.log('Direct plant image fix: Modal observer set up');
    }
    
    // Also intercept clicks on plant pods as a backup
    function setupPodClickInterceptor() {
        document.addEventListener('click', function(event) {
            const pod = event.target.closest('.plant-pod');
            if (!pod) return;
            
            const podId = pod.getAttribute('data-pod-id');
            if (!podId) return;
            
            console.log(`Direct plant image fix: Pod ${podId} clicked`);
            
            // Check periodically for the modal to appear
            let checkCount = 0;
            const maxChecks = 20;
            const checkInterval = setInterval(function() {
                checkCount++;
                const modal = document.getElementById('plant-detail-modal');
                
                if (modal && modal.style.display === 'flex') {
                    clearInterval(checkInterval);
                    console.log('Direct plant image fix: Modal detected after click');
                    setTimeout(updateModalImage, 100);
                } else if (checkCount >= maxChecks) {
                    clearInterval(checkInterval);
                    console.log('Direct plant image fix: Gave up waiting for modal');
                }
            }, 50);
        });
        
        console.log('Direct plant image fix: Pod click interceptor set up');
    }
    
    // Handle photo update events
    function setupPhotoUpdateHandler() {
        document.addEventListener('click', function(event) {
            if (event.target.id === 'update-plant-photo' || 
                event.target.closest('#update-plant-photo')) {
                
                console.log('Direct plant image fix: Photo update button clicked');
                
                // Monitor for when processing is complete
                let checkCount = 0;
                const maxChecks = 60; // 30 second timeout
                const checkInterval = setInterval(function() {
                    checkCount++;
                    const overlay = document.querySelector('.processing-overlay');
                    
                    if (!overlay) {
                        clearInterval(checkInterval);
                        console.log('Direct plant image fix: Processing complete');
                        
                        // Update modal image after processing completes
                        setTimeout(updateModalImage, 500);
                        setTimeout(updateModalImage, 1000);
                    } else if (checkCount >= maxChecks) {
                        clearInterval(checkInterval);
                        console.log('Direct plant image fix: Gave up waiting for processing');
                    }
                }, 500);
            }
        });
        
        console.log('Direct plant image fix: Photo update handler set up');
    }
    
    // Set everything up when the page is fully loaded
    window.addEventListener('load', function() {
        console.log('Direct plant image fix: Page loaded, setting up handlers');
        setupModalObserver();
        setupPodClickInterceptor();
        setupPhotoUpdateHandler();
    });
    
    // Try to handle the case where the modal is already open when our script runs
    if (document.readyState === 'complete') {
        console.log('Direct plant image fix: Document already loaded, checking for open modal');
        const modal = document.getElementById('plant-detail-modal');
        if (modal && modal.style.display === 'flex') {
            console.log('Direct plant image fix: Modal already open, updating image');
            setTimeout(updateModalImage, 100);
        }
        
        setupModalObserver();
        setupPodClickInterceptor();
        setupPhotoUpdateHandler();
    }
})();

// Add this to jalika-enhancements.js to ensure the chart containers are properly structured

// Fix chart container structure with 2x2 layout
function fixChartContainers() {
    // Wait for charts to be rendered
    setTimeout(function() {
        console.log('[Jalika] Fixing chart containers...');
        
        // Get the chart container
        const chartsContainer = document.getElementById('sensor-charts-container');
        if (!chartsContainer) {
            console.log('[Jalika] No chart container found to fix');
            return;
        }
        
        // Get all chart wrappers
        const chartWrappers = chartsContainer.querySelectorAll('.chart-wrapper');
        if (!chartWrappers.length) {
            console.log('[Jalika] No chart wrappers found to fix');
            return;
        }
        
        // Apply additional stabilizing attributes
        chartWrappers.forEach(wrapper => {
            // Ensure canvas has proper style
            const canvas = wrapper.querySelector('canvas');
            if (canvas) {
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.position = 'absolute';
                canvas.style.top = '0';
                canvas.style.left = '0';
                
                // Important - ensure parent wrapper has position relative
                wrapper.style.position = 'relative';
                wrapper.style.height = '280px'; // Increased height
                wrapper.style.overflow = 'visible'; // Changed to visible
                wrapper.style.paddingTop = '10px'; // Added padding
                
                console.log('[Jalika] Fixed chart wrapper and canvas styles');
            }
        });
        
        // Ensure the container itself has proper structure - 2x2 layout
        chartsContainer.style.display = 'grid';
        chartsContainer.style.gridTemplateColumns = 'repeat(2, 1fr)'; // Force 2 columns
        chartsContainer.style.gap = '20px';
        chartsContainer.style.width = '100%';
        
        // Adjust Chart.js options to prevent cut-off
        if (window.Chart && Chart.instances) {
            Object.values(Chart.instances).forEach(chart => {
                // Add padding to top of chart
                if (chart.options && chart.options.scales && chart.options.scales.y) {
                    chart.options.scales.y.ticks = chart.options.scales.y.ticks || {};
                    chart.options.scales.y.ticks.padding = 10;
                    
                    // Also increase top padding in the layout
                    chart.options.layout = chart.options.layout || {};
                    chart.options.layout.padding = chart.options.layout.padding || {};
                    chart.options.layout.padding.top = 20;
                }
                
                // Update the chart
                chart.update();
            });
        }
        
        console.log('[Jalika] Chart containers fixed with 2x2 layout!');
    }, 500); // Wait for charts to render
}

// Listen for data updates which trigger chart rendering
document.addEventListener('jalika:dataUpdated', function() {
    console.log('[Jalika] Data updated, fixing charts after render...');
    // Fix charts after a delay to ensure they're rendered
    setTimeout(fixChartContainers, 300);
});

// Run once on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Jalika] Page loaded, fixing charts...');
    fixChartContainers();
});