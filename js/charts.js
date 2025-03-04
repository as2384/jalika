// Jalika - Chart Visualization Utilities
const JalikaCharts = (function() {
    'use strict';
    
    // Use the shared configuration
    const config = {
        colors: JalikaConfig.colors,
        optimalRanges: JalikaConfig.optimalRanges
    };
    
    // Chart instances
    let charts = {
        ph: null,
        tds: null,
        ec: null,
        temp: null
    };
    
    // Initialize chart settings
    function initializeChartSettings() {
        // Set global Chart.js defaults for font
        Chart.defaults.font.family = "'Excalifont', 'Segoe UI', sans-serif";
        
        console.log('[Jalika Charts] Chart settings initialized with Excalifont');
    }
    
    // Format dates for display on chart
    function formatChartDate(dateString) {
        return JalikaConfig.formatDate(dateString);
    }
    
    // Process data to create segments based on optimal ranges
    function processDataSegments(data, labels, minValue, maxValue) {
        // Check if we have data points that are out of range
        const hasOutOfRangePoints = data.some(value => value < minValue || value > maxValue);
        
        // For simplicity, we'll use a point styling approach rather than splitting the data
        return {
            hasOutOfRangePoints,
            isOutOfRange: data.map(value => value < minValue || value > maxValue)
        };
    }
    
    // Create or update all charts
    function updateCharts(measurementData) {
        if (!measurementData || !measurementData.history || !measurementData.history.length) {
            console.warn('[Jalika Charts] No measurement data for charts');
            return;
        }
        
        // Initialize chart settings (includes setting Excalifont as default)
        initializeChartSettings();
        
        console.log('[Jalika Charts] Updating charts with data:', measurementData);
        
        // Create container for charts if it doesn't exist
        ensureChartsContainer();
        
        // Create or update each chart
        updatePHChart(measurementData.history);
        updateTDSChart(measurementData.history);
        updateECChart(measurementData.history);
        updateTempChart(measurementData.history);
        
        // Register a Plugin to draw boundary lines after chart renders
        Chart.register({
            id: 'boundaryLinesPlugin',
            afterRender: (chart) => {
                // Get the chart data
                const chartType = chart.canvas.id.split('-')[0]; // 'ph', 'tds', 'ec', or 'temp'
                if (!chartType) return;
                
                // Get the corresponding range and color
                const range = config.optimalRanges[chartType];
                const color = config.colors[chartType].bounds;
                
                if (range && color) {
                    // Draw the boundary lines
                    addHorizontalLines(chart.ctx, range, color);
                }
            }
        });
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
                    'ec': 'EC (µS/cm)',
                    'temp': 'Water Temperature (°F)'
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

    // Draw horizontal lines for min/max boundaries - Using solid lines and improved appearance
    function addHorizontalLines(ctx, range, color) {
        // We need to ensure this runs AFTER the chart animation is complete
        setTimeout(() => {
            try {
                // Get the chart instance using Chart.js API
                const chartInstance = Chart.getChart(ctx.canvas);
                if (!chartInstance) return;
                
                // Wait for chart animation to complete
                if (chartInstance.animating) {
                    return setTimeout(() => addHorizontalLines(ctx, range, color), 100);
                }
                
                const yAxis = chartInstance.scales.y;
                const xAxis = chartInstance.scales.x;
                
                if (!yAxis || !xAxis) return;
                
                // Make darker versions of the color for the boundary lines
                const darkerColor = makeColorDarker(color, 30);
                
                // Draw min line - solid, thicker and more visible
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([]); // Solid line (no dash)
                ctx.lineWidth = 3;  // Thicker line
                ctx.strokeStyle = darkerColor;
                ctx.moveTo(xAxis.left, yAxis.getPixelForValue(range.min));
                ctx.lineTo(xAxis.right, yAxis.getPixelForValue(range.min));
                ctx.stroke();
                
                // Draw max line - solid, thicker and more visible
                ctx.beginPath();
                ctx.moveTo(xAxis.left, yAxis.getPixelForValue(range.max));
                ctx.lineTo(xAxis.right, yAxis.getPixelForValue(range.max));
                ctx.stroke();
                
                // Create semi-transparent fill for the optimal range area
                ctx.fillStyle = `rgba(${hexToRgb(color).r}, ${hexToRgb(color).g}, ${hexToRgb(color).b}, 0.1)`;
                ctx.fillRect(
                    xAxis.left, 
                    yAxis.getPixelForValue(range.max), 
                    xAxis.right - xAxis.left, 
                    yAxis.getPixelForValue(range.min) - yAxis.getPixelForValue(range.max)
                );
                
                // Label min - using Excalifont
                ctx.fillStyle = darkerColor;
                ctx.font = "bold 12px 'Excalifont', 'Segoe UI', sans-serif";
                ctx.fillText('Min', xAxis.left + 10, yAxis.getPixelForValue(range.min) - 7);
                
                // Label max - using Excalifont
                ctx.fillText('Max', xAxis.left + 10, yAxis.getPixelForValue(range.max) + 14);
                ctx.restore();
                
                // Log success
                console.log(`[Jalika Charts] Added boundary lines for range: ${range.min}-${range.max}`);
            } catch (e) {
                console.warn('Could not draw boundary lines:', e);
            }
        }, 500); // Increase delay to ensure chart is fully rendered
    }
    
    // Helper function to make a color darker by a percentage
    function makeColorDarker(hexColor, percent) {
        const rgb = hexToRgb(hexColor);
        // Make the color darker
        const darker = {
            r: Math.max(0, Math.floor(rgb.r * (1 - percent/100))),
            g: Math.max(0, Math.floor(rgb.g * (1 - percent/100))),
            b: Math.max(0, Math.floor(rgb.b * (1 - percent/100)))
        };
        
        // Convert back to hex
        return `#${((1 << 24) + (darker.r << 16) + (darker.g << 8) + darker.b).toString(16).slice(1)}`;
    }
    
    // Helper function to convert hex color to RGB components
    function hexToRgb(hex) {
        // Default fallback color
        let r = 0, g = 0, b = 0;
        
        try {
            // Remove # if present
            hex = hex.replace(/^#/, '');
            
            // Parse hex value
            if (hex.length === 3) {
                r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
                g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
                b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
            } else if (hex.length === 6) {
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                b = parseInt(hex.substring(4, 6), 16);
            }
        } catch (error) {
            console.warn('Error parsing color hex value:', error);
        }
        
        return { r, g, b };
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
        
        // Process data to determine which points are out of range
        const { isOutOfRange } = processDataSegments(
            data, 
            labels, 
            config.optimalRanges.ph.min, 
            config.optimalRanges.ph.max
        );
        
        // Create or update chart
        charts.ph = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'pH Level',
                        data: data,
                        backgroundColor: function(context) {
                            const index = context.dataIndex;
                            return isOutOfRange[index] ? 
                                config.colors.ph.outOfBounds : 
                                config.colors.ph.main;
                        },
                        borderColor: function(context) {
                            const index = context.dataIndex;
                            return isOutOfRange[index] ? 
                                config.colors.ph.outOfBounds : 
                                config.colors.ph.line;
                        },
                        segment: {
                            borderColor: function(context) {
                                // Change line segment color based on the data point values
                                const p0 = context.p0.parsed.y;
                                const p1 = context.p1.parsed.y;
                                const min = config.optimalRanges.ph.min;
                                const max = config.optimalRanges.ph.max;
                                
                                // If either point is out of range, color the segment red
                                if (p0 < min || p0 > max || p1 < min || p1 > max) {
                                    return config.colors.ph.outOfBounds;
                                }
                                return config.colors.ph.line;
                            }
                        },
                        borderWidth: 2,
                        pointRadius: 4,
                        tension: 0.3,
                        fill: {
                            target: 'origin',
                            above: config.colors.ph.fill
                        }
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
                            },
                            labelColor: function(context) {
                                const index = context.dataIndex;
                                return {
                                    backgroundColor: isOutOfRange[index] ? 
                                        config.colors.ph.outOfBounds : 
                                        config.colors.ph.line
                                };
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
                            text: 'pH',
                            font: {
                                family: "'Excalifont', 'Segoe UI', sans-serif"
                            }
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            font: {
                                family: "'Excalifont', 'Segoe UI', sans-serif"
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.3
                    }
                }
            }
        });
    }

    // Similar chart update functions for TDS, EC, and Temperature would be here
    // They follow the same pattern as updatePHChart but with their specific sensor types
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
        
        // Process data to determine which points are out of range
        const { isOutOfRange } = processDataSegments(
            data, 
            labels, 
            config.optimalRanges.ph.min, 
            config.optimalRanges.ph.max
        );
        
        // Create or update chart
        charts.ph = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'pH Level',
                        data: data,
                        backgroundColor: function(context) {
                            const index = context.dataIndex;
                            return isOutOfRange[index] ? 
                                config.colors.ph.outOfBounds : 
                                config.colors.ph.main;
                        },
                        borderColor: function(context) {
                            const index = context.dataIndex;
                            return isOutOfRange[index] ? 
                                config.colors.ph.outOfBounds : 
                                config.colors.ph.line;
                        },
                        segment: {
                            borderColor: function(context) {
                                // Change line segment color based on the data point values
                                const p0 = context.p0.parsed.y;
                                const p1 = context.p1.parsed.y;
                                const min = config.optimalRanges.ph.min;
                                const max = config.optimalRanges.ph.max;
                                
                                // If either point is out of range, color the segment red
                                if (p0 < min || p0 > max || p1 < min || p1 > max) {
                                    return config.colors.ph.outOfBounds;
                                }
                                return config.colors.ph.line;
                            }
                        },
                        borderWidth: 2,
                        pointRadius: 4,
                        tension: 0.3,
                        fill: {
                            target: 'origin',
                            above: config.colors.ph.fill
                        }
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
                            },
                            labelColor: function(context) {
                                const index = context.dataIndex;
                                return {
                                    backgroundColor: isOutOfRange[index] ? 
                                        config.colors.ph.outOfBounds : 
                                        config.colors.ph.line
                                };
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
                            text: 'pH',
                            font: {
                                family: "'Excalifont', 'Segoe UI', sans-serif"
                            }
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            font: {
                                family: "'Excalifont', 'Segoe UI', sans-serif"
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.3
                    }
                }
            }
        });
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
        
        // Process data to determine which points are out of range
        const { isOutOfRange } = processDataSegments(
            data, 
            labels, 
            config.optimalRanges.tds.min, 
            config.optimalRanges.tds.max
        );
        
        // Create or update chart
        charts.tds = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'TDS (ppm)',
                        data: data,
                        backgroundColor: function(context) {
                            const index = context.dataIndex;
                            return isOutOfRange[index] ? 
                                config.colors.tds.outOfBounds : 
                                config.colors.tds.main;
                        },
                        borderColor: function(context) {
                            const index = context.dataIndex;
                            return isOutOfRange[index] ? 
                                config.colors.tds.outOfBounds : 
                                config.colors.tds.line;
                        },
                        segment: {
                            borderColor: function(context) {
                                // Change line segment color based on the data point values
                                const p0 = context.p0.parsed.y;
                                const p1 = context.p1.parsed.y;
                                const min = config.optimalRanges.tds.min;
                                const max = config.optimalRanges.tds.max;
                                
                                // If either point is out of range, color the segment red
                                if (p0 < min || p0 > max || p1 < min || p1 > max) {
                                    return config.colors.tds.outOfBounds;
                                }
                                return config.colors.tds.line;
                            }
                        },
                        borderWidth: 2,
                        pointRadius: 4,
                        tension: 0.3,
                        fill: {
                            target: 'origin',
                            above: config.colors.tds.fill
                        }
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
                            },
                            labelColor: function(context) {
                                const index = context.dataIndex;
                                return {
                                    backgroundColor: isOutOfRange[index] ? 
                                        config.colors.tds.outOfBounds : 
                                        config.colors.tds.line
                                };
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
                            text: 'TDS (ppm)',
                            font: {
                                family: "'Excalifont', 'Segoe UI', sans-serif"
                            }
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            font: {
                                family: "'Excalifont', 'Segoe UI', sans-serif"
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.3
                    }
                }
            }
        });
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
        
        // Process data to determine which points are out of range
        const { isOutOfRange } = processDataSegments(
            data, 
            labels, 
            config.optimalRanges.ec.min, 
            config.optimalRanges.ec.max
        );
        
        // Create or update chart
        charts.ec = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'EC (µS/cm)',
                        data: data,
                        backgroundColor: function(context) {
                            const index = context.dataIndex;
                            return isOutOfRange[index] ? 
                                config.colors.ec.outOfBounds : 
                                config.colors.ec.main;
                        },
                        borderColor: function(context) {
                            const index = context.dataIndex;
                            return isOutOfRange[index] ? 
                                config.colors.ec.outOfBounds : 
                                config.colors.ec.line;
                        },
                        segment: {
                            borderColor: function(context) {
                                // Change line segment color based on the data point values
                                const p0 = context.p0.parsed.y;
                                const p1 = context.p1.parsed.y;
                                const min = config.optimalRanges.ec.min;
                                const max = config.optimalRanges.ec.max;
                                
                                // If either point is out of range, color the segment red
                                if (p0 < min || p0 > max || p1 < min || p1 > max) {
                                    return config.colors.ec.outOfBounds;
                                }
                                return config.colors.ec.line;
                            }
                        },
                        borderWidth: 2,
                        pointRadius: 4,
                        tension: 0.3,
                        fill: {
                            target: 'origin',
                            above: config.colors.ec.fill
                        }
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
                            },
                            labelColor: function(context) {
                                const index = context.dataIndex;
                                return {
                                    backgroundColor: isOutOfRange[index] ? 
                                        config.colors.ec.outOfBounds : 
                                        config.colors.ec.line
                                };
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: Math.min(config.optimalRanges.ec.min * 0.9, Math.min(...data) * 0.9),
                        max: Math.round(Math.max(config.optimalRanges.ec.max * 1.1, Math.max(...data) * 1.1)),
                        title: {
                            display: true,
                            text: 'EC (µS/cm)',
                            font: {
                                family: "'Excalifont', 'Segoe UI', sans-serif"
                            }
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            font: {
                                family: "'Excalifont', 'Segoe UI', sans-serif"
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.3
                    }
                }
            }
        });
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
        
        // Process data to determine which points are out of range
        const { isOutOfRange } = processDataSegments(
            data, 
            labels, 
            config.optimalRanges.temp.min, 
            config.optimalRanges.temp.max
        );
        
        // Create or update chart
        charts.temp = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temperature (°F)',
                        data: data,
                        backgroundColor: function(context) {
                            const index = context.dataIndex;
                            return isOutOfRange[index] ? 
                                config.colors.temp.outOfBounds : 
                                config.colors.temp.main;
                        },
                        borderColor: function(context) {
                            const index = context.dataIndex;
                            return isOutOfRange[index] ? 
                                config.colors.temp.outOfBounds : 
                                config.colors.temp.line;
                        },
                        segment: {
                            borderColor: function(context) {
                                // Change line segment color based on the data point values
                                const p0 = context.p0.parsed.y;
                                const p1 = context.p1.parsed.y;
                                const min = config.optimalRanges.temp.min;
                                const max = config.optimalRanges.temp.max;
                                
                                // If either point is out of range, color the segment red
                                if (p0 < min || p0 > max || p1 < min || p1 > max) {
                                    return config.colors.temp.outOfBounds;
                                }
                                return config.colors.temp.line;
                            }
                        },
                        borderWidth: 2,
                        pointRadius: 4,
                        tension: 0.3,
                        fill: {
                            target: 'origin',
                            above: config.colors.temp.fill
                        }
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
                            },
                            labelColor: function(context) {
                                const index = context.dataIndex;
                                return {
                                    backgroundColor: isOutOfRange[index] ? 
                                        config.colors.temp.outOfBounds : 
                                        config.colors.temp.line
                                };
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
                            text: 'Temperature (°F)',
                            font: {
                                family: "'Excalifont', 'Segoe UI', sans-serif"
                            }
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            font: {
                                family: "'Excalifont', 'Segoe UI', sans-serif"
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.3
                    }
                }
            }
        });
    }

    // Public API
    return {
        updateCharts,
        formatChartDate,
        // Expose the configuration for use elsewhere
        getConfig: function() {
            return config;
        }
    };
})();