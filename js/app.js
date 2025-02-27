// Main Application Logic for Jalika

// Immediately invoked function expression to avoid polluting global namespace
(function() {
    'use strict';
    
    // App state
    const app = {
        // Current active tab
        currentTab: 'dashboard',
        
        // Mock sensor data (will be replaced with real API calls)
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
        
        // Plant data array (will be expanded)
        plants: [
            {
                id: 1,
                podNumber: 1,
                name: 'Basil',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: "I'm growing strong and healthy!",
                growthStage: 'Vegetative',
                healthStatus: 'Good',
                daysInSystem: 14,
                issues: []
            },
            {
                id: 2,
                podNumber: 2,
                name: 'Lettuce',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: "Leaf me alone, I'm growing!",
                growthStage: 'Vegetative',
                healthStatus: 'Good',
                daysInSystem: 10,
                issues: []
            },
            {
                id: 3,
                podNumber: 3,
                name: 'Mint',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: "Feeling fresh and minty!",
                growthStage: 'Vegetative',
                healthStatus: 'Warning',
                daysInSystem: 21,
                issues: ['Yellow leaves - possible nutrient deficiency']
            }
        ],
        
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
        
        // Initialize UI components
        updateSensorDisplay();
        renderPlantPods();
        renderActionLists();
        
        // Update last updated time
        updateLastUpdatedTime();
        
        console.log('Jalika app initialized successfully!');
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
        elements.modalPlantName.textContent = plant.name;
        elements.modalPodNumber.textContent = `Pod #${plant.podNumber}`;
        elements.modalPlantCartoon.src = plant.cartoonImage;
        elements.modalCatchPhrase.textContent = `"${plant.catchPhrase}"`;
        elements.modalGrowthStage.textContent = plant.growthStage;
        elements.modalHealthStatus.textContent = plant.healthStatus;
        elements.modalDays.textContent = plant.daysInSystem;
        
        // Render issues list
        if (plant.issues && plant.issues.length > 0) {
            elements.modalIssuesList.innerHTML = plant.issues.map(issue => 
                `<li>${issue}</li>`
            ).join('');
        } else {
            elements.modalIssuesList.innerHTML = '<li class="no-issues">No issues detected</li>';
        }
        
        // Show the modal
        elements.plantDetailModal.style.display = 'flex';
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
        
        // Create a FileReader to read the image
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imageUrl = e.target.result;
            
            // Update the current plant's image (this is just for demo)
            const podId = parseInt(elements.modalPodNumber.textContent.replace('Pod #', ''));
            const plant = app.plants.find(p => p.podNumber === podId);
            
            if (plant) {
                // Here we would normally send the image to a server for processing
                // For now, we'll just update the UI directly
                
                // Update the cartoon image
                plant.cartoonImage = imageUrl;
                elements.modalPlantCartoon.src = imageUrl;
                
                // Also update the pod image
                plant.image = imageUrl;
                
                // Refresh the plant pods display to show the new image
                renderPlantPods();
                
                console.log('Image updated for plant:', plant.name);
                alert('Image updated! In a production app, this would be processed to create a cartoon version.');
            }
        };
        
        // Read the image file as a data URL
        reader.readAsDataURL(file);
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
    
    // Refresh data (simulate API call)
    function refreshData() {
        console.log('Refreshing data...');
        
        // Show loading indicator
        elements.refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        
        // Simulate API delay
        setTimeout(() => {
            // Update with new "data"
            app.sensorData = {
                ph: 6.2 + (Math.random() * 0.6 - 0.3), // Random variation
                tds: 840 + (Math.random() * 100 - 50),
                ec: 1.2 + (Math.random() * 0.4 - 0.2),
                temp: 22.5 + (Math.random() * 2 - 1),
                lastUpdated: new Date()
            };
            
            // Update UI
            updateSensorDisplay();
            updateLastUpdatedTime();
            
            // Reset button
            elements.refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            
            console.log('Data refreshed!');
        }, 1000);
    }
    
    // Initialize the app when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', init);
})();