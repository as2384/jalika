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
    // Improved empty data checking for createDataTable function
    function createDataTable(sheetName, data) {
        // More strict check for empty data
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn(`[Jalika] No data to create table for ${sheetName}`);
            return createEmptyTable(sheetName);
        }
        
        // Check if the data array contains actual objects with properties
        const validRows = data.filter(row => row && typeof row === 'object' && Object.keys(row).length > 0);
        
        if (validRows.length === 0) {
            console.warn(`[Jalika] Data for ${sheetName} contains no valid rows`);
            return createEmptyTable(sheetName);
        }
        
        console.log(`[Jalika] Creating data table for ${sheetName} with ${validRows.length} rows`);
        
        // Create a table element
        const tableEl = document.createElement('div');
        tableEl.className = 'data-table-container';
        
        // Add title with row count
        const titleEl = document.createElement('h3');
        titleEl.textContent = `${sheetName} Data (${validRows.length} rows)`;
        titleEl.className = 'data-table-title';
        tableEl.appendChild(titleEl);
        
        // Create table
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Create header row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Get all unique keys from valid rows
        const allKeys = new Set();
        validRows.forEach(row => {
            Object.keys(row).forEach(key => {
                // Only add non-empty keys
                if (key && key.trim() !== '') {
                    allKeys.add(key);
                }
            });
        });
        
        // Sort headers for better readability with Pod No. first
        let headers = Array.from(allKeys);
        headers.sort((a, b) => {
            if (a === 'Pod No.') return -1;
            if (b === 'Pod No.') return 1;
            return a.localeCompare(b);
        });
        
        // Log headers to help with debugging
        console.log(`[Jalika] Table headers for ${sheetName}:`, headers.join(', '));
        
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
        
        // Add data rows - only using valid rows
        validRows.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            
            // Highlight every other row
            if (rowIndex % 2 === 1) {
                tr.className = 'alternate-row';
            }
            
            headers.forEach(header => {
                const td = document.createElement('td');
                const value = row[header];
                
                // Format cell content
                if (value === undefined || value === null) {
                    td.textContent = '';
                    td.className = 'empty-cell';
                } else if (value === '') {
                    td.textContent = '';
                    td.className = 'empty-cell';
                } else {
                    td.textContent = value;
                    
                    // Add classes for specific column types
                    if (header === 'Pod No.') {
                        td.className = 'pod-number-cell';
                    } else if (header === 'Date Planted' || header.includes('Date')) {
                        td.className = 'date-cell';
                    }
                }
                
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        tableEl.appendChild(table);
        
        return tableEl;
    }
    
    // Helper function to create an empty table with a message
    function createEmptyTable(sheetName) {
        const tableEl = document.createElement('div');
        tableEl.className = 'data-table-container';
        
        // Add title
        const titleEl = document.createElement('h3');
        titleEl.textContent = `${sheetName} Data`;
        titleEl.className = 'data-table-title';
        tableEl.appendChild(titleEl);
        
        // Add empty message
        const msgEl = document.createElement('p');
        msgEl.textContent = 'No data available for this table.';
        msgEl.className = 'empty-table-message';
        tableEl.appendChild(msgEl);
        
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
            
            // Add to page - in the dashboard tab
            const dashboardTab = document.getElementById('dashboard');
            if (dashboardTab) {
                dashboardTab.appendChild(tablesContainer);
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
            
            // Fetch raw plants data from Layout - GC1 tab
            // Update this in fetchGoogleSheetsData function to get a cleaner version of the data
            // Replace the existing plantsData processing with this:
            const plantsResponse = await fetch(`${config.API_URL}?sheet=Layout - GC1`);
            if (!plantsResponse.ok) {
                throw new Error(`Failed to fetch plant data: ${plantsResponse.status} ${plantsResponse.statusText}`);
            }

            const plantsRawData = await plantsResponse.json();
            if (plantsRawData.status !== 'success' || !plantsRawData.data) {
                throw new Error('Invalid response from plants API');
            }

            // Log the raw data to help with debugging
            console.log('[Jalika] Raw plants data sample (first few rows):');
            for (let i = 0; i < Math.min(10, plantsRawData.data.length); i++) {
                console.log(`Row ${i+1}:`, plantsRawData.data[i]);
            }

            // Process the raw data correctly starting from row 6
            JalikaData.plantsRawData = plantsRawData
            const processedPlantData = processLayoutSheetWithHeadersOnRow6(plantsRawData.data);

            // Fetch measurements data
            const measurementsResponse = await fetch(`${config.API_URL}?sheet=measurements`);

            if (!measurementsResponse.ok) {
                throw new Error(`Failed to fetch measurement data: ${measurementsResponse.status} ${measurementsResponse.statusText}`);
            }
            
            const measurementsData = await measurementsResponse.json();
            
            if (measurementsData.status !== 'success' || !measurementsData.data) {
                throw new Error('Invalid response from measurements API');
            }

            // Update data tables with only the processed data
            JalikaData.measurementsData = measurementsData
            JalikaData.processedPlantData = processedPlantData
            updateDataTables(processedPlantData, measurementsData.data);

            // Return the combined data
            return {
                plants: processPlantData(processedPlantData),
                measurements: processMeasurementData(measurementsData.data),
                rawData: {
                    plants: processedPlantData, // Use the processed data here, not the raw data
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

    // New function to process sheet data with headers on row 6
    function processLayoutSheetWithHeadersOnRow6(rawData) {
        console.log('[Jalika] Processing Layout sheet with headers on row 6');
        console.log('[Jalika] Raw data received:', rawData.length, 'rows');
        
        // Check if we have enough rows
        if (rawData.length < 7) { // Need at least 7 rows (6 for header + 1 for data)
            console.warn('[Jalika] Not enough rows in data (need at least 7)');
            return [];
        }
        
        // Extract header row (row 6, index 5)
        const headerRow = rawData[5];
        console.log('[Jalika] Header row (row 6):', headerRow);
        
        // Continue only if headerRow contains expected columns
        if (!headerRow || !headerRow['A']) {
            console.warn('[Jalika] Row 6 does not contain expected columns');
            return [];
        }
        
        // Extract all column names from header row
        const columnNames = Object.keys(headerRow);
        
        // Extract column headers from the header row values
        const headerValues = {};
        columnNames.forEach(col => {
            if (headerRow[col]) {
                headerValues[col] = headerRow[col];
            }
        });
        
        console.log('[Jalika] Extracted headers:', headerValues);
        
        // Process data rows (rows 7+, index 6+)
        const processedData = [];
        
        for (let i = 6; i < rawData.length; i++) {
            const dataRow = rawData[i];
            
            // Skip empty rows
            if (!dataRow || Object.keys(dataRow).length === 0) continue;
            
            // Skip rows that don't have a Pod No.
            const podNoColumn = columnNames.find(col => headerRow[col] === 'Pod No.');
            if (!podNoColumn || !dataRow[podNoColumn]) continue;
            
            // Create a new row with proper column names
            const processedRow = {};
            
            columnNames.forEach(colKey => {
                const headerValue = headerRow[colKey];
                if (headerValue && headerValue.trim() !== '') {
                    processedRow[headerValue] = dataRow[colKey];
                }
            });
            
            // Only add rows that have actual pod data
            if (processedRow['Pod No.'] && !isNaN(parseInt(processedRow['Pod No.']))) {
                processedData.push(processedRow);
            }
        }
        
        console.log(`[Jalika] Processed ${processedData.length} plant data rows`);
        if (processedData.length > 0) {
            console.log('[Jalika] First processed row:', processedData[0]);
        }
        
        return processedData;
    }
    
    // Process plant data from sheet into app format - updated for Layout - GC1 columns
    function processPlantData(rawData) {
        console.log('[Jalika] Processing plant data, received', rawData.length, 'rows');
        
        // Log key names to help diagnose field mapping issues
        if (rawData.length > 0) {
            console.log('[Jalika] Available columns:', Object.keys(rawData[0]).join(', '));
        }
        
        // Filter to only include rows that have a valid Pod No.
        const podData = rawData.filter(row => {
            // Try to get the Pod No. value
            const podValue = row['Pod No.'] || '';
            
            // Check if it's a valid pod number (non-empty and numeric)
            const isValid = podValue && !isNaN(parseInt(podValue));
            
            return isValid;
        });
        
        console.log(`[Jalika] Found ${podData.length} valid pod entries`);
        
        // If no pods were found, log more details about the data
        if (podData.length === 0 && rawData.length > 0) {
            console.warn('[Jalika] No valid pods found in data. Sample row:', JSON.stringify(rawData[0]));
            return []; // Return empty array if no valid data
        }
        
        // Transform to app data structure
        return podData.map((row, index) => {
            const podNumber = parseInt(row['Pod No.']) || (index + 1);
            const plantName = row['Growing Crop'] || 'Unknown Plant';
            
            return {
                id: index + 1,
                podNumber: podNumber,
                name: plantName,
                customName: plantNameGenerator.generate(),
                
                // Now we can directly use the correctly named columns
                specimen: row['Specimen'] || '',
                category: row['Category'] || '',
                brand: row['Brand'] || '',
                datePlanted: row['Date Planted'] || '',
                growingCrop: row['Growing Crop'] || '',
                
                // Other fields
                type: row['Category'] || 'Unknown',
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: getCatchphraseForPlant(plantName),
                growthStage: 'Vegetative',
                healthStatus: 'Good',
                daysInSystem: calculateDaysInSystem(row['Date Planted'] || ''),
                issues: []
            };
        });
    }

    // Helper to map a row to a plant object
    function mapRowToPlant(row, index) {
        // Get pod number, with fallbacks for different column names
        const podValue = row['Pod No.'] || row['Pod_No'] || row['PodNo'] || row['Pod Number'] || '';
        const podNumber = parseInt(podValue) || (index + 1);
        
        // Determine plant name - first look at Growing Crop, then fall back to "Unknown Plant"
        const plantName = row['Growing Crop'] || row['Crop'] || row['Plant'] || 'Unknown Plant';
        
        return {
            id: index + 1,
            podNumber: podNumber,
            name: plantName,
            customName: plantNameGenerator.generate(),
            
            // Add the additional fields from the sheet with fallbacks for different column names
            specimen: row['Specimen'] || row['Variety'] || '',
            category: row['Category'] || row['Type'] || '',
            brand: row['Brand'] || row['Seed Brand'] || '',
            datePlanted: row['Date Planted'] || row['Planted Date'] || row['Planting Date'] || '',
            growingCrop: row['Growing Crop'] || row['Crop'] || row['Plant'] || '',
            
            // Default values for UI data
            type: row['Category'] || row['Type'] || 'Unknown',
            image: 'img/plants/placeholder.svg',
            cartoonImage: 'img/plants/placeholder.svg',
            catchPhrase: getCatchphraseForPlant(plantName),
            growthStage: 'Vegetative',
            healthStatus: 'Good',
            daysInSystem: calculateDaysInSystem(row['Date Planted'] || row['Planted Date'] || ''),
            issues: []
        };
    }

    // Helper function to calculate days in system based on planting date
    function calculateDaysInSystem(plantingDateStr) {
        if (!plantingDateStr) return 0;
        
        try {
            const plantingDate = new Date(plantingDateStr);
            const now = new Date();
            
            // Check if date is valid
            if (isNaN(plantingDate.getTime())) {
                return 0;
            }
            
            // Calculate difference in days
            const diffTime = Math.abs(now - plantingDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return diffDays;
        } catch (error) {
            console.warn('Error calculating days in system:', error);
            return 0;
        }
    }

    // Generate backup plant data with 18 pods for when the API fails
    function generatePlantData() {
        console.log('[Jalika] Generating mock plant data for 18 pods...');
        
        // List of plant types to use
        const plantTypes = [
            'Basil', 'Lettuce', 'Mint', 'Strawberry', 'Cilantro', 'Pepper',
            'Tomato', 'Kale', 'Spinach', 'Arugula', 'Thyme', 'Rosemary',
            'Chives', 'Parsley', 'Dill', 'Sage', 'Oregano', 'Bok Choy'
        ];
        
        // Generate 18 plants (one for each pod)
        return Array.from({ length: 18 }, (_, i) => {
            const plantName = plantTypes[i % plantTypes.length];
            const podNumber = i + 1;
            
            return { 
                id: podNumber,
                podNumber: podNumber,
                name: plantName,
                customName: plantNameGenerator.generate(),
                
                // Mock data for additional fields
                specimen: `${plantName} Variety`,
                category: getPlantCategory(plantName),
                brand: 'Jalika Seeds',
                datePlanted: randomPastDate(30),
                growingCrop: plantName,
                
                // Other UI data
                type: getPlantCategory(plantName),
                image: 'img/plants/placeholder.svg',
                cartoonImage: 'img/plants/placeholder.svg',
                catchPhrase: getCatchphraseForPlant(plantName),
                growthStage: 'Vegetative',
                healthStatus: 'Good',
                daysInSystem: Math.floor(Math.random() * 30) + 1,
                issues: []
            };
        });
    }

    // Helper function to get plant category
    function getPlantCategory(plantName) {
        // Map plant names to categories
        const categories = {
            'Basil': 'Herb',
            'Mint': 'Herb',
            'Cilantro': 'Herb',
            'Thyme': 'Herb',
            'Rosemary': 'Herb',
            'Chives': 'Herb',
            'Parsley': 'Herb',
            'Dill': 'Herb',
            'Sage': 'Herb',
            'Oregano': 'Herb',
            'Lettuce': 'Leafy Green',
            'Kale': 'Leafy Green',
            'Spinach': 'Leafy Green',
            'Arugula': 'Leafy Green',
            'Bok Choy': 'Leafy Green',
            'Strawberry': 'Fruit',
            'Tomato': 'Vegetable/Fruit',
            'Pepper': 'Vegetable'
        };
        
        return categories[plantName] || 'Unknown';
    }

    // Generate a random past date within the last 'days' days
    function randomPastDate(days) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * days));
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
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
    
    // Process measurement data from sheet - Updated to use separate date and time columns
    function processMeasurementData(rawData) {
        console.log('[JALIKA] Processing measurement data from raw data');
        
        // Ensure we have data to process
        if (!rawData || !rawData.length) {
            console.warn('[JALIKA] No measurement data available');
            return {
                latest: {
                    ph: 6.5,
                    tds: 840, 
                    ec: 1.2,
                    temp: 22.5,
                    timestamp: new Date().toISOString()
                },
                history: []
            };
        }
        
        // Log the column names to verify
        console.log('[JALIKA] Available column names:', Object.keys(rawData[0]).join(', '));
        
        // Get only the latest measurements (up to 20)
        const latestMeasurements = rawData.slice(-20);
        
        // The very latest entry for current values
        const latest = latestMeasurements[latestMeasurements.length - 1] || {};
        
        // Determine date and time column names
        const dateColumnName = getColumnName(latest, ['Date', 'Timestamp', 'MeasurementDate']);
        const timeColumnName = getColumnName(latest, ['Time', 'MeasurementTime']);
        
        console.log(`[JALIKA] Using date column: ${dateColumnName}, time column: ${timeColumnName}`);
        
        // Using the EXACT column names from your Google Sheet
        // Handle specific column names with units in parentheses
        const latestData = {
            ph: parseFloat(latest['pH'] || 0) || 6.5,
            tds: parseFloat(latest['TDS (ppm)'] || 0) || 840,
            ec: parseFloat(latest['EC (µS/cm)'] || 0) || 1.2,
            temp: parseFloat(latest['Water Temperature (°F)'] || 0) || 22.5,
            timestamp: combineDateAndTime(latest[dateColumnName], latest[timeColumnName])
        };
        
        console.log('[JALIKA] Processed latest measurement:', latestData);
        
        // Process all entries for history
        const historyData = latestMeasurements.map(row => ({
            timestamp: combineDateAndTime(row[dateColumnName], row[timeColumnName]),
            ph: parseFloat(row['pH'] || 0) || 0,
            tds: parseFloat(row['TDS (ppm)'] || 0) || 0,
            ec: parseFloat(row['EC (µS/cm)'] || 0) || 0,
            temp: parseFloat(row['Water Temperature (°F)'] || 0) || 0
        }));
        
        return {
            latest: latestData,
            history: historyData
        };
    }

    // Helper function to get column name based on possible options
    function getColumnName(row, possibleNames) {
        for (const name of possibleNames) {
            if (name in row) {
                return name;
            }
        }
        // Return the first possible name if none found (as a fallback)
        console.warn(`[JALIKA] Could not find column name from options: ${possibleNames.join(', ')}`);
        return possibleNames[0];
    }

    // Helper function to combine date and time values with proper time zone handling
    function combineDateAndTime(dateValue, timeValue) {
        try {
            console.log(`[JALIKA] Processing date: ${dateValue}, time: ${timeValue}`);
            
            // If we don't have date, return current timestamp
            if (!dateValue) {
                console.warn('[JALIKA] Missing date value, using current timestamp');
                return new Date().toISOString();
            }
            
            // Parse date from the date column
            let dateObj;
            if (typeof dateValue === 'string') {
                dateObj = new Date(dateValue);
            } else if (dateValue instanceof Date) {
                dateObj = new Date(dateValue);
            } else {
                console.warn(`[JALIKA] Unexpected date format: ${typeof dateValue}`);
                return new Date().toISOString();
            }
            
            // Default time components
            let hours = 0, minutes = 0, seconds = 0;
            
            // Extract time components from the time value
            if (timeValue) {
                let timeObj;
                
                if (typeof timeValue === 'string') {
                    timeObj = new Date(timeValue);
                } else if (timeValue instanceof Date) {
                    timeObj = timeValue;
                } else {
                    console.warn(`[JALIKA] Unexpected time format: ${typeof timeValue}`);
                    return dateObj.toISOString();
                }
                
                // Get the UTC time components
                hours = timeObj.getUTCHours();     // Should be 18 for 18:28
                minutes = timeObj.getUTCMinutes(); // Should be 28
                seconds = timeObj.getUTCSeconds(); // Should be 0
                
                console.log(`[JALIKA] Extracted UTC time: ${hours}:${minutes}:${seconds}`);
                
                // Apply PT time zone adjustment (-8 hours from UTC)
                hours = hours - 8;
                
                // Handle negative hours (crossing to previous day)
                if (hours < 0) {
                    hours += 24;
                }
                
                console.log(`[JALIKA] Adjusted PT time: ${hours}:${minutes}:${seconds}`);
            }
            
            // Set hours, minutes, seconds to the date object
            dateObj.setHours(hours, minutes, seconds, 0);
            
            const result = dateObj.toISOString();
            console.log(`[JALIKA] Final timestamp: ${result}`);
            
            return result;
        } catch (error) {
            console.error('[JALIKA] Error processing date/time:', error);
            return new Date().toISOString();
        }
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
                        WaterTemperature: m.temp
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