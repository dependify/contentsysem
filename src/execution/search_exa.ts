import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface ExaSearchResult {
  id: string;
  url: string;
  title: string;
  score: number;
  publishedDate?: string;
  author?: string;
  text?: string;
}

interface ExaResponse {
  results: ExaSearchResult[];
  autopromptString?: string;
}

// Exa.ai search wrapper for high-quality content discovery
export async function searchWithExa(
  query: string, 
  options: {
    numResults?: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    startPublishedDate?: string;
    useAutoprompt?: boolean;
    type?: 'neural' | 'keyword';
  } = {}
): Promise<ExaResponse> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA_API_KEY not found in environment variables');
  }

  const {
    numResults = 10,
    includeDomains = [],
    excludeDomains = ['pinterest.com', 'facebook.com', 'twitter.com'],
    startPublishedDate,
    useAutoprompt = true,
    type = 'neural'
  } = options;

  try {
    const response = await axios.post('https://api.exa.ai/search', {
      query: query,
      numResults: numResults,
      includeDomains: includeDomains,
      excludeDomains: excludeDomains,
      startPublishedDate: startPublishedDate,
      useAutoprompt: useAutoprompt,
      type: type,
      contents: {
        text: true
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Exa search error:', error);
    throw error;
  }
}

// Find similar content for competitive analysis
export async function findSimilarContent(url: string, numResults = 5): Promise<ExaResponse> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA_API_KEY not found in environment variables');
  }

  try {
    const response = await axios.post('https://api.exa.ai/findSimilar', {
      url: url,
      numResults: numResults,
      contents: {
        text: true
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Exa findSimilar error:', error);
    throw error;
  }
}

// Get content from URLs
export async function getContents(urls: string[]): Promise<any> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA_API_KEY not found in environment variables');
  }

  try {
    const response = await axios.post('https://api.exa.ai/contents', {
      ids: urls,
      text: true
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Exa getContents error:', error);
    throw error;
  }
}