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