import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface FirecrawlScrapeResult {
  success: boolean;
  data?: {
    markdown: string;
    html: string;
    metadata: {
      title: string;
      description?: string;
      keywords?: string;
      robots?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
    };
  };
  error?: string;
}

interface FirecrawlCrawlResult {
  success: boolean;
  jobId?: string;
  data?: Array<{
    markdown: string;
    html: string;
    url: string;
    metadata: any;
  }>;
  error?: string;
}

// Firecrawl client for web scraping and crawling
export class FirecrawlClient {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/v0';

  constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY not found in environment variables');
    }
    this.apiKey = apiKey;
  }

  // Scrape a single URL
  async scrapeUrl(url: string, options: {
    formats?: string[];
    includeTags?: string[];
    excludeTags?: string[];
    onlyMainContent?: boolean;
  } = {}): Promise<FirecrawlScrapeResult> {
    const {
      formats = ['markdown', 'html'],
      includeTags = [],
      excludeTags = ['nav', 'footer', 'aside'],
      onlyMainContent = true
    } = options;

    try {
      const response = await axios.post(`${this.baseUrl}/scrape`, {
        url: url,
        formats: formats,
        includeTags: includeTags,
        excludeTags: excludeTags,
        onlyMainContent: onlyMainContent
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Firecrawl scrape error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Crawl multiple pages from a domain
  async crawlSite(url: string, options: {
    crawlerOptions?: {
      includes?: string[];
      excludes?: string[];
      maxDepth?: number;
      limit?: number;
    };
    pageOptions?: {
      onlyMainContent?: boolean;
      formats?: string[];
    };
  } = {}): Promise<FirecrawlCrawlResult> {
    const {
      crawlerOptions = {
        maxDepth: 2,
        limit: 10
      },
      pageOptions = {
        onlyMainContent: true,
        formats: ['markdown']
      }
    } = options;

    try {
      const response = await axios.post(`${this.baseUrl}/crawl`, {
        url: url,
        crawlerOptions: crawlerOptions,
        pageOptions: pageOptions
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Firecrawl crawl error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get crawl job status
  async getCrawlStatus(jobId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/crawl/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Firecrawl status error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firecrawl = new FirecrawlClient();

// Utility function to scrape competitor articles
export async function scrapeCompetitorArticles(urls: string[]): Promise<any[]> {
  const results = [];
  
  for (const url of urls) {
    try {
      console.log(`[Firecrawl] Scraping: ${url}`);
      
      const result = await firecrawl.scrapeUrl(url, {
        formats: ['markdown'],
        onlyMainContent: true,
        excludeTags: ['nav', 'footer', 'aside', 'header', 'script', 'style']
      });

      if (result.success && result.data) {
        results.push({
          url: url,
          title: result.data.metadata.title,
          content: result.data.markdown,
          wordCount: result.data.markdown.split(' ').length,
          metadata: result.data.metadata
        });
      } else {
        console.warn(`Failed to scrape ${url}: ${result.error}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }
  }

  return results;
}