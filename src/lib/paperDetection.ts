/**
 * Paper Detection Utility
 * 
 * Detects white paper boundaries in an image using a GRID-BASED DENSITY approach:
 * 1. Divide image into grid cells
 * 2. Calculate white pixel density per cell
 * 3. Find the largest rectangular region of cells with sufficient density
 * 4. This works even with writing/drawing on the paper
 */

export interface CropArea {
    x: number;      // percentage from left (0-100)
    y: number;      // percentage from top (0-100)
    width: number;  // percentage of image width (0-100)
    height: number; // percentage of image height (0-100)
}

export interface DetectionResult {
    detected: boolean;
    cropArea: CropArea;
    confidence: number; // 0-1, how confident we are in the detection
}

// Detection parameters
const BRIGHTNESS_THRESHOLD = 120;
const MIN_PAPER_COVERAGE = 0.05;
const MAX_PAPER_COVERAGE = 0.95;
const PADDING_PERCENT = 0.02;

// Grid-based density detection parameters
const CELL_SIZE = 40; // pixels per cell
const MIN_CELL_DENSITY = 0.35; // cells with >35% white pixels are considered "paper"
const MIN_RECT_CELLS = 6; // minimum cells in each dimension for valid rectangle

interface DensityCell {
    x: number;
    y: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    density: number;
    isPaper: boolean;
}

interface GridRect {
    area: number;
    gridX: number;
    gridY: number;
    gridWidth: number;
    gridHeight: number;
}

interface PixelRect {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

/**
 * Convert an image data URL to an ImageData object for analysis
 */
async function getImageData(imageDataUrl: string): Promise<{ imageData: ImageData; width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resolve({ imageData, width: canvas.width, height: canvas.height });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageDataUrl;
    });
}

/**
 * Calculate the brightness of a pixel (0-255)
 */
function getPixelBrightness(r: number, g: number, b: number): number {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Check if a pixel is considered "white" (paper-like)
 */
function isWhitePixel(r: number, g: number, b: number): boolean {
    const brightness = getPixelBrightness(r, g, b);
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;
    return brightness > BRIGHTNESS_THRESHOLD && saturation < 0.3;
}

/**
 * Find all white pixels and create a mask
 */
function findWhitePixels(
    imageData: ImageData,
    width: number,
    height: number
): { whitePixelCount: number; whitePixelMask: Uint8Array } {
    const data = imageData.data;
    let whitePixelCount = 0;
    const whitePixelMask = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            if (isWhitePixel(r, g, b)) {
                whitePixelCount++;
                whitePixelMask[y * width + x] = 1;
            }
        }
    }

    return { whitePixelCount, whitePixelMask };
}

/**
 * Create a grid of cells with white pixel density values
 */
function createDensityGrid(
    whitePixelMask: Uint8Array,
    width: number,
    height: number,
    cellSize: number
): { densityGrid: DensityCell[][]; gridWidth: number; gridHeight: number } {
    const gridWidth = Math.ceil(width / cellSize);
    const gridHeight = Math.ceil(height / cellSize);
    const densityGrid: DensityCell[][] = [];

    for (let gy = 0; gy < gridHeight; gy++) {
        const row: DensityCell[] = [];
        for (let gx = 0; gx < gridWidth; gx++) {
            // Calculate bounds for this cell
            const x1 = gx * cellSize;
            const y1 = gy * cellSize;
            const x2 = Math.min((gx + 1) * cellSize, width);
            const y2 = Math.min((gy + 1) * cellSize, height);
            
            // Count white pixels in this cell
            let whiteCount = 0;
            let totalCount = 0;
            
            for (let y = y1; y < y2; y++) {
                for (let x = x1; x < x2; x++) {
                    totalCount++;
                    if (whitePixelMask[y * width + x]) {
                        whiteCount++;
                    }
                }
            }
            
            const density = totalCount > 0 ? whiteCount / totalCount : 0;
            row.push({
                x: gx,
                y: gy,
                x1, y1, x2, y2,
                density,
                isPaper: density >= MIN_CELL_DENSITY
            });
        }
        densityGrid.push(row);
    }

    return { densityGrid, gridWidth, gridHeight };
}

/**
 * Find largest rectangle in histogram using stack-based approach
 */
function largestRectangleInHistogram(
    heights: number[],
    bottomY: number
): GridRect {
    const stack: number[] = [];
    let maxArea = 0;
    let bestRect: GridRect = {
        area: 0,
        gridX: 0,
        gridY: 0,
        gridWidth: 0,
        gridHeight: 0
    };
    const n = heights.length;
    
    for (let i = 0; i <= n; i++) {
        const h = i === n ? 0 : heights[i];
        
        while (stack.length > 0 && heights[stack[stack.length - 1]] > h) {
            const height = heights[stack.pop()!];
            const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
            const area = height * width;
            
            if (area > maxArea) {
                maxArea = area;
                const left = stack.length === 0 ? 0 : stack[stack.length - 1] + 1;
                bestRect = {
                    area,
                    gridX: left,
                    gridY: bottomY - height + 1,
                    gridWidth: width,
                    gridHeight: height
                };
            }
        }
        stack.push(i);
    }
    
    return bestRect;
}

/**
 * Find the largest rectangle of paper cells using maximal rectangle algorithm
 * Returns coordinates in grid units
 */
function findLargestPaperRectangle(
    densityGrid: DensityCell[][],
    gridWidth: number,
    gridHeight: number
): GridRect | null {
    // Create a binary matrix where 1 = paper cell
    const matrix = densityGrid.map(row => row.map(cell => cell.isPaper ? 1 : 0));
    
    // Calculate histogram heights for each row
    const heights = new Array(gridWidth).fill(0);
    
    let maxArea = 0;
    let bestRect: GridRect | null = null;
    
    for (let y = 0; y < gridHeight; y++) {
        // Update heights
        for (let x = 0; x < gridWidth; x++) {
            if (matrix[y][x] === 1) {
                heights[x]++;
            } else {
                heights[x] = 0;
            }
        }
        
        // Find largest rectangle in histogram
        const result = largestRectangleInHistogram(heights, y);
        if (result.area > maxArea) {
            maxArea = result.area;
            bestRect = result;
        }
    }
    
    return bestRect;
}

/**
 * Convert grid rectangle to pixel coordinates
 */
function gridToPixelRect(
    gridRect: GridRect,
    cellSize: number,
    imageWidth: number,
    imageHeight: number
): PixelRect {
    const x1 = gridRect.gridX * cellSize;
    const y1 = gridRect.gridY * cellSize;
    const x2 = Math.min((gridRect.gridX + gridRect.gridWidth) * cellSize, imageWidth);
    const y2 = Math.min((gridRect.gridY + gridRect.gridHeight) * cellSize, imageHeight);
    
    return {
        minX: x1,
        minY: y1,
        maxX: x2,
        maxY: y2,
        width: x2 - x1,
        height: y2 - y1
    };
}

/**
 * Main function to detect paper in an image
 * 
 * @param imageDataUrl - The image as a data URL (e.g., from canvas.toDataURL())
 * @returns DetectionResult with crop coordinates and confidence
 */
export async function detectPaper(imageDataUrl: string): Promise<DetectionResult> {
    try {
        const { imageData, width, height } = await getImageData(imageDataUrl);
        const totalPixels = width * height;

        // Step 1: Find white pixels
        const { whitePixelCount, whitePixelMask } = findWhitePixels(imageData, width, height);
        const coverage = whitePixelCount / totalPixels;

        // Check coverage validity
        if (coverage < MIN_PAPER_COVERAGE || coverage > MAX_PAPER_COVERAGE) {
            return {
                detected: false,
                cropArea: { x: 0, y: 0, width: 100, height: 100 },
                confidence: 0
            };
        }

        // Step 2: Create density grid
        const { densityGrid, gridWidth, gridHeight } = createDensityGrid(
            whitePixelMask,
            width,
            height,
            CELL_SIZE
        );

        // Step 3: Find largest paper rectangle
        const gridRect = findLargestPaperRectangle(densityGrid, gridWidth, gridHeight);

        if (!gridRect || gridRect.gridWidth < MIN_RECT_CELLS || gridRect.gridHeight < MIN_RECT_CELLS) {
            return {
                detected: false,
                cropArea: { x: 0, y: 0, width: 100, height: 100 },
                confidence: 0
            };
        }

        // Step 4: Convert to pixel coordinates
        const paperRect = gridToPixelRect(gridRect, CELL_SIZE, width, height);

        // Step 5: Apply padding
        const paddingX = paperRect.width * PADDING_PERCENT;
        const paddingY = paperRect.height * PADDING_PERCENT;

        const cropX = Math.max(0, paperRect.minX - paddingX);
        const cropY = Math.max(0, paperRect.minY - paddingY);
        const cropWidth = Math.min(width - cropX, paperRect.width + 2 * paddingX);
        const cropHeight = Math.min(height - cropY, paperRect.height + 2 * paddingY);

        // Convert to percentages
        const cropArea: CropArea = {
            x: (cropX / width) * 100,
            y: (cropY / height) * 100,
            width: (cropWidth / width) * 100,
            height: (cropHeight / height) * 100
        };

        // Calculate confidence based on cell density within the rectangle
        let totalDensity = 0;
        for (let gy = gridRect.gridY; gy < gridRect.gridY + gridRect.gridHeight; gy++) {
            for (let gx = gridRect.gridX; gx < gridRect.gridX + gridRect.gridWidth; gx++) {
                totalDensity += densityGrid[gy][gx].density;
            }
        }
        const avgDensity = totalDensity / (gridRect.gridWidth * gridRect.gridHeight);
        const confidence = Math.min(1, avgDensity * 1.2);

        return {
            detected: true,
            cropArea,
            confidence
        };
    } catch (error) {
        console.error('Paper detection failed:', error);
        return {
            detected: false,
            cropArea: { x: 0, y: 0, width: 100, height: 100 },
            confidence: 0
        };
    }
}

/**
 * Create a cropped image from the original image and crop area
 * 
 * @param imageDataUrl - Original image as data URL
 * @param cropArea - Crop area in percentages
 * @returns Promise with cropped image as data URL and File object
 */
export async function createCroppedImage(
    imageDataUrl: string,
    cropArea: CropArea
): Promise<{ dataUrl: string; file: File }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            
            // Calculate pixel coordinates from percentages
            const x = (cropArea.x / 100) * img.width;
            const y = (cropArea.y / 100) * img.height;
            const width = (cropArea.width / 100) * img.width;
            const height = (cropArea.height / 100) * img.height;

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const file = new File([blob], `cropped-${Date.now()}.jpg`, {
                            type: 'image/jpeg'
                        });
                        resolve({ dataUrl, file });
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                'image/jpeg',
                0.9
            );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageDataUrl;
    });
}

