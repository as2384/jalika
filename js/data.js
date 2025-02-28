// Jalika - Google Sheets Data Integration via Apps Script

// Data management module
const JalikaData = (function() {
    'use strict';
    
    // Configuration - REPLACE THE API_URL WITH YOUR DEPLOYED SCRIPT URL
    const config = {
        // REPLACE THIS with your working script URL
        API_URL: 'https://script.google.com/macros/s/AKfycbxkp842q9oTC53_iqScZ3BRxked1ov2afZiwn5N1NZrQUdLqF-4DgiHlCqxW47cSg7O/exec',
        refreshInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
        debugMode: true
    };
    
    // Cache for data
    let cache = {
        plants: [],
        measurements: [],
        lastUpdated: null,
        catchphrases: {},
        errorMessage: null,
        usingMockData: false,
        rawDataTable: null
    };
    
    // Japanese-inspired cute plant names
    const plantNameGenerator = {
        prefixes: ['Mochi', 'Kawa', 'Hana', 'Chibi', 'Suki', 'Miki', 'Tomo', 'Yume', 'Aki', 'Haru'],
        suffixes: ['chan', 'kun', 'san', 'chi', 'pyon', 'maru', 'tan', 'bo', 'nyan', 'pi'],
        
        // Generate a random cute name
        generate() {
            const prefix = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
            const suffix = this.suffixes[Math.floor(Math.random() * this.suffixes.length)];
            return `${prefix}-${suffix}`;
        }
    };
    
    // Default catchphrases - will be expanded
    const defaultCatchphrases = [
        "I'm growing so happily today!",
        "Water me, senpai!",
        "Feeling leafy and loving it!",
        "Photosynthesis is my superpower!",
        "Growing stronger every day!",
        "Reaching for the sun with all my might!",
        "I'm rooting for you!",
        "Leaf me alone, I'm blooming!",
        "I'm having a grape day!",
        "Just chilling and growing!"
    ];
    
    // Create and display warning message
    function showWarningMessage(message) {
        // Set error message in cache
        cache.errorMessage = message;
        cache.usingMockData = true;
        
        // Check if warning element already exists
        let warningEl = document.getElementById('jalika-warning');
        
        if (!warningEl) {
            // Create warning element
            warningEl = document.createElement('div');
            warningEl.id = 'jalika-warning';
            warningEl.className = 'data-warning';
            
            // Add icon
            const iconEl = document.createElement('i');
            iconEl.className = 'fas fa-exclamation-triangle';
            iconEl.style.marginRight = '8px';
            warningEl.appendChild(iconEl);
            
            // Add text container
            const textEl = document.createElement('span');
            warningEl.appendChild(textEl);
            
            // Insert after header
            const header = document.querySelector('.app-header');
            if (header && header.parentNode) {
                header.parentNode.insertBefore(warningEl, header.nextSibling);
            }
        }
        
        // Update warning text
        const textEl = warningEl.querySelector('span');
        if (textEl) {
            textEl.textContent = message;
        }
        
        // Log to console
        console.warn('[Jalika] ' + message);
    }
    
    // Hide warning message
    function hideWarningMessage() {
        const warningEl = document.getElementById('jalika-warning');
        if (warningEl) {
            warningEl.style.display = 'none';
        }
        cache.errorMessage = null;
        cache.usingMockData = false;
    }
    
    // Create a data table from the raw sheet data
    function createDataTable(sheetName, data) {
        if (!data || !data.length) return null;
        
        // Create a table element
        const tableEl = document.createElement('div');
        tableEl.className = 'data-table-container';
        
        // Add title
        const titleEl = document.createElement('h3');
        titleEl.textContent = `${sheetName} Data`;
        titleEl.className = 'data-table-title';
        tableEl.appendChild(titleEl);
        
        // Create table
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Create header row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Get all unique keys
        const allKeys = new Set();
        data.forEach(row => {
            Object.keys(row).forEach(key => allKeys.add(key));
        });
        const headers = Array.from(allKeys);
        
        // Add header cells
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Add data rows
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = row[header] !== undefined ? row[header] : '';
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        tableEl.appendChild(table);
        
        return tableEl;
    }
    
    // Update or create data tables
    function updateDataTables(plantData, measurementData) {
        // Create tables if we have data
        const plantTable = createDataTable('Plants', plantData);
        const measurementTable = createDataTable('Measurements', measurementData);
        
        // Store in cache for future reference
        cache.rawDataTable = {
            plants: plantTable,
            measurements: measurementTable
        };
        
        // Find or create data tables container
        let tablesContainer = document.getElementById('jalika-data-tables');
        if (!tablesContainer) {
            tablesContainer = document.createElement('div');
            tablesContainer.id = 'jalika-data-tables';
            tablesContainer.className = 'data-tables-container';
            
            // Add title
            const titleEl = document.createElement('h2');
            titleEl.textContent = 'Raw Data Tables';
            titleEl.className = 'data-tables-title';
            tablesContainer.appendChild(titleEl);
            
            // Create tabs
            const tabsEl = document.createElement('div');
            tabsEl.className = 'data-tabs';
            
            const plantTabEl = document.createElement('button');
            plantTabEl.textContent = 'Plants Data';
            plantTabEl.className = 'data-tab active';
            plantTabEl.dataset.tab = 'plants';
            
            const measurementTabEl = document.createElement('button');
            measurementTabEl.textContent = 'Measurements Data';
            measurementTabEl.className = 'data-tab';
            measurementTabEl.dataset.tab = 'measurements';
            
            tabsEl.appendChild(plantTabEl);
            tabsEl.appendChild(measurementTabEl);
            tablesContainer.appendChild(tabsEl);
            
            // Create content container
            const contentEl = document.createElement('div');
            contentEl.className = 'data-tab-content';
            tablesContainer.appendChild(contentEl);
            
            // Add click handlers for tabs
            tabsEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('data-tab')) {
                    // Update active tab
                    const tabs = tabsEl.querySelectorAll('.data-tab');
                    tabs.forEach(tab => tab.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Show selected content
                    const tabName = e.target.dataset.tab;
                    updateTabContent(tabName, contentEl);
                }
            });
            
            // Add to page - in the recommendations tab
            const recommendationsTab = document.getElementById('recommendations');
            if (recommendationsTab) {
                recommendationsTab.appendChild(tablesContainer);
            }
        }
        
        // Update tab content
        const contentEl = tablesContainer.querySelector('.data-tab-content');
        const activeTab = tablesContainer.querySelector('.data-tab.active');
        if (contentEl && activeTab) {
            updateTabContent(activeTab.dataset.tab, contentEl);
        }
    }
    
    // Update tab content
    function updateTabContent(tabName, contentEl) {
        contentEl.innerHTML = '';
        
        if (tabName === 'plants' && cache.rawDataTable.plants) {
            contentEl.appendChild(cache.rawDataTable.plants);
        } else if (tabName === 'measurements' && cache.rawDataTable.measurements) {
            contentEl.appendChild(cache.rawDataTable.measurements);
        }
    }
    
    // Fetch data from Google Sheets API
    async function fetchGoogleSheetsData() {
        try {
            // Log attempt
            if (config.debugMode) {
                console.log('[Jalika] Attempting to fetch data from Google Apps Script API...');
            }
            
            // Fetch plants data
            const plantsResponse = await fetch(`${config.API_URL}?sheet=layout`);
            
            if (!plantsResponse.ok) {
                throw new Error(`Failed to fetch plant data: ${plantsResponse.status} ${plantsResponse.statusText}`);
            }
            
            const plantsData = await plantsResponse.json();
            
            if (plantsData.status !== 'success' || !plantsData.data) {
                throw new Error('Invalid response from plants API');
            }
            
            // Fetch measurements data
            const measurementsResponse = await fetch(`${config.API_URL}?sheet=measurements`);
            
            if (!measurementsResponse.ok) {
                throw new Error(`Failed to fetch measurement data: ${measurementsResponse.status} ${measurementsResponse.statusText}`);
            }
            
            const measurementsData = await measurementsResponse.json();
            
            if (measurementsData.status !== 'success' || !measurementsData.data) {
                throw new Error('Invalid response from measurements API');
            }
            
            // Update data tables
            updateDataTables(plantsData.data, measurementsData.data);
            
            // Return the combined data
            return {
                plants: processPlantData(plantsData.data),
                measurements: processMeasurementData(measurementsData.data),
                rawData: {
                    plants: plantsData.data,
                    measurements: measurementsData.data
                }
            };
        } catch (error) {
            // Log detailed error
            console.error('[Jalika] Google Sheets API error:', error);
            
            // Show warning message
            const errorDetails = error.message || 'Unknown error';
            showWarningMessage(`[WARNING] Using mocked data! Google Sheets integration failed: ${errorDetails}`);
            
            return null;
        }
    }
    
    // Generate plant data for the app
    function generatePlantData() {
        console.log('[Jalika] Generating mock plant data...');
        
        return [
            { 
                id: 1,
                podNumber: 1,
                name: 'Basil',
                customName: plantNameGenerator.generate(),
                type: 'Herb',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: getCatchphraseForPlant('Basil'),
                growthStage: 'Vegetative',
                healthStatus: 'Good',
                daysInSystem: 14,
                issues: []
            },
            { 
                id: 2,
                podNumber: 2,
                name: 'Lettuce',
                customName: plantNameGenerator.generate(),
                type: 'Leafy Green',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: getCatchphraseForPlant('Lettuce'),
                growthStage: 'Vegetative',
                healthStatus: 'Good',
                daysInSystem: 10,
                issues: []
            },
            { 
                id: 3,
                podNumber: 3,
                name: 'Mint',
                customName: plantNameGenerator.generate(),
                type: 'Herb',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: getCatchphraseForPlant('Mint'),
                growthStage: 'Vegetative',
                healthStatus: 'Warning',
                daysInSystem: 21,
                issues: ['Yellow leaves - possible nutrient deficiency']
            },
            { 
                id: 4,
                podNumber: 4,
                name: 'Strawberry',
                customName: plantNameGenerator.generate(),
                type: 'Fruit',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: getCatchphraseForPlant('Strawberry'),
                growthStage: 'Flowering',
                healthStatus: 'Good',
                daysInSystem: 30,
                issues: []
            },
            { 
                id: 5,
                podNumber: 5,
                name: 'Cilantro',
                customName: plantNameGenerator.generate(),
                type: 'Herb',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: getCatchphraseForPlant('Cilantro'),
                growthStage: 'Vegetative',
                healthStatus: 'Good',
                daysInSystem: 8,
                issues: []
            },
            { 
                id: 6,
                podNumber: 6,
                name: 'Pepper',
                customName: plantNameGenerator.generate(),
                type: 'Vegetable',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg', 
                catchPhrase: getCatchphraseForPlant('Pepper'),
                growthStage: 'Fruiting',
                healthStatus: 'Good',
                daysInSystem: 45,
                issues: []
            }
        ];
    }
    
    // Process plant data from sheet into app format
    function processPlantData(rawData) {
        return rawData.map((row, index) => {
            // Assign plant data based on your sheet structure
            return {
                id: index + 1,
                podNumber: row.PodNumber || row.Pod || index + 1,
                name: row.PlantName || row.Plant || 'Unknown Plant',
                customName: row.CustomName || plantNameGenerator.generate(),
                type: row.PlantType || row.Type || 'Unknown',
                image: 'img/plants/placeholder.svg', // Default image path
                cartoonImage: 'img/plants/placeholder.svg', // Will be replaced with cartoonized version
                catchPhrase: row.CatchPhrase || getCatchphraseForPlant(row.PlantName || row.Plant || 'Unknown Plant'),
                growthStage: row.GrowthStage || row.Stage || 'Vegetative',
                healthStatus: row.HealthStatus || row.Health || 'Good',
                daysInSystem: row.DaysInSystem || row.Days || Math.floor(Math.random() * 30),
                issues: row.Issues ? [row.Issues] : []
            };
        });
    }
    
    // Generate measurement data for the app
    function generateMeasurementData() {
        const now = new Date();
        const history = [];
        
        for (let i = 19; i >= 0; i--) {
            const date = new Date(now);
            date.setHours(date.getHours() - i * 12); // Every 12 hours
            
            history.push({
                timestamp: date.toISOString(),
                ph: parseFloat((6.2 + Math.random() * 0.6 - 0.3).toFixed(1)),
                tds: Math.round(840 + Math.random() * 100 - 50),
                ec: parseFloat((1.2 + Math.random() * 0.4 - 0.2).toFixed(1)),
                temp: parseFloat((22.5 + Math.random() * 2 - 1).toFixed(1))
            });
        }
        
        return {
            latest: history[history.length - 1],
            history: history
        };
    }
    
    // Process measurement data from sheet
    function processMeasurementData(rawData) {
        // Get only the latest measurements (up to 20)
        const latestMeasurements = rawData.slice(-20);
        
        // The very latest entry for current values
        const latest = latestMeasurements[latestMeasurements.length - 1] || {};
        
        return {
            latest: {
                ph: parseFloat(latest.pH) || 6.5,
                tds: parseFloat(latest.TDS) || 840,
                ec: parseFloat(latest.EC) || 1.2,
                temp: parseFloat(latest.Temperature) || 22.5,
                timestamp: latest.Timestamp || latest.Date || new Date().toISOString()
            },
            history: latestMeasurements.map(row => ({
                timestamp: row.Timestamp || row.Date,
                ph: parseFloat(row.pH) || 0,
                tds: parseFloat(row.TDS) || 0,
                ec: parseFloat(row.EC) || 0,
                temp: parseFloat(row.Temperature) || 0
            }))
        };
    }
    
    // Generate some variance in the measurement data to simulate change
    function updateMeasurementData(currentData) {
        const now = new Date();
        
        // Make a copy of the existing history
        const history = [...currentData.history];
        
        // Add a new measurement
        const latestMeasurement = {
            timestamp: now.toISOString(),
            ph: parseFloat((currentData.latest.ph + (Math.random() * 0.2 - 0.1)).toFixed(1)),
            tds: Math.round(currentData.latest.tds + (Math.random() * 40 - 20)),
            ec: parseFloat((currentData.latest.ec + (Math.random() * 0.1 - 0.05)).toFixed(1)),
            temp: parseFloat((currentData.latest.temp + (Math.random() * 0.5 - 0.25)).toFixed(1))
        };
        
        // Add the new measurement and remove the oldest one if we have more than 20
        history.push(latestMeasurement);
        if (history.length > 20) {
            history.shift();
        }
        
        return {
            latest: latestMeasurement,
            history: history
        };
    }
    
    // Get a random catchphrase
    function getRandomCatchphrase() {
        return defaultCatchphrases[Math.floor(Math.random() * defaultCatchphrases.length)];
    }
    
    // Load catchphrases from a file
    async function loadCatchphrases() {
        try {
            // Get base path to handle GitHub Pages deployment
            const getBasePath = () => {
                const path = location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
                return path === '/' ? '' : path; // If root path, use empty string
            };
            
            const basePath = getBasePath();
            const catchphrasesPath = `${basePath}data/catchphrases.json`;
            
            if (config.debugMode) {
                console.log('[Jalika] Attempting to load catchphrases from:', catchphrasesPath);
            }
            
            const response = await fetch(catchphrasesPath);
            
            if (response.ok) {
                const data = await response.json();
                cache.catchphrases = data;
                console.log('[Jalika] Catchphrases loaded successfully');
            } else {
                console.warn('[Jalika] Catchphrases file not found, using defaults');
                setupDefaultCatchphrases();
            }
        } catch (error) {
            console.warn('[Jalika] Could not load catchphrases file, using defaults:', error);
            setupDefaultCatchphrases();
        }
    }
    
    // Setup default catchphrases as fallback
    function setupDefaultCatchphrases() {
        cache.catchphrases = {
            "Basil": defaultCatchphrases,
            "Lettuce": defaultCatchphrases,
            "Mint": defaultCatchphrases,
            "Strawberry": defaultCatchphrases, 
            "Pepper": defaultCatchphrases,
            "Cilantro": defaultCatchphrases,
            "Unknown Plant": defaultCatchphrases
        };
    }
    
    // Get catchphrase for a specific plant type
    function getCatchphraseForPlant(plantType) {
        if (cache.catchphrases && cache.catchphrases[plantType]) {
            const phrases = cache.catchphrases[plantType];
            return phrases[Math.floor(Math.random() * phrases.length)];
        }
        return getRandomCatchphrase();
    }
    
    // Refresh all data 
    async function refreshData() {
        try {
            console.log('[Jalika] Refreshing data...');
            
            // Try to get data from Google Sheets first
            const sheetsData = await fetchGoogleSheetsData();
            
            if (sheetsData) {
                // Google Sheets data retrieved successfully
                cache.plants = sheetsData.plants;
                cache.measurements = sheetsData.measurements;
                cache.usingMockData = false;
                
                // Remove any warning messages
                hideWarningMessage();
            } else {
                // Using mock data
                if (!cache.plants.length || !cache.measurements) {
                    // First load: generate everything
                    cache.plants = generatePlantData();
                    cache.measurements = generateMeasurementData();
                    
                    // Create mock data tables
                    const mockPlantData = cache.plants.map(plant => ({
                        PodNumber: plant.podNumber,
                        PlantName: plant.name,
                        PlantType: plant.type,
                        GrowthStage: plant.growthStage,
                        HealthStatus: plant.healthStatus,
                        DaysInSystem: plant.daysInSystem,
                        Issues: plant.issues.join(', ')
                    }));
                    
                    const mockMeasurementData = cache.measurements.history.map(m => ({
                        Timestamp: m.timestamp,
                        pH: m.ph,
                        TDS: m.tds,
                        EC: m.ec,
                        Temperature: m.temp
                    }));
                    
                    updateDataTables(mockPlantData, mockMeasurementData);
                } else {
                    // Just update measurements with some variance
                    cache.measurements = updateMeasurementData(cache.measurements);
                }
                
                // Display warning if not already shown
                if (!cache.errorMessage) {
                    showWarningMessage('[WARNING] Using mocked data! Google Sheets integration disabled.');
                }
                
                cache.usingMockData = true;
            }
            
            // Update timestamp
            cache.lastUpdated = new Date();
            
            console.log('[Jalika] Data refresh complete!');
            
            // Trigger event to notify app
            const event = new CustomEvent('jalika:dataUpdated');
            document.dispatchEvent(event);
            
            return {
                success: true,
                plants: cache.plants,
                measurements: cache.measurements,
                timestamp: cache.lastUpdated,
                usingMockData: cache.usingMockData
            };
        } catch (error) {
            console.error('[Jalika] Error refreshing data:', error);
            return {
                success: false,
                error: error.message,
                usingMockData: true
            };
        }
    }
    
    // Initialize data
    async function init() {
        console.log('[Jalika] Initializing data...');
        
        // Load catchphrases first
        await loadCatchphrases();
        
        // Generate initial data
        await refreshData();
        
        // Set up periodic refresh
        setInterval(refreshData, config.refreshInterval);
        
        console.log('[Jalika] Data initialized! Plant data ready:', cache.plants.length);
    }
    
    // Public API
    return {
        init,
        refreshData,
        getPlants: () => cache.plants,
        getMeasurements: () => cache.measurements,
        getLastUpdated: () => cache.lastUpdated,
        generatePlantName: () => plantNameGenerator.generate(),
        getCatchphraseForPlant,
        getPlantById: (id) => cache.plants.find(plant => 
            plant.id === (typeof id === 'string' ? parseInt(id) : id) || 
            plant.podNumber === (typeof id === 'string' ? parseInt(id) : id)),
        isUsingMockData: () => cache.usingMockData,
        getErrorMessage: () => cache.errorMessage
    };
})();

// Initialize data when DOM is loaded
document.addEventListener('DOMContentLoaded', JalikaData.init);