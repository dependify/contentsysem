import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
}

// Deterministic search wrapper for Tavily AI
export async function performDeepSearch(queries: string[]): Promise<any[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY not found in environment variables');
  }

  const results = [];
  
  for (const query of queries) {
    try {
      console.log(`[Tavily] Searching: ${query}`);
      
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: apiKey,
        query: query,
        search_depth: "advanced",
        include_raw_content: true,
        max_results: 5,
        include_domains: [],
        exclude_domains: ["pinterest.com", "facebook.com", "twitter.com"]
      });

      results.push({
        query: query,
        data: response.data
      });

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Tavily search error for query "${query}":`, error);
      results.push({
        query: query,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      });
    }
  }

  // Save intermediate results for debugging
  const tmpDir = path.resolve(__dirname, '../../.tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(tmpDir, 'search_results.json'), 
    JSON.stringify(results, null, 2)
  );

  return results;
}

// Competitive analysis - scrape top ranking articles
export async function analyzeCompetitors(keyword: string, topN = 3): Promise<any[]> {
  const searchQuery = `"${keyword}" site:*.com OR site:*.org`;
  
  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query: searchQuery,
      search_depth: "advanced",
      include_raw_content: true,
      max_results: topN
    });

    const competitors = response.data.results.map((result: TavilySearchResult) => ({
      title: result.title,
      url: result.url,
      content_length: result.content.length,
      content_preview: result.content.substring(0, 500),
      score: result.score,
      published_date: result.published_date
    }));

    return competitors;
  } catch (error) {
    console.error('Competitor analysis error:', error);
    return [];
  }
}

// Find statistical data for visualization
export async function findStatistics(topic: string): Promise<any> {
  const statsQueries = [
    `${topic} statistics 2024`,
    `${topic} market data trends`,
    `${topic} research study findings`
  ];

  const results = await performDeepSearch(statsQueries);
  
  // Filter for content that likely contains statistics
  const statsContent = results
    .filter(r => r.data && r.data.results)
    .flatMap(r => r.data.results)
    .filter((result: TavilySearchResult) => {
      const content = result.content.toLowerCase();
      return content.includes('%') || 
             content.includes('percent') || 
             content.includes('statistics') ||
             content.includes('study') ||
             content.includes('research');
    });

  return {
    topic: topic,
    statistical_sources: statsContent.slice(0, 3) // Top 3 statistical sources
  };
}