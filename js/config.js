// Jalika - Shared Configuration

// Create a config object to share across modules
const JalikaConfig = (function() {
    'use strict';

    // All sensor ranges and formatting settings
    const config = {
        // Optimal ranges for sensors
        optimalRanges: {
            ph: { min: 5.5, max: 6.5 },
            tds: { min: 700, max: 1200 },
            ec: { min: 1000, max: 2200 },
            temp: { min: 60, max: 75 } // Temperature in °F
        },
        
        // Colors for visualization
        colors: {
            ph: {
                main: '#9DCEFF', // Soft blue
                line: '#5DADEC',
                fill: 'rgba(157, 206, 255, 0.2)',
                bounds: '#5E9BD6',
                outOfBounds: '#EF5350' // Red for out-of-bounds values
            },
            tds: {
                main: '#D2B4DE', // Soft purple
                line: '#C39BD3',
                fill: 'rgba(210, 180, 222, 0.2)',
                bounds: '#9B59B6',
                outOfBounds: '#EF5350' // Red for out-of-bounds values
            },
            ec: {
                main: '#A8D8B9', // Soft green
                line: '#82C99D',
                fill: 'rgba(168, 216, 185, 0.2)',
                bounds: '#58D68D',
                outOfBounds: '#EF5350' // Red for out-of-bounds values
            },
            temp: {
                main: '#FFCBA4', // Soft orange
                line: '#FFAB76',
                fill: 'rgba(255, 203, 164, 0.2)',
                bounds: '#FF8C42',
                outOfBounds: '#EF5350' // Red for out-of-bounds values
            }
        },
        
        // Date and time formatting
        formats: {
            dateTime: {
                short: 'MMM D h:mm A', // e.g., "Feb 18 5:35 PM"
                medium: 'MMM D, YYYY h:mm A', // e.g., "Feb 18, 2025 5:35 PM"
                timeOnly: 'h:mm A' // e.g., "5:35 PM"
            }
        }
    };
    
    // Format a date using the specified format
    function formatDate(date, format) {
        if (!date) return '';
        
        const dateObj = new Date(date);
        
        if (isNaN(dateObj.getTime())) {
            console.warn('[JalikaConfig] Invalid date:', date);
            return date;
        }
        
        // Use the short format by default
        const formatStr = format || config.formats.dateTime.short;
        
        // Extract date components
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[dateObj.getMonth()];
        const day = dateObj.getDate();
        const year = dateObj.getFullYear();
        
        // Extract time components
        let hours = dateObj.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        
        // Replace format tokens with actual values
        let formatted = formatStr;
        formatted = formatted.replace('MMM', month);
        formatted = formatted.replace('D', day);
        formatted = formatted.replace('YYYY', year);
        formatted = formatted.replace('h', hours);
        formatted = formatted.replace('mm', minutes);
        formatted = formatted.replace('A', ampm);
        
        return formatted;
    }
    
    // Check if a value is within its optimal range
    function isValueInRange(value, sensorType) {
        if (!config.optimalRanges[sensorType]) {
            console.warn('[JalikaConfig] Unknown sensor type:', sensorType);
            return true;
        }
        
        const range = config.optimalRanges[sensorType];
        return value >= range.min && value <= range.max;
    }
    
    // Get CSS class based on value and range
    function getValueStatusClass(value, sensorType) {
        if (!config.optimalRanges[sensorType]) {
            return '';
        }
        
        const range = config.optimalRanges[sensorType];
        const rangeSize = range.max - range.min;
        const warningThreshold = 0.1; // 10% outside range
        const dangerThreshold = 0.2; // 20% outside range
        
        if (value < range.min) {
            const deviation = (range.min - value) / rangeSize;
            if (deviation > dangerThreshold) {
                return 'danger';
            } else if (deviation > warningThreshold) {
                return 'warning';
            }
        } else if (value > range.max) {
            const deviation = (value - range.max) / rangeSize;
            if (deviation > dangerThreshold) {
                return 'danger';
            } else if (deviation > warningThreshold) {
                return 'warning';
            }
        }
        
        return '';
    }
    
    // Public API
    return {
        optimalRanges: config.optimalRanges,
        colors: config.colors,
        formats: config.formats,
        formatDate: formatDate,
        isValueInRange: isValueInRange,
        getValueStatusClass: getValueStatusClass
    };
})();
