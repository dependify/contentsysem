// TinyPNG Image Compression Service
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const TINIFY_API_KEY = process.env.TINIFY_API_KEY || '5kQmsjVc88MsPyTSfgg4qHXyS2JhsZsg';
const TINIFY_API_URL = 'https://api.tinify.com/shrink';

interface CompressionResult {
    success: boolean;
    originalSize: number;
    compressedSize: number;
    savings: number;
    outputPath: string;
    error?: string;
}

/**
 * Compress an image using TinyPNG API
 * @param inputPath - Path to the input image file
 * @param outputPath - Optional path for the compressed output (defaults to overwrite input)
 * @returns CompressionResult with size savings information
 */
export async function compressImage(inputPath: string, outputPath?: string): Promise<CompressionResult> {
    const output = outputPath || inputPath;

    try {
        // Read the image file
        const imageBuffer = fs.readFileSync(inputPath);
        const originalSize = imageBuffer.length;

        // Send to TinyPNG API
        const response = await axios.post(TINIFY_API_URL, imageBuffer, {
            auth: {
                username: 'api',
                password: TINIFY_API_KEY
            },
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            responseType: 'json'
        });

        // Get the compressed image URL from the response
        const compressedUrl = response.data.output.url;
        const compressedSize = response.data.output.size;

        // Download the compressed image
        const compressedResponse = await axios.get(compressedUrl, {
            auth: {
                username: 'api',
                password: TINIFY_API_KEY
            },
            responseType: 'arraybuffer'
        });

        // Write the compressed image to disk
        fs.writeFileSync(output, compressedResponse.data);

        const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

        console.log(`[TinyPNG] Compressed ${path.basename(inputPath)}: ${originalSize} -> ${compressedSize} bytes (${savings}% saved)`);

        return {
            success: true,
            originalSize,
            compressedSize,
            savings: parseFloat(savings),
            outputPath: output
        };
    } catch (error: any) {
        console.error('[TinyPNG] Compression failed:', error.response?.data || error.message);

        return {
            success: false,
            originalSize: 0,
            compressedSize: 0,
            savings: 0,
            outputPath: output,
            error: error.response?.data?.message || error.message
        };
    }
}

/**
 * Compress multiple images in batch
 * @param imagePaths - Array of image file paths
 * @returns Array of CompressionResults
 */
export async function compressImages(imagePaths: string[]): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];

    // Process sequentially to avoid rate limiting
    for (const imagePath of imagePaths) {
        const result = await compressImage(imagePath);
        results.push(result);

        // Small delay between requests to be respectful of API limits
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
}

/**
 * Check if file is a supported image type for compression
 */
export function isCompressibleImage(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
}

/**
 * Get TinyPNG API usage/compression count
 * This is returned in the x-compression-count header of each request
 */
let monthlyCompressionCount = 0;

export function getCompressionCount(): number {
    return monthlyCompressionCount;
}

export function updateCompressionCount(count: number): void {
    monthlyCompressionCount = count;
}
