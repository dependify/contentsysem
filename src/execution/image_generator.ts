import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface ImageGenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  model?: string;
}

interface GeneratedImage {
  url: string;
  localPath: string;
  prompt: string;
}

// Runware.ai client for image generation
export class RunwareImageGenerator {
  private apiKey: string;
  private baseUrl = 'https://api.runware.ai/v1';

  constructor() {
    const apiKey = process.env.RUNWARE_API_KEY;
    if (!apiKey) {
      throw new Error('RUNWARE_API_KEY not found in environment variables');
    }
    this.apiKey = apiKey;
  }

  // Generate image using Runware API
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    try {
      const response = await axios.post(`${this.baseUrl}/image/generate`, {
        prompt: request.prompt,
        width: request.width || 1024,
        height: request.height || 1024,
        steps: request.steps || 30,
        seed: request.seed || Math.floor(Math.random() * 1000000),
        model: request.model || 'stable-diffusion-xl'
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const imageUrl = response.data.image_url;
      
      // Download and save locally
      const localPath = await this.downloadImage(imageUrl, request.prompt);

      return {
        url: imageUrl,
        localPath: localPath,
        prompt: request.prompt
      };
    } catch (error) {
      console.error('Runware image generation error:', error);
      throw error;
    }
  }

  // Download image to local storage
  private async downloadImage(url: string, prompt: string): Promise<string> {
    try {
      const response = await axios.get(url, { responseType: 'stream' });
      
      // Create .tmp directory if it doesn't exist
      const tmpDir = path.resolve(__dirname, '../../.tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // Generate filename from prompt
      const filename = prompt
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 50) + '_' + Date.now() + '.png';
      
      const localPath = path.join(tmpDir, filename);
      const writer = fs.createWriteStream(localPath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(localPath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Image download error:', error);
      throw error;
    }
  }
}

// Alternative: OpenAI DALL-E integration
export class OpenAIImageGenerator {
  private client: any;

  constructor() {
    const OpenAI = require('openai');
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateImage(prompt: string, size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024'): Promise<GeneratedImage> {
    try {
      const response = await this.client.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: size,
        quality: "standard"
      });

      const imageUrl = response.data[0].url;
      const localPath = await this.downloadImage(imageUrl, prompt);

      return {
        url: imageUrl,
        localPath: localPath,
        prompt: prompt
      };
    } catch (error) {
      console.error('OpenAI image generation error:', error);
      throw error;
    }
  }

  private async downloadImage(url: string, prompt: string): Promise<string> {
    try {
      const response = await axios.get(url, { responseType: 'stream' });
      
      const tmpDir = path.resolve(__dirname, '../../.tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const filename = prompt
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 50) + '_' + Date.now() + '.png';
      
      const localPath = path.join(tmpDir, filename);
      const writer = fs.createWriteStream(localPath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(localPath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Image download error:', error);
      throw error;
    }
  }
}

// Utility function to compress images to WebP
export async function compressToWebP(inputPath: string): Promise<string> {
  // This would require sharp or similar library
  // For now, return the original path
  // TODO: Implement WebP compression
  return inputPath;
}

// Generate images for article
export async function generateArticleImages(
  prompts: string[],
  generator: 'runware' | 'openai' = 'runware'
): Promise<GeneratedImage[]> {
  const images: GeneratedImage[] = [];
  
  if (generator === 'runware') {
    const runware = new RunwareImageGenerator();
    
    for (const prompt of prompts) {
      try {
        const image = await runware.generateImage({
          prompt: `${prompt}, professional, high quality, 16:9 aspect ratio, cinematic lighting`,
          width: 1024,
          height: 576
        });
        images.push(image);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to generate image for prompt: ${prompt}`, error);
      }
    }
  } else {
    const openai = new OpenAIImageGenerator();
    
    for (const prompt of prompts) {
      try {
        const image = await openai.generateImage(
          `${prompt}, professional, high quality, cinematic lighting`,
          '1792x1024'
        );
        images.push(image);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to generate image for prompt: ${prompt}`, error);
      }
    }
  }

  return images;
}