// Main Application Logic for Jalika

// Jalika - Chart Visualization Utilities
const JalikaCharts = (function() {
    'use strict';
    
    // Configuration - Soft "baby" colors
    const config = {
        colors: {
            ph: {
                main: '#9DCEFF', // Soft blue
                line: '#5DADEC',
                fill: 'rgba(157, 206, 255, 0.2)',
                bounds: '#5E9BD6'
            },
            tds: {
                main: '#D2B4DE', // Soft purple
                line: '#C39BD3',
                fill: 'rgba(210, 180, 222, 0.2)',
                bounds: '#9B59B6'
            },
            ec: {
                main: '#A8D8B9', // Soft green
                line: '#82C99D',
                fill: 'rgba(168, 216, 185, 0.2)',
                bounds: '#58D68D'
            },
            temp: {
                main: '#FFCBA4', // Soft orange
                line: '#FFAB76',
                fill: 'rgba(255, 203, 164, 0.2)',
                bounds: '#FF8C42'
            }
        },
        optimalRanges: {
            ph: { min: 5.5, max: 6.5 },
            tds: { min: 700, max: 1000 },
            ec: { min: 1.0, max: 1.5 },
            temp: { min: 65, max: 80 } // Temperature in °F
        }
    };
    
    // Chart instances
    let charts = {
        ph: null,
        tds: null,
        ec: null,
        temp: null
    };
    
    // Create or update all charts
    function updateCharts(measurementData) {
        if (!measurementData || !measurementData.history || !measurementData.history.length) {
            console.warn('[Jalika Charts] No measurement data for charts');
            return;
        }
        
        console.log('[Jalika Charts] Updating charts with data:', measurementData);
        
        // Create container for charts if it doesn't exist
        ensureChartsContainer();
        
        // Create or update each chart
        updatePHChart(measurementData.history);
        updateTDSChart(measurementData.history);
        updateECChart(measurementData.history);
        updateTempChart(measurementData.history);
    }
    
    // Make sure we have a container for our charts
    function ensureChartsContainer() {
        // Check if container exists
        let chartsContainer = document.getElementById('sensor-charts-container');
        
        if (!chartsContainer) {
            // Replace the placeholder in the graph container
            const graphContainer = document.getElementById('sensor-graph');
            if (graphContainer) {
                graphContainer.innerHTML = '';
                
                // Create charts container
                chartsContainer = document.createElement('div');
                chartsContainer.id = 'sensor-charts-container';
                chartsContainer.className = 'charts-container';
                graphContainer.appendChild(chartsContainer);
                
                // Create individual chart containers
                const chartTypes = ['ph', 'tds', 'ec', 'temp'];
                const chartTitles = {
                    'ph': 'pH Level',
                    'tds': 'TDS (ppm)',
                    'ec': 'EC (mS/cm)',
                    'temp': 'Temperature (°F)'
                };
                
                chartTypes.forEach(type => {
                    const chartWrapper = document.createElement('div');
                    chartWrapper.className = 'chart-wrapper';
                    
                    const chartTitle = document.createElement('h4');
                    chartTitle.className = 'chart-title';
                    chartTitle.textContent = chartTitles[type];
                    chartWrapper.appendChild(chartTitle);
                    
                    const canvas = document.createElement('canvas');
                    canvas.id = `${type}-chart`;
                    chartWrapper.appendChild(canvas);
                    
                    chartsContainer.appendChild(chartWrapper);
                });
            }
        }
    }
    
    // Format dates for display on chart
    function formatChartDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return dateString;
        }
    }
    
    // Update pH chart
    function updatePHChart(historyData) {
        // Get data for chart
        const labels = historyData.map(d => formatChartDate(d.timestamp));
        const data = historyData.map(d => d.ph);
        
        // Get chart canvas
        const ctx = document.getElementById('ph-chart').getContext('2d');
        
        // Destroy existing chart if exists
        if (charts.ph) {
            charts.ph.destroy();
        }
        
        // Create or update chart
        charts.ph = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'pH Level',
                        data: data,
                        borderColor: config.colors.ph.line,
                        backgroundColor: config.colors.ph.fill,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 3,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    annotation: {
                        annotations: {
                            minLine: {
                                type: 'line',
                                yMin: config.optimalRanges.ph.min,
                                yMax: config.optimalRanges.ph.min,
                                borderColor: config.colors.ph.bounds,
                                borderWidth: 1,
                                borderDash: [5, 5],
                                label: {
                                    content: 'Min',
                                    enabled: true
                                }
                            },
                            maxLine: {
                                type: 'line',
                                yMin: config.optimalRanges.ph.max,
                                yMax: config.optimalRanges.ph.max,
                                borderColor: config.colors.ph.bounds,
                                borderWidth: 1,
                                borderDash: [5, 5],
                                label: {
                                    content: 'Max',
                                    enabled: true
                                }
                            }
                        }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return formatChartDate(tooltipItems[0].label);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: Math.min(config.optimalRanges.ph.min * 0.9, Math.min(...data) * 0.9),
                        max: Math.max(config.optimalRanges.ph.max * 1.1, Math.max(...data) * 1.1),
                        title: {
                            display: true,
                            text: 'pH'
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        // Add horizontal lines for min/max levels
        addHorizontalLines(ctx, config.optimalRanges.ph, config.colors.ph.bounds);
    }
    
    // Update TDS chart
    function updateTDSChart(historyData) {
        // Get data for chart
        const labels = historyData.map(d => formatChartDate(d.timestamp));
        const data = historyData.map(d => d.tds);
        
        // Get chart canvas
        const ctx = document.getElementById('tds-chart').getContext('2d');
        
        // Destroy existing chart if exists
        if (charts.tds) {
            charts.tds.destroy();
        }
        
        // Create or update chart
        charts.tds = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'TDS (ppm)',
                        data: data,
                        borderColor: config.colors.tds.line,
                        backgroundColor: config.colors.tds.fill,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 3,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return formatChartDate(tooltipItems[0].label);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: Math.min(config.optimalRanges.tds.min * 0.9, Math.min(...data) * 0.9),
                        max: Math.max(config.optimalRanges.tds.max * 1.1, Math.max(...data) * 1.1),
                        title: {
                            display: true,
                            text: 'TDS (ppm)'
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        // Add horizontal lines for min/max levels
        addHorizontalLines(ctx, config.optimalRanges.tds, config.colors.tds.bounds);
    }
    
    // Update EC chart
    function updateECChart(historyData) {
        // Get data for chart
        const labels = historyData.map(d => formatChartDate(d.timestamp));
        const data = historyData.map(d => d.ec);
        
        // Get chart canvas
        const ctx = document.getElementById('ec-chart').getContext('2d');
        
        // Destroy existing chart if exists
        if (charts.ec) {
            charts.ec.destroy();
        }
        
        // Create or update chart
        charts.ec = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'EC (mS/cm)',
                        data: data,
                        borderColor: config.colors.ec.line,
                        backgroundColor: config.colors.ec.fill,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 3,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return formatChartDate(tooltipItems[0].label);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: Math.min(config.optimalRanges.ec.min * 0.9, Math.min(...data) * 0.9),
                        max: Math.max(config.optimalRanges.ec.max * 1.1, Math.max(...data) * 1.1),
                        title: {
                            display: true,
                            text: 'EC (mS/cm)'
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        // Add horizontal lines for min/max levels
        addHorizontalLines(ctx, config.optimalRanges.ec, config.colors.ec.bounds);
    }
    
    // Update Temperature chart
    function updateTempChart(historyData) {
        // Get data for chart
        const labels = historyData.map(d => formatChartDate(d.timestamp));
        const data = historyData.map(d => d.temp);
        
        // Get chart canvas
        const ctx = document.getElementById('temp-chart').getContext('2d');
        
        // Destroy existing chart if exists
        if (charts.temp) {
            charts.temp.destroy();
        }
        
        // Create or update chart
        charts.temp = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temperature (°F)',
                        data: data,
                        borderColor: config.colors.temp.line,
                        backgroundColor: config.colors.temp.fill,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 3,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return formatChartDate(tooltipItems[0].label);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: Math.min(config.optimalRanges.temp.min * 0.9, Math.min(...data) * 0.9),
                        max: Math.max(config.optimalRanges.temp.max * 1.1, Math.max(...data) * 1.1),
                        title: {
                            display: true,
                            text: 'Temperature (°F)'
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        // Add horizontal lines for min/max levels
        addHorizontalLines(ctx, config.optimalRanges.temp, config.colors.temp.bounds);
    }
    
    // Draw horizontal lines for min/max boundaries
    function addHorizontalLines(ctx, range, color) {
        // Draw after the chart renders
        setTimeout(() => {
            try {
                const chart = ctx.canvas.chart;
                if (!chart) return;
                
                const yAxis = chart.scales.y;
                const xAxis = chart.scales.x;
                
                // Draw min line
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 1;
                ctx.strokeStyle = color;
                ctx.moveTo(xAxis.left, yAxis.getPixelForValue(range.min));
                ctx.lineTo(xAxis.right, yAxis.getPixelForValue(range.min));
                ctx.stroke();
                
                // Draw max line
                ctx.beginPath();
                ctx.moveTo(xAxis.left, yAxis.getPixelForValue(range.max));
                ctx.lineTo(xAxis.right, yAxis.getPixelForValue(range.max));
                ctx.stroke();
                ctx.restore();
                
                // Label min
                ctx.save();
                ctx.fillStyle = color;
                ctx.font = '10px Arial';
                ctx.fillText('Min', xAxis.left + 5, yAxis.getPixelForValue(range.min) - 5);
                
                // Label max
                ctx.fillText('Max', xAxis.left + 5, yAxis.getPixelForValue(range.max) - 5);
                ctx.restore();
            } catch (e) {
                console.warn('Could not draw boundary lines:', e);
            }
        }, 100);
    }
    
    // Public API
    return {
        updateCharts
    };
})();

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
            ph: { min: 5.7, max: 6.3 },
            tds: { min: 700, max: 1200 },
            ec: { min: 1700, max: 2300 },
            temp: { min: 60, max: 75 }
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
    
    // Function to update the handleDataUpdate in app.js
    // This ensures the dashboard displays the latest measurements

    // Handle data updates from the JalikaData module
    function handleDataUpdate() {
        console.log('[Jalika] Data updated, refreshing UI...');
        
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
                WaterTemperature: app.sensorData.temp.toFixed(1),
                Timestamp: app.sensorData.lastUpdated.toLocaleString()
            });
        }
        
        // Update UI components with the latest values
        updateSensorDisplay();
        JalikaCharts.updateCharts(measurements);
        renderPlantPods();
        renderActionLists();
        updateLastUpdatedTime();
        
        // Remove loading state
        hideLoadingState();
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
        
        // Update graph area with timestamp information
        if (app.sensorData.lastUpdated) {
            elements.sensorGraph.innerHTML = `
                <p class="placeholder-text">Latest measurement from: ${app.sensorData.lastUpdated.toLocaleString()}</p>
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