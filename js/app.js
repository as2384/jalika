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

    function addDebugButton() {
        // Check if debug button already exists
        if (document.getElementById('jalika-debug-btn')) {
            return;
        }
        
        // Create debug button
        const debugBtn = document.createElement('button');
        debugBtn.id = 'jalika-debug-btn';
        debugBtn.innerHTML = '🔍 Debug Plants';
        debugBtn.style.position = 'fixed';
        debugBtn.style.bottom = '10px';
        debugBtn.style.right = '10px';
        debugBtn.style.zIndex = '9999';
        debugBtn.style.padding = '8px 12px';
        debugBtn.style.backgroundColor = '#8DC26F';
        debugBtn.style.color = 'white';
        debugBtn.style.border = 'none';
        debugBtn.style.borderRadius = '4px';
        debugBtn.style.cursor = 'pointer';
        debugBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        // Add click event
        debugBtn.addEventListener('click', () => {
            console.log('[Jalika Debug] Debug button clicked');
            
            // Log current state
            console.log('[Jalika Debug] Current app state:', {
                currentTab: app.currentTab,
                plantsCount: app.plants.length,
                plantsData: app.plants
            });
            
            // Debug plants tab
            debugPlantsTab();
            
            // Manually force data refresh
            JalikaData.refreshData()
                .then(result => {
                    console.log('[Jalika Debug] Manual data refresh result:', result);
                    renderPlantPods();
                })
                .catch(err => {
                    console.error('[Jalika Debug] Manual data refresh error:', err);
                });
        });
        
        // Add to body
        document.body.appendChild(debugBtn);
        console.log('[Jalika] Debug button added');
    }
    
    // Function to update the handleDataUpdate in app.js
    // This ensures the dashboard displays the latest measurements

    // Replace your handleDataUpdate function with this:
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
            addDebugButton();
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
        // Display plant name with custom name in parentheses if available
        if (plant.customName) {
            elements.modalPlantName.textContent = `${plant.name} (${plant.customName})`;
        } else {
            elements.modalPlantName.textContent = plant.name;
        }
        
        elements.modalPodNumber.textContent = `Pod #${plant.podNumber}`;
        elements.modalPlantCartoon.src = plant.cartoonImage;
        elements.modalCatchPhrase.textContent = `"${plant.catchPhrase}"`;
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
        
        // Update or create the additional information section
        updateAdditionalPlantInfo(plant);
        
        // Show the modal
        elements.plantDetailModal.style.display = 'flex';
        
        // Store current plant ID for edit functionality
        elements.plantDetailModal.setAttribute('data-current-plant-id', plant.id);
    }

    // Add this new function to display the additional plant information
    function updateAdditionalPlantInfo(plant) {
        // Check if additional info section already exists
        let additionalInfoSection = document.getElementById('modal-additional-info');
        
        if (!additionalInfoSection) {
            // Create the section if it doesn't exist
            additionalInfoSection = document.createElement('div');
            additionalInfoSection.id = 'modal-additional-info';
            additionalInfoSection.className = 'plant-additional-info';
            
            // Add a heading
            const heading = document.createElement('h4');
            heading.textContent = 'Plant Details';
            additionalInfoSection.appendChild(heading);
            
            // Find where to insert it (before the plant-actions section)
            const actionsSection = document.querySelector('.plant-actions');
            if (actionsSection && actionsSection.parentNode) {
                actionsSection.parentNode.insertBefore(additionalInfoSection, actionsSection);
            } else {
                // Fallback - append to modal content
                document.querySelector('.modal-content').appendChild(additionalInfoSection);
            }
        }
        
        // Update the content with the additional information
        additionalInfoSection.innerHTML = `
            <h4>Plant Details</h4>
            <div class="stat-item">
                <div class="stat-label">Specimen</div>
                <div class="stat-value">${plant.specimen || 'Unknown'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Category</div>
                <div class="stat-value">${plant.category || 'Unknown'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Brand</div>
                <div class="stat-value">${plant.brand || 'Unknown'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Date Planted</div>
                <div class="stat-value">${formatPlantDate(plant.datePlanted) || 'Unknown'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Growing Crop</div>
                <div class="stat-value">${plant.growingCrop || 'Unknown'}</div>
            </div>
        `;
    }

    // Helper function to format the plant date nicely
    function formatPlantDate(dateString) {
        if (!dateString) return '';
        
        try {
            // Handle different date formats
            const date = new Date(dateString);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return dateString; // Return original if parsing failed
            }
            
            // Format in a nice human-readable format
            return JalikaConfig.formatDate(date, JalikaConfig.formats.dateTime.medium);
        } catch (error) {
            console.warn('Error formatting plant date:', error);
            return dateString;
        }
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
                
                // Process the image to create a cartoon version
                ImageProcessor.createThematicCartoonFromImage(imageUrl)
                    .then(cartoonizedImageUrl => {
                        // Update the cartoon image
                        plant.cartoonImage = cartoonizedImageUrl;
                        elements.modalPlantCartoon.src = cartoonizedImageUrl;
                        
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

    // Add this debug function to app.js to help troubleshoot plant rendering issues
    function debugPlantsTab() {
        console.log('[Jalika Debug] Plants tab status:');
        
        const plantsTab = document.getElementById('plants');
        if (!plantsTab) {
            console.error('[Jalika Debug] Plants tab element not found!');
            return;
        }
        
        console.log('[Jalika Debug] Plants tab found, classes:', plantsTab.className);
        console.log('[Jalika Debug] Plants tab visibility:', plantsTab.style.display || 'inherited');
        
        const plantsContainer = document.querySelector('.plant-pods');
        if (!plantsContainer) {
            console.error('[Jalika Debug] Plants container (.plant-pods) not found!');
            return;
        }
        
        console.log('[Jalika Debug] Plants container found, current content:', plantsContainer.innerHTML);
        console.log('[Jalika Debug] Current app.plants data:', app.plants.length, 'plants');
        
        // Force re-render the plants
        console.log('[Jalika Debug] Forcing plant pods re-render');
        renderPlantPods();
        
        // Force tab activation
        console.log('[Jalika Debug] Forcing Plants tab activation');
        switchTab('plants');
    }

    // Enhanced renderPlantPods function with better error handling
    function renderPlantPods() {
        console.log('[Jalika] Rendering plant pods, count:', app.plants.length);
        
        // Validate plants container
        if (!elements.plantPods) {
            console.error('[Jalika] ERROR: Plant pods container element not found!');
            
            // Try to get it again
            elements.plantPods = document.querySelector('.plant-pods');
            if (!elements.plantPods) {
                console.error('[Jalika] FATAL: Cannot find plant pods container. Plants cannot be displayed.');
                return;
            }
        }
        
        // Clear existing pods
        elements.plantPods.innerHTML = '';
        
        // Check if we have plants
        if (!app.plants || app.plants.length === 0) {
            console.warn('[Jalika] No plants data available to render');
            elements.plantPods.innerHTML = '<div class="no-plants-message">No plants found. Please refresh data.</div>';
            return;
        }
        
        // Add each plant pod
        app.plants.forEach((plant, index) => {
            try {
                // Validate required plant data
                if (!plant) {
                    console.warn(`[Jalika] Plant at index ${index} is undefined`);
                    return;
                }
                
                const podNumber = plant.podNumber || index + 1;
                const plantName = plant.name || 'Unknown Plant';
                
                console.log(`[Jalika] Rendering plant pod ${podNumber}: ${plantName}`);
                
                const podElement = document.createElement('div');
                podElement.className = 'plant-pod';
                podElement.setAttribute('data-pod-id', podNumber);
                
                podElement.innerHTML = `
                    <div class="pod-number">${podNumber}</div>
                    <div class="pod-plant-image">
                        <img src="${plant.image || 'img/plants/placeholder.svg'}" alt="${plantName}">
                    </div>
                    <div class="pod-plant-name">${plantName}</div>
                `;
                
                // Add click event to show plant details
                podElement.addEventListener('click', () => {
                    showPlantDetails(plant);
                });
                
                elements.plantPods.appendChild(podElement);
            } catch (error) {
                console.error(`[Jalika] Error rendering plant pod ${index}:`, error);
            }
        });
        
        console.log('[Jalika] Plant pods rendering complete');
    }

    // Enhanced switchTab function to ensure visibility
    function switchTab(tabName) {
        console.log(`[Jalika] Switching to ${tabName} tab`);
        
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
        
        // Update tab panels with enhanced visibility check
        elements.tabPanels.forEach(panel => {
            if (panel.id === tabName) {
                panel.classList.add('active');
                panel.style.display = 'block'; // Ensure visibility
                console.log(`[Jalika] Activated tab ${panel.id}`);
                
                // If switching to plants tab, ensure plants are rendered
                if (tabName === 'plants') {
                    console.log('[Jalika] Plants tab activated, refreshing plant pods');
                    renderPlantPods();
                }
            } else {
                panel.classList.remove('active');
                panel.style.display = ''; // Reset to default
            }
        });
    }

    // Add this to the init function at the end
    setTimeout(() => {
        console.log('[Jalika] Running delayed startup checks');
        
        // Check if we have plants data but none are displayed
        if (app.plants && app.plants.length > 0) {
            const plantsContainer = document.querySelector('.plant-pods');
            if (plantsContainer && plantsContainer.childElementCount === 0) {
                console.log('[Jalika] Plants data available but not rendered, forcing render');
                renderPlantPods();
            }
        }
        
        // Make sure tabs have proper visibility
        const currentTab = document.querySelector(`.tab-panel.active`);
        if (currentTab) {
            console.log(`[Jalika] Current active tab is ${currentTab.id}`);
            currentTab.style.display = 'block';
        }
    }, 1000);
    
    // Initialize the app when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', init);
})();