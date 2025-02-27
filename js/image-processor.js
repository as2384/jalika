// Jalika - Image Processing Utilities
// Handles cartoonizing plant images

const ImageProcessor = (function() {
    'use strict';
    
    // Configuration
    const config = {
        // Default cartoon styles
        defaultStyle: 'kawaii',
        styles: {
            kawaii: {
                saturation: 1.4,
                contrast: 1.8,
                brightness: 0.9,
                blur: 0,
                posterize: 5,
                edgeStrength: 0.3
            },
            sketch: {
                saturation: 0.2,
                contrast: 2.0,
                brightness: 1.0,
                blur: 1,
                posterize: 8,
                edgeStrength: 0.7
            },
            watercolor: {
                saturation: 1.3,
                contrast: 1.2,
                brightness: 1.1,
                blur: 2,
                posterize: 7,
                edgeStrength: 0.1
            }
        },
        maxWidth: 400,
        maxHeight: 400
    };
    
    // Cartoonize an image
    function cartoonizeImage(imageUrl, style = config.defaultStyle) {
        return new Promise((resolve, reject) => {
            // Create a canvas element
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Load the image
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Handle CORS issues
            
            img.onload = function() {
                try {
                    // Resize image if needed
                    let width = img.width;
                    let height = img.height;
                    
                    // Calculate aspect ratio to maintain proportions
                    if (width > config.maxWidth) {
                        const ratio = config.maxWidth / width;
                        width = config.maxWidth;
                        height = height * ratio;
                    }
                    
                    if (height > config.maxHeight) {
                        const ratio = config.maxHeight / height;
                        height = config.maxHeight;
                        width = width * ratio;
                    }
                    
                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw the original image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Get the style settings
                    const styleSettings = config.styles[style] || config.styles.kawaii;
                    
                    // Apply cartoon effects
                    applyCartoonEffect(canvas, ctx, styleSettings);
                    
                    // Get the final image URL
                    const cartoonizedImageUrl = canvas.toDataURL('image/png');
                    resolve(cartoonizedImageUrl);
                } catch (error) {
                    console.error('Error processing image:', error);
                    reject(error);
                }
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load image'));
            };
            
            // Set the source to start loading
            img.src = imageUrl;
        });
    }
    
    // Apply cartoon effect to canvas
    function applyCartoonEffect(canvas, ctx, style) {
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Store original pixel data for edge detection
        const originalData = new Uint8ClampedArray(data);
        
        // Apply saturation, contrast, brightness adjustments
        for (let i = 0; i < data.length; i += 4) {
            // Convert RGB to HSL
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            
            if (max === min) {
                h = s = 0; // achromatic
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            
            // Adjust saturation
            s = Math.min(1, s * style.saturation);
            
            // Adjust brightness
            l = Math.min(1, l * style.brightness);
            
            // Convert back to RGB
            let r1, g1, b1;
            
            if (s === 0) {
                r1 = g1 = b1 = l; // achromatic
            } else {
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r1 = hue2rgb(p, q, h + 1/3);
                g1 = hue2rgb(p, q, h);
                b1 = hue2rgb(p, q, h - 1/3);
            }
            
            // Apply contrast
            r1 = ((r1 - 0.5) * style.contrast + 0.5) * 255;
            g1 = ((g1 - 0.5) * style.contrast + 0.5) * 255;
            b1 = ((b1 - 0.5) * style.contrast + 0.5) * 255;
            
            // Apply posterization (reduces number of colors)
            r1 = Math.round(r1 / (255 / style.posterize)) * (255 / style.posterize);
            g1 = Math.round(g1 / (255 / style.posterize)) * (255 / style.posterize);
            b1 = Math.round(b1 / (255 / style.posterize)) * (255 / style.posterize);
            
            // Clamp values
            data[i] = Math.max(0, Math.min(255, r1));
            data[i + 1] = Math.max(0, Math.min(255, g1));
            data[i + 2] = Math.max(0, Math.min(255, b1));
        }
        
        // Apply edge detection if needed
        if (style.edgeStrength > 0) {
            applyEdgeDetection(data, originalData, canvas.width, canvas.height, style.edgeStrength);
        }
        
        // Put the modified data back
        ctx.putImageData(imageData, 0, 0);
        
        // Apply blur if needed
        if (style.blur > 0) {
            applyStackBlur(canvas, ctx, style.blur);
        }
    }
    
    // Helper function for HSL to RGB conversion
    function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }
    
    // Simple edge detection (Sobel operator)
    function applyEdgeDetection(data, originalData, width, height, strength) {
        // Create a copy of the data to avoid overwriting during processing
        const tempData = new Uint8ClampedArray(data.length);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Calculate grayscale values for 3x3 kernel
                const gx = [
                    -1, 0, 1,
                    -2, 0, 2,
                    -1, 0, 1
                ];
                const gy = [
                    -1, -2, -1,
                    0, 0, 0,
                    1, 2, 1
                ];
                
                let valueX = 0;
                let valueY = 0;
                
                // Apply kernel
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
                        const gray = (originalData[pixelIdx] + originalData[pixelIdx + 1] + originalData[pixelIdx + 2]) / 3;
                        
                        valueX += gray * gx[(ky + 1) * 3 + (kx + 1)];
                        valueY += gray * gy[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                
                // Calculate gradient magnitude
                const magnitude = Math.sqrt(valueX * valueX + valueY * valueY);
                
                // Apply edge strength
                const edge = magnitude * strength;
                
                // If edge is strong enough, darken the pixel
                if (edge > 50) {
                    tempData[idx] = Math.max(0, data[idx] - edge);
                    tempData[idx + 1] = Math.max(0, data[idx + 1] - edge);
                    tempData[idx + 2] = Math.max(0, data[idx + 2] - edge);
                } else {
                    tempData[idx] = data[idx];
                    tempData[idx + 1] = data[idx + 1];
                    tempData[idx + 2] = data[idx + 2];
                }
                tempData[idx + 3] = data[idx + 3]; // Alpha stays the same
            }
        }
        
        // Copy edge-detected data back
        for (let i = 0; i < data.length; i++) {
            data[i] = tempData[i];
        }
    }
    
    // Apply Stack Blur algorithm (simplified version)
    function applyStackBlur(canvas, ctx, radius) {
        if (radius < 1) return;
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        let x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum, a_sum, 
            r_out_sum, g_out_sum, b_out_sum, a_out_sum,
            r_in_sum, g_in_sum, b_in_sum, a_in_sum,
            pr, pg, pb, pa, rbs;
            
        const div = radius + radius + 1;
        const widthMinus1 = width - 1;
        const heightMinus1 = height - 1;
        const radiusPlus1 = radius + 1;
        const sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;
        
        const stackStart = new BlurStack();
        let stack = stackStart;
        let stackEnd;
        for (i = 1; i < div; i++) {
            stack = stack.next = new BlurStack();
            if (i === radiusPlus1) stackEnd = stack;
        }
        stack.next = stackStart;
        
        yw = yi = 0;
        
        for (y = 0; y < height; y++) {
            r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;
            
            r_out_sum = radiusPlus1 * (pr = data[yi]);
            g_out_sum = radiusPlus1 * (pg = data[yi + 1]);
            b_out_sum = radiusPlus1 * (pb = data[yi + 2]);
            a_out_sum = radiusPlus1 * (pa = data[yi + 3]);
            
            r_sum += sumFactor * pr;
            g_sum += sumFactor * pg;
            b_sum += sumFactor * pb;
            a_sum += sumFactor * pa;
            
            stack = stackStart;
            
            for (i = 0; i < radiusPlus1; i++) {
                stack.r = pr;
                stack.g = pg;
                stack.b = pb;
                stack.a = pa;
                stack = stack.next;
            }
            
            for (i = 1; i < radiusPlus1; i++) {
                p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
                r_sum += (stack.r = (pr = data[p])) * (rbs = radiusPlus1 - i);
                g_sum += (stack.g = (pg = data[p + 1])) * rbs;
                b_sum += (stack.b = (pb = data[p + 2])) * rbs;
                a_sum += (stack.a = (pa = data[p + 3])) * rbs;
                
                r_in_sum += pr;
                g_in_sum += pg;
                b_in_sum += pb;
                a_in_sum += pa;
                
                stack = stack.next;
            }
            
            stackIn = stackStart;
            stackOut = stackEnd;
            for (x = 0; x < width; x++) {
                data[yi] = (r_sum * mulSum) >> shgSum;
                data[yi + 1] = (g_sum * mulSum) >> shgSum;
                data[yi + 2] = (b_sum * mulSum) >> shgSum;
                data[yi + 3] = (a_sum * mulSum) >> shgSum;
                
                r_sum -= r_out_sum;
                g_sum -= g_out_sum;
                b_sum -= b_out_sum;
                a_sum -= a_out_sum;
                
                r_out_sum -= stackIn.r;
                g_out_sum -= stackIn.g;
                b_out_sum -= stackIn.b;
                a_out_sum -= stackIn.a;
                
                p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;
                
                r_in_sum += (stackIn.r = data[p]);
                g_in_sum += (stackIn.g = data[p + 1]);
                b_in_sum += (stackIn.b = data[p + 2]);
                a_in_sum += (stackIn.a = data[p + 3]);
                
                r_sum += r_in_sum;
                g_sum += g_in_sum;
                b_sum += b_in_sum;
                a_sum += a_in_sum;
                
                stackIn = stackIn.next;
                
                r_out_sum += (pr = stackOut.r);
                g_out_sum += (pg = stackOut.g);
                b_out_sum += (pb = stackOut.b);
                a_out_sum += (pa = stackOut.a);
                
                r_in_sum -= pr;
                g_in_sum -= pg;
                b_in_sum -= pb;
                a_in_sum -= pa;
                
                stackOut = stackOut.next;
                
                yi += 4;
            }
            yw += width;
        }
        
        for (x = 0; x < width; x++) {
            g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;
            
            yi = x << 2;
            r_out_sum = radiusPlus1 * (pr = data[yi]);
            g_out_sum = radiusPlus1 * (pg = data[yi + 1]);
            b_out_sum = radiusPlus1 * (pb = data[yi + 2]);
            a_out_sum = radiusPlus1 * (pa = data[yi + 3]);
            
            r_sum += sumFactor * pr;
            g_sum += sumFactor * pg;
            b_sum += sumFactor * pb;
            a_sum += sumFactor * pa;
            
            stack = stackStart;
            
            for (i = 0; i < radiusPlus1; i++) {
                stack.r = pr;
                stack.g = pg;
                stack.b = pb;
                stack.a = pa;
                stack = stack.next;
            }
            
            yp = width;
            
            for (i = 1; i <= radius; i++) {
                yi = (yp + x) << 2;
                
                r_sum += (stack.r = (pr = data[yi])) * (rbs = radiusPlus1 - i);
                g_sum += (stack.g = (pg = data[yi + 1])) * rbs;
                b_sum += (stack.b = (pb = data[yi + 2])) * rbs;
                a_sum += (stack.a = (pa = data[yi + 3])) * rbs;
                
                r_in_sum += pr;
                g_in_sum += pg;
                b_in_sum += pb;
                a_in_sum += pa;
                
                stack = stack.next;
                
                if (i < heightMinus1) {
                    yp += width;
                }
            }
            
            yi = x;
            stackIn = stackStart;
            stackOut = stackEnd;
            for (y = 0; y < height; y++) {
                p = yi << 2;
                data[p] = (r_sum * mulSum) >> shgSum;
                data[p + 1] = (g_sum * mulSum) >> shgSum;
                data[p + 2] = (b_sum * mulSum) >> shgSum;
                data[p + 3] = (a_sum * mulSum) >> shgSum;
                
                r_sum -= r_out_sum;
                g_sum -= g_out_sum;
                b_sum -= b_out_sum;
                a_sum -= a_out_sum;
                
                r_out_sum -= stackIn.r;
                g_out_sum -= stackIn.g;
                b_out_sum -= stackIn.b;
                a_out_sum -= stackIn.a;
                
                p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;
                
                r_sum += (r_in_sum += (stackIn.r = data[p]));
                g_sum += (g_in_sum += (stackIn.g = data[p + 1]));
                b_sum += (b_in_sum += (stackIn.b = data[p + 2]));
                a_sum += (a_in_sum += (stackIn.a = data[p + 3]));
                
                stackIn = stackIn.next;
                
                r_out_sum += (pr = stackOut.r);
                g_out_sum += (pg = stackOut.g);
                b_out_sum += (pb = stackOut.b);
                a_out_sum += (pa = stackOut.a);
                
                r_in_sum -= pr;
                g_in_sum -= pg;
                b_in_sum -= pb;
                a_in_sum -= pa;
                
                stackOut = stackOut.next;
                
                yi += width;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    // BlurStack for Stack Blur algorithm
    function BlurStack() {
        this.r = 0;
        this.g = 0;
        this.b = 0;
        this.a = 0;
        this.next = null;
    }
    
    // For simplified blur implementation
    const mulSum = 1/9;
    const shgSum = 0;
    
    // Generate SVG cartoon image (simpler alternative)
    function generateKawaiiSVG(colors) {
        // Default colors if not provided
        colors = colors || {
            background: '#f5f5f5',
            pot: '#F9A825',
            potDark: '#F57F17',
            stem: '#8DC26F',
            leaves: '#A5D6A7',
            leafBorder: '#8DC26F',
            face: '#C5E1A5',
            faceDetail: '#513614',
            blush: '#F8BBD0',
            accent1: '#9575CD',
            accent2: '#F9A825'
        };
        
        // SVG template with color variables
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
            <!-- Background -->
            <circle cx="100" cy="100" r="95" fill="${colors.background}" />
            
            <!-- Kawaii Pot -->
            <path d="M60 150 Q80 140 100 140 Q120 140 140 150 L140 150 Q140 160 140 170 Q120 180 80 180 Q60 180 60 170 Z" fill="${colors.pot}" />
            <ellipse cx="100" cy="180" rx="40" ry="10" fill="${colors.potDark}" />
            
            <!-- Cute Face on Pot -->
            <circle cx="90" cy="160" r="3" fill="${colors.faceDetail}" />
            <circle cx="110" cy="160" r="3" fill="${colors.faceDetail}" />
            <path d="M95 170 Q100 173 105 170" fill="none" stroke="${colors.faceDetail}" stroke-width="2" stroke-linecap="round" />
            
            <!-- Plant Stem with gentle curves -->
            <path d="M100 140 C105 120 95 110 100 90 C105 70 95 60 100 40" stroke="${colors.stem}" stroke-width="5" stroke-linecap="round" fill="none" />
            
            <!-- Kawaii Leaves -->
            <path d="M100 90 C110 85 120 90 125 80 C120 70 110 75 100 70" fill="${colors.leaves}" stroke="${colors.leafBorder}" stroke-width="2" />
            <path d="M100 90 C90 85 80 90 75 80 C80 70 90 75 100 70" fill="${colors.leaves}" stroke="${colors.leafBorder}" stroke-width="2" />
            
            <path d="M100 110 C110 115 120 110 125 120 C120 130 110 125 100 130" fill="${colors.leaves}" stroke="${colors.leafBorder}" stroke-width="2" />
            <path d="M100 110 C90 115 80 110 75 120 C80 130 90 125 100 130" fill="${colors.leaves}" stroke="${colors.leafBorder}" stroke-width="2" />
            
            <!-- Cute Plant Face -->
            <circle cx="100" cy="50" r="15" fill="${colors.face}" />
            
            <!-- Kawaii Eyes -->
            <g transform="translate(100 50)">
                <!-- Left Eye -->
                <g transform="translate(-7 -3)">
                    <ellipse cx="0" cy="0" rx="3" ry="4" fill="${colors.faceDetail}" />
                    <circle cx="-1" cy="-1" r="1" fill="white" />
                </g>
                
                <!-- Right Eye -->
                <g transform="translate(7 -3)">
                    <ellipse cx="0" cy="0" rx="3" ry="4" fill="${colors.faceDetail}" />
                    <circle cx="-1" cy="-1" r="1" fill="white" />
                </g>
                
                <!-- Blush spots -->
                <circle cx="-9" cy="3" r="2.5" fill="${colors.blush}" opacity="0.7" />
                <circle cx="9" cy="3" r="2.5" fill="${colors.blush}" opacity="0.7" />
                
                <!-- Kawaii smile -->
                <path d="M-5 5 Q0 8 5 5" fill="none" stroke="${colors.faceDetail}" stroke-width="2" stroke-linecap="round" />
            </g>
            
            <!-- Small decorative elements -->
            <circle cx="70" cy="100" r="3" fill="${colors.accent1}" opacity="0.7" />
            <circle cx="130" cy="100" r="3" fill="${colors.accent1}" opacity="0.7" />
            <circle cx="80" cy="60" r="2" fill="${colors.accent2}" opacity="0.7" />
            <circle cx="120" cy="60" r="2" fill="${colors.accent2}" opacity="0.7" />
        </svg>`;
        
        // Create a data URL from the SVG
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    
    // Extract dominant colors from an image
    function extractColors(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = function() {
                try {
                    // Create a small canvas to sample colors
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Resize to a small version for faster processing
                    canvas.width = 50;
                    canvas.height = 50;
                    
                    // Draw the image
                    ctx.drawImage(img, 0, 0, 50, 50);
                    
                    // Get image data
                    const imageData = ctx.getImageData(0, 0, 50, 50);
                    const data = imageData.data;
                    
                    // Simple color counting for dominant colors
                    const colorCounts = {};
                    
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        
                        // Skip transparent pixels
                        if (data[i + 3] < 128) continue;
                        
                        // Simplify colors (reduce precision to group similar colors)
                        const simpleR = Math.floor(r / 16) * 16;
                        const simpleG = Math.floor(g / 16) * 16;
                        const simpleB = Math.floor(b / 16) * 16;
                        
                        const colorKey = `${simpleR},${simpleG},${simpleB}`;
                        
                        if (!colorCounts[colorKey]) {
                            colorCounts[colorKey] = 0;
                        }
                        
                        colorCounts[colorKey]++;
                    }
                    
                    // Convert to array for sorting
                    const colorArray = Object.keys(colorCounts).map(key => {
                        const [r, g, b] = key.split(',').map(Number);
                        return {
                            color: `rgb(${r},${g},${b})`,
                            count: colorCounts[key]
                        };
                    });
                    
                    // Sort by count
                    colorArray.sort((a, b) => b.count - a.count);
                    
                    // Get top colors (at most 5)
                    const topColors = colorArray.slice(0, 5).map(item => item.color);
                    
                    resolve(topColors);
                } catch (error) {
                    console.error('Error extracting colors:', error);
                    reject(error);
                }
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load image for color extraction'));
            };
            
            img.src = imageUrl;
        });
    }
    
    // Apply cartoon style based on image theme
    async function createThematicCartoonFromImage(imageUrl) {
        try {
            // First, extract dominant colors
            const dominantColors = await extractColors(imageUrl);
            
            // Prepare SVG colors object using dominant colors
            const svgColors = {
                background: '#f5f5f5', // Keep neutral background
                pot: dominantColors[0] || '#F9A825',
                potDark: adjustColorBrightness(dominantColors[0] || '#F57F17', -20),
                stem: dominantColors[1] || '#8DC26F',
                leaves: dominantColors[2] || '#A5D6A7',
                leafBorder: adjustColorBrightness(dominantColors[2] || '#8DC26F', -10),
                face: adjustColorBrightness(dominantColors[2] || '#C5E1A5', 10),
                faceDetail: '#513614', // Keep dark for contrast
                blush: '#F8BBD0', // Keep pink blush
                accent1: dominantColors[3] || '#9575CD',
                accent2: dominantColors[4] || '#F9A825'
            };
            
            // Generate SVG with these colors
            return generateKawaiiSVG(svgColors);
        } catch (error) {
            console.error('Error creating thematic cartoon:', error);
            // Fall back to default SVG if there's an error
            return generateKawaiiSVG();
        }
    }
    
    // Helper to adjust color brightness
    function adjustColorBrightness(color, percent) {
        if (color.startsWith('#')) {
            color = hexToRgb(color);
        } else if (color.startsWith('rgb')) {
            // Extract RGB values from string like 'rgb(123,123,123)'
            const matches = color.match(/\d+/g);
            if (matches && matches.length >= 3) {
                color = {
                    r: parseInt(matches[0]),
                    g: parseInt(matches[1]),
                    b: parseInt(matches[2])
                };
            }
        }
        
        // Ensure we have an object with r,g,b properties
        if (!color || typeof color !== 'object' || !('r' in color)) {
            return '#F9A825'; // Default color on error
        }
        
        const amt = Math.round(2.55 * percent);
        const r = Math.max(0, Math.min(255, color.r + amt));
        const g = Math.max(0, Math.min(255, color.g + amt));
        const b = Math.max(0, Math.min(255, color.b + amt));
        
        return `rgb(${r},${g},${b})`;
    }
    
    // Convert hex to rgb
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    // Public API
    return {
        cartoonizeImage,
        generateKawaiiSVG,
        createThematicCartoonFromImage
    };
})();
