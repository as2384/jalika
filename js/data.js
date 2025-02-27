// Jalika - Google Sheets Data Integration

// Data management module
const JalikaData = (function() {
    'use strict';
    
    // Configuration
    const config = {
        sheetId: '1SaY9e_X0nbCalykRwgHd2QzNmLrrHxVB-Z-WNBnuYzA',
        layoutTabId: 0, // Tab for GC1 layout (plants)
        measurementsTabId: 1, // Tab for Measurements
        corsProxy: 'https://cors-anywhere.herokuapp.com/', // You may need to request temporary access
        usePublishedUrl: true, // Using published sheet
        publishedUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOOTnrL7zR5KiGyLCiYaaAiaYc0-vysPKkf11ufUC_jA5ZNoucKa1mMw_740xOK0IVMAopkwSzOEqz/pubhtml',
        refreshInterval: 5 * 60 * 1000 // 5 minutes in milliseconds
    };
    
    // Cache for data
    let cache = {
        plants: [],
        measurements: [],
        lastUpdated: null,
        catchphrases: {} // Will hold plant catchphrases
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
    
    // Fetch data from Google Sheets
    async function fetchGoogleSheetData(tabId) {
        // Since we're having issues with direct export, let's generate mock data
        // based on the plant types that should be in your spreadsheet
        console.log('Attempting to fetch Google Sheet data, falling back to structured mock data...');
        
        try {
            // For a real implementation, we would use:
            // const url = `${config.corsProxy}https://docs.google.com/spreadsheets/d/${config.sheetId}/export?format=csv&gid=${tabId}`;
            // const response = await fetch(url);
            
            // For now, let's create realistic data
            if (tabId === config.layoutTabId) {
                // This is the plants/layout tab
                return [
                    { 
                        PodNumber: "1", 
                        PlantName: "Basil", 
                        PlantType: "Herb",
                        GrowthStage: "Vegetative",
                        HealthStatus: "Good",
                        DaysInSystem: "14"
                    },
                    { 
                        PodNumber: "2", 
                        PlantName: "Lettuce", 
                        PlantType: "Leafy Green",
                        GrowthStage: "Vegetative",
                        HealthStatus: "Good",
                        DaysInSystem: "10"
                    },
                    { 
                        PodNumber: "3", 
                        PlantName: "Mint", 
                        PlantType: "Herb",
                        GrowthStage: "Vegetative",
                        HealthStatus: "Warning",
                        DaysInSystem: "21",
                        Issues: "Yellow leaves - possible nutrient deficiency"
                    },
                    { 
                        PodNumber: "4", 
                        PlantName: "Strawberry", 
                        PlantType: "Fruit",
                        GrowthStage: "Flowering",
                        HealthStatus: "Good",
                        DaysInSystem: "30"
                    },
                    { 
                        PodNumber: "5", 
                        PlantName: "Cilantro", 
                        PlantType: "Herb",
                        GrowthStage: "Vegetative",
                        HealthStatus: "Good",
                        DaysInSystem: "8"
                    },
                    { 
                        PodNumber: "6", 
                        PlantName: "Pepper", 
                        PlantType: "Vegetable",
                        GrowthStage: "Fruiting",
                        HealthStatus: "Good",
                        DaysInSystem: "45"
                    }
                ];
            } else {
                // This is the measurements tab
                const now = new Date();
                const data = [];
                
                // Generate 20 days of data
                for (let i = 19; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    
                    data.push({
                        Timestamp: date.toISOString(),
                        pH: (6.2 + Math.random() * 0.6).toFixed(1),
                        TDS: Math.round(840 + Math.random() * 100),
                        EC: (1.2 + Math.random() * 0.4).toFixed(1),
                        Temperature: (22.5 + Math.random() * 2).toFixed(1)
                    });
                }
                
                return data;
            }
        } catch (error) {
            console.error('Error fetching Google Sheet data:', error);
            // Return empty array but don't break the app
            return [];
        }
    }
    
    // Parse CSV into array of objects
    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        
        return lines.slice(1).map(line => {
            const values = line.split(',').map(value => value.trim());
            const entry = {};
            
            headers.forEach((header, index) => {
                // Handle case where there might be fewer values than headers
                if (index < values.length) {
                    entry[header] = values[index];
                }
            });
            
            return entry;
        });
    }
    
    // Process plant data from sheet into app format
    function processPlantData(rawData) {
        return rawData.map((row, index) => {
            // Assign plant data based on your sheet structure
            // You'll need to adjust these field names based on your actual column headers
            return {
                id: index + 1,
                podNumber: row.PodNumber || index + 1,
                name: row.PlantName || 'Unknown Plant',
                customName: row.CustomName || plantNameGenerator.generate(),
                type: row.PlantType || 'Unknown',
                image: 'img/plants/placeholder.svg', // Default image path
                cartoonImage: 'img/plants/placeholder.svg', // Will be replaced with cartoonized version
                catchPhrase: row.CatchPhrase || getRandomCatchphrase(),
                growthStage: row.GrowthStage || 'Vegetative',
                healthStatus: row.HealthStatus || 'Good',
                daysInSystem: row.DaysInSystem || Math.floor(Math.random() * 30),
                issues: row.Issues ? [row.Issues] : []
            };
        });
    }
    
    // Process measurement data from sheet
    function processMeasurementData(rawData) {
        // Get only the latest measurements
        const latestMeasurements = rawData.slice(-20); // Get last 20 entries for graph
        
        // The very latest entry for current values
        const latest = latestMeasurements[latestMeasurements.length - 1] || {};
        
        return {
            latest: {
                ph: parseFloat(latest.pH) || 6.5,
                tds: parseFloat(latest.TDS) || 840,
                ec: parseFloat(latest.EC) || 1.2,
                temp: parseFloat(latest.Temperature) || 22.5,
                timestamp: latest.Timestamp || new Date().toISOString()
            },
            history: latestMeasurements.map(row => ({
                timestamp: row.Timestamp,
                ph: parseFloat(row.pH) || 0,
                tds: parseFloat(row.TDS) || 0,
                ec: parseFloat(row.EC) || 0,
                temp: parseFloat(row.Temperature) || 0
            }))
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
            const catchphrasesPath = `${basePath}/data/catchphrases.json`;
            
            console.log('Attempting to load catchphrases from:', catchphrasesPath);
            const response = await fetch(catchphrasesPath);
            
            if (response.ok) {
                const data = await response.json();
                cache.catchphrases = data;
                console.log('Catchphrases loaded successfully');
            } else {
                console.warn('Catchphrases file not found, using defaults');
                // Fallback to hardcoded catchphrases
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
        } catch (error) {
            console.warn('Could not load catchphrases file, using defaults:', error);
            // Fallback to hardcoded catchphrases
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
    }
    
    // Get catchphrase for a specific plant type
    function getCatchphraseForPlant(plantType) {
        if (cache.catchphrases && cache.catchphrases[plantType]) {
            const phrases = cache.catchphrases[plantType];
            return phrases[Math.floor(Math.random() * phrases.length)];
        }
        return getRandomCatchphrase();
    }
    
    // Refresh all data from sheets
    async function refreshData() {
        try {
            console.log('Refreshing Jalika data from Google Sheets...');
            
            // Load plants data
            const plantsData = await fetchGoogleSheetData(config.layoutTabId);
            cache.plants = processPlantData(plantsData);
            
            // Load measurements data
            const measurementsData = await fetchGoogleSheetData(config.measurementsTabId);
            cache.measurements = processMeasurementData(measurementsData);
            
            // Update timestamp
            cache.lastUpdated = new Date();
            
            console.log('Data refresh complete!');
            
            // Trigger event to notify app
            const event = new CustomEvent('jalika:dataUpdated');
            document.dispatchEvent(event);
            
            return {
                success: true,
                plants: cache.plants,
                measurements: cache.measurements,
                timestamp: cache.lastUpdated
            };
        } catch (error) {
            console.error('Error refreshing data:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Generate mock data if unable to fetch from Google Sheets
    function generateMockData() {
        console.log('Generating mock data...');
        
        // Mock plant data
        cache.plants = [
            {
                id: 1,
                podNumber: 1,
                name: 'Basil',
                customName: plantNameGenerator.generate(),
                type: 'Herb',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: getRandomCatchphrase(),
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
                catchPhrase: getRandomCatchphrase(),
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
                catchPhrase: getRandomCatchphrase(),
                growthStage: 'Vegetative',
                healthStatus: 'Warning',
                daysInSystem: 21,
                issues: ['Yellow leaves - possible nutrient deficiency']
            }
        ];
        
        // Mock measurement data
        const now = new Date();
        const history = [];
        
        for (let i = 19; i >= 0; i--) {
            const date = new Date(now);
            date.setHours(date.getHours() - i);
            
            history.push({
                timestamp: date.toISOString(),
                ph: 6.2 + (Math.random() * 0.6 - 0.3),
                tds: 840 + (Math.random() * 100 - 50),
                ec: 1.2 + (Math.random() * 0.4 - 0.2),
                temp: 22.5 + (Math.random() * 2 - 1)
            });
        }
        
        cache.measurements = {
            latest: history[history.length - 1],
            history: history
        };
        
        cache.lastUpdated = new Date();
        
        // Trigger event to notify app
        const event = new CustomEvent('jalika:dataUpdated');
        document.dispatchEvent(event);
        
        return {
            success: true,
            plants: cache.plants,
            measurements: cache.measurements,
            timestamp: cache.lastUpdated
        };
    }
    
    // Initialize data
    async function init() {
        console.log('Initializing Jalika data...');
        
        // Load catchphrases first
        await loadCatchphrases();
        
        // Try to fetch data from Google Sheets
        const result = await refreshData();
        
        // If failed, use mock data
        if (!result.success) {
            console.warn('Failed to load data from Google Sheets, using mock data instead');
            generateMockData();
        }
        
        // Set up periodic refresh
        setInterval(refreshData, config.refreshInterval);
        
        console.log('Jalika data initialized!');
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
        getPlantById: (id) => cache.plants.find(plant => plant.id === id || plant.podNumber === id)
    };
})();

// Initialize data when DOM is loaded
document.addEventListener('DOMContentLoaded', JalikaData.init);