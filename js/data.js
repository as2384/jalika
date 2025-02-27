// Jalika - Google Sheets Data Integration

// Data management module
const JalikaData = (function() {
    'use strict';
    
    // Configuration
    const config = {
        // You can optionally update this with published CSV URLs if you publish specific sheets
        // For now, we'll use the mock data to ensure reliability
        useLocalData: true,
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
    
    // Generate plant data for the app
    function generatePlantData() {
        console.log('Generating reliable plant data...');
        
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
            
            console.log('Attempting to load catchphrases from:', catchphrasesPath);
            const response = await fetch(catchphrasesPath);
            
            if (response.ok) {
                const data = await response.json();
                cache.catchphrases = data;
                console.log('Catchphrases loaded successfully');
            } else {
                console.warn('Catchphrases file not found, using defaults');
                setupDefaultCatchphrases();
            }
        } catch (error) {
            console.warn('Could not load catchphrases file, using defaults:', error);
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
            console.log('Refreshing Jalika data...');
            
            if (config.useLocalData || !cache.measurements) {
                // First load or using local data: generate everything
                cache.plants = generatePlantData();
                cache.measurements = generateMeasurementData();
            } else {
                // Just update measurements with some variance
                cache.measurements = updateMeasurementData(cache.measurements);
            }
            
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
    
    // Initialize data
    async function init() {
        console.log('Initializing Jalika data...');
        
        // Load catchphrases first
        await loadCatchphrases();
        
        // Generate initial data
        await refreshData();
        
        // Set up periodic refresh
        setInterval(refreshData, config.refreshInterval);
        
        console.log('Jalika data initialized! Plant data ready:', cache.plants.length);
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
            plant.podNumber === (typeof id === 'string' ? parseInt(id) : id))
    };
})();

// Initialize data when DOM is loaded
document.addEventListener('DOMContentLoaded', JalikaData.init);