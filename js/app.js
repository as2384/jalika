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
        
        // Optimal ranges for sensor values
        optimalRanges: {
            ph: { min: 5.5, max: 6.5 },
            tds: { min: 700, max: 1000 },
            ec: { min: 1.0, max: 1.5 },
            temp: { min: 20, max: 25 }
        },
        
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
        refreshButton: document.getElementById('refresh-data')
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
        
        console.log('Jalika app initialized successfully!');
    }
    
    // Handle data updates from the JalikaData module
    function handleDataUpdate() {
        console.log('Data updated, refreshing UI...');
        
        // Get latest data
        app.plants = JalikaData.getPlants();
        const measurements = JalikaData.getMeasurements();
        
        // Update sensor data
        if (measurements && measurements.latest) {
            app.sensorData = {
                ph: measurements.latest.ph,
                tds: measurements.latest.tds,
                ec: measurements.latest.ec,
                temp: measurements.latest.temp,
                lastUpdated: new Date(measurements.latest.timestamp)
            };
        }
        
        // Update UI components
        updateSensorDisplay();
        renderPlantPods();
        renderActionLists();
        updateLastUpdatedTime();
        
        // Remove loading state
        hideLoadingState();
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
    
    // Update sensor display with current values
    function updateSensorDisplay() {
        // Update value displays
        elements.sensorValues.ph.textContent = app.sensorData.ph.toFixed(1);
        elements.sensorValues.tds.textContent = app.sensorData.tds;
        elements.sensorValues.ec.textContent = app.sensorData.ec.toFixed(1);
        elements.sensorValues.temp.textContent = app.sensorData.temp.toFixed(1);
        
        // Apply warning/danger classes based on optimal ranges
        applyValueStatusClass(elements.sensorValues.ph, app.sensorData.ph, app.optimalRanges.ph);
        applyValueStatusClass(elements.sensorValues.tds, app.sensorData.tds, app.optimalRanges.tds);
        applyValueStatusClass(elements.sensorValues.ec, app.sensorData.ec, app.optimalRanges.ec);
        applyValueStatusClass(elements.sensorValues.temp, app.sensorData.temp, app.optimalRanges.temp);
        
        // TODO: Implement actual graph rendering
        elements.sensorGraph.innerHTML = '<p class="placeholder-text">Sensor graph will be implemented soon!</p>';
    }
    
    // Apply status class based on value and optimal range
    function applyValueStatusClass(element, value, range) {
        // Clear existing classes
        element.classList.remove('warning', 'danger');
        
        // Calculate how far outside the range we are (as a percentage of the range)
        const rangeSize = range.max - range.min;
        const warningThreshold = 0.1; // 10% outside range
        const dangerThreshold = 0.2; // 20% outside range
        
        if (value < range.min) {
            const deviation = (range.min - value) / rangeSize;
            if (deviation > dangerThreshold) {
                element.classList.add('danger');
            } else if (deviation > warningThreshold) {
                element.classList.add('warning');
            }
        } else if (value > range.max) {
            const deviation = (value - range.max) / rangeSize;
            if (deviation > dangerThreshold) {
                element.classList.add('danger');
            } else if (deviation > warningThreshold) {
                element.classList.add('warning');
            }
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
        
        // Show the modal
        elements.plantDetailModal.style.display = 'flex';
        
        // Store current plant ID for edit functionality
        elements.plantDetailModal.setAttribute('data-current-plant-id', plant.id);
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
    
    // Update last updated time
    function updateLastUpdatedTime() {
        const now = app.sensorData.lastUpdated;
        const timeString = now.toLocaleTimeString();
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
    
    // Initialize the app when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', init);
})();