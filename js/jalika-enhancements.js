(function() {
    'use strict';
    console.log('Direct plant image fix: Script loaded');
    
    // Function to extract pod number from modal
    function getPodNumberFromModal() {
        const podElement = document.getElementById('modal-pod-number');
        if (!podElement) return null;
        
        const podText = podElement.textContent || '';
        const match = podText.match(/Pod #(\d+)/);
        return match ? match[1] : null;
    }
    
    // Function to get plant image for a given pod
    function getPlantImageForPod(podId) {
        try {
            // First try direct plant pod query - most reliable source
            const podElement = document.querySelector(`.plant-pod[data-pod-id="${podId}"]`);
            if (podElement) {
                const img = podElement.querySelector('.pod-plant-image img');
                if (img && img.src) {
                    console.log(`Direct plant image fix: Found image in pod element: ${img.src}`);
                    return img.src;
                }
            }
            
            // Then try JalikaData if available
            if (window.JalikaData && typeof window.JalikaData.getPlantById === 'function') {
                const plant = window.JalikaData.getPlantById(parseInt(podId));
                if (plant && plant.image) {
                    console.log(`Direct plant image fix: Found image in JalikaData: ${plant.image}`);
                    return plant.image;
                }
            }
            
            console.log(`Direct plant image fix: No image found for pod ${podId}`);
            return null;
        } catch (error) {
            console.error('Direct plant image fix: Error getting plant image:', error);
            return null;
        }
    }
    
    // Function to update modal image
    function updateModalImage() {
        const podId = getPodNumberFromModal();
        if (!podId) {
            console.log('Direct plant image fix: Could not determine pod number');
            return;
        }
        
        console.log(`Direct plant image fix: Modal opened for pod ${podId}, attempting image update`);
        
        const imageUrl = getPlantImageForPod(podId);
        if (!imageUrl) {
            console.log('Direct plant image fix: No image found to update with');
            return;
        }
        
        // Get the modal image element
        const modalImg = document.querySelector('.plant-cartoon-container img');
        if (modalImg) {
            console.log(`Direct plant image fix: Updating image to ${imageUrl}`);
            modalImg.src = imageUrl;
        } else {
            console.log('Direct plant image fix: Modal image element not found');
        }
    }
    
    // Set up a MutationObserver to watch for the modal becoming visible
    function setupModalObserver() {
        const modal = document.getElementById('plant-detail-modal');
        if (!modal) {
            console.log('Direct plant image fix: Modal element not found');
            return;
        }
        
        const observer = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'style' && 
                    modal.style.display === 'flex') {
                    console.log('Direct plant image fix: Modal display detected');
                    
                    // Run immediately but also with a slight delay to ensure content is loaded
                    updateModalImage();
                    setTimeout(updateModalImage, 100);
                    setTimeout(updateModalImage, 300);
                }
            }
        });
        
        observer.observe(modal, { attributes: true });
        console.log('Direct plant image fix: Modal observer set up');
    }
    
    // Also intercept clicks on plant pods as a backup
    function setupPodClickInterceptor() {
        document.addEventListener('click', function(event) {
            const pod = event.target.closest('.plant-pod');
            if (!pod) return;
            
            const podId = pod.getAttribute('data-pod-id');
            if (!podId) return;
            
            console.log(`Direct plant image fix: Pod ${podId} clicked`);
            
            // Check periodically for the modal to appear
            let checkCount = 0;
            const maxChecks = 20;
            const checkInterval = setInterval(function() {
                checkCount++;
                const modal = document.getElementById('plant-detail-modal');
                
                if (modal && modal.style.display === 'flex') {
                    clearInterval(checkInterval);
                    console.log('Direct plant image fix: Modal detected after click');
                    setTimeout(updateModalImage, 100);
                } else if (checkCount >= maxChecks) {
                    clearInterval(checkInterval);
                    console.log('Direct plant image fix: Gave up waiting for modal');
                }
            }, 50);
        });
        
        console.log('Direct plant image fix: Pod click interceptor set up');
    }
    
    // Handle photo update events
    function setupPhotoUpdateHandler() {
        document.addEventListener('click', function(event) {
            if (event.target.id === 'update-plant-photo' || 
                event.target.closest('#update-plant-photo')) {
                
                console.log('Direct plant image fix: Photo update button clicked');
                
                // Monitor for when processing is complete
                let checkCount = 0;
                const maxChecks = 60; // 30 second timeout
                const checkInterval = setInterval(function() {
                    checkCount++;
                    const overlay = document.querySelector('.processing-overlay');
                    
                    if (!overlay) {
                        clearInterval(checkInterval);
                        console.log('Direct plant image fix: Processing complete');
                        
                        // Update modal image after processing completes
                        setTimeout(updateModalImage, 500);
                        setTimeout(updateModalImage, 1000);
                    } else if (checkCount >= maxChecks) {
                        clearInterval(checkInterval);
                        console.log('Direct plant image fix: Gave up waiting for processing');
                    }
                }, 500);
            }
        });
        
        console.log('Direct plant image fix: Photo update handler set up');
    }
    
    // Set everything up when the page is fully loaded
    window.addEventListener('load', function() {
        console.log('Direct plant image fix: Page loaded, setting up handlers');
        setupModalObserver();
        setupPodClickInterceptor();
        setupPhotoUpdateHandler();
    });
    
    // Try to handle the case where the modal is already open when our script runs
    if (document.readyState === 'complete') {
        console.log('Direct plant image fix: Document already loaded, checking for open modal');
        const modal = document.getElementById('plant-detail-modal');
        if (modal && modal.style.display === 'flex') {
            console.log('Direct plant image fix: Modal already open, updating image');
            setTimeout(updateModalImage, 100);
        }
        
        setupModalObserver();
        setupPodClickInterceptor();
        setupPhotoUpdateHandler();
    }
})();

// Add this to jalika-enhancements.js to ensure the chart containers are properly structured

// Fix chart container structure with 2x2 layout
function fixChartContainers() {
    // Wait for charts to be rendered
    setTimeout(function() {
        console.log('[Jalika] Fixing chart containers...');
        
        // Get the chart container
        const chartsContainer = document.getElementById('sensor-charts-container');
        if (!chartsContainer) {
            console.log('[Jalika] No chart container found to fix');
            return;
        }
        
        // Get all chart wrappers
        const chartWrappers = chartsContainer.querySelectorAll('.chart-wrapper');
        if (!chartWrappers.length) {
            console.log('[Jalika] No chart wrappers found to fix');
            return;
        }
        
        // Apply additional stabilizing attributes
        chartWrappers.forEach(wrapper => {
            // Ensure canvas has proper style
            const canvas = wrapper.querySelector('canvas');
            if (canvas) {
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.position = 'absolute';
                canvas.style.top = '0';
                canvas.style.left = '0';
                
                // Important - ensure parent wrapper has position relative
                wrapper.style.position = 'relative';
                wrapper.style.height = '280px'; // Increased height
                wrapper.style.overflow = 'visible'; // Changed to visible
                wrapper.style.paddingTop = '10px'; // Added padding
                
                console.log('[Jalika] Fixed chart wrapper and canvas styles');
            }
        });
        
        // Ensure the container itself has proper structure - 2x2 layout
        chartsContainer.style.display = 'grid';
        chartsContainer.style.gridTemplateColumns = 'repeat(2, 1fr)'; // Force 2 columns
        chartsContainer.style.gap = '20px';
        chartsContainer.style.width = '100%';
        
        // Adjust Chart.js options to prevent cut-off
        if (window.Chart && Chart.instances) {
            Object.values(Chart.instances).forEach(chart => {
                // Add padding to top of chart
                if (chart.options && chart.options.scales && chart.options.scales.y) {
                    chart.options.scales.y.ticks = chart.options.scales.y.ticks || {};
                    chart.options.scales.y.ticks.padding = 10;
                    
                    // Also increase top padding in the layout
                    chart.options.layout = chart.options.layout || {};
                    chart.options.layout.padding = chart.options.layout.padding || {};
                    chart.options.layout.padding.top = 20;
                }
                
                // Update the chart
                chart.update();
            });
        }
        
        console.log('[Jalika] Chart containers fixed with 2x2 layout!');
    }, 500); // Wait for charts to render
}

// Listen for data updates which trigger chart rendering
document.addEventListener('jalika:dataUpdated', function() {
    console.log('[Jalika] Data updated, fixing charts after render...');
    // Fix charts after a delay to ensure they're rendered
    setTimeout(fixChartContainers, 300);
});

// Run once on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Jalika] Page loaded, fixing charts...');
    fixChartContainers();
});