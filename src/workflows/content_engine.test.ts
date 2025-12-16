
import { contentWorkflow } from './content_engine';
import { runMinimax } from '../execution/llm_minimax';
import { db } from '../execution/db_client';
import * as searchTavily from '../execution/search_tavily';
import { searchWithExa } from '../execution/search_exa';

// Mock dependencies
jest.mock('../execution/llm_minimax');
jest.mock('../execution/db_client', () => ({
  db: {
    query: jest.fn(),
    queryOne: jest.fn(),
  }
}));
jest.mock('../execution/search_tavily');
jest.mock('../execution/search_exa');

describe('Content Workflow', () => {
  const mockTenantId = 1;
  const mockQueueId = 123;
  const mockTitle = 'Test Article';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (db.query as jest.Mock).mockResolvedValue([]);
    (db.queryOne as jest.Mock).mockResolvedValue({
      business_name: 'TestBiz',
      icp_profile: '{}',
      brand_voice: 'Professional'
    });

    (runMinimax as jest.Mock).mockImplementation((promptFile) => {
      if (promptFile.includes('01_nexus')) return JSON.stringify({ research_questions: ['Q1'] });
      if (promptFile.includes('02_vantage')) return JSON.stringify({ summary: 'Research done' });
      if (promptFile.includes('03_vertex')) return JSON.stringify({ outline: ['Section 1'] });
      if (promptFile.includes('04_hemingway')) return 'Draft content';
      if (promptFile.includes('05_prism')) return JSON.stringify({ overall_score: 90 });
      return '{}';
    });

    (searchTavily.performDeepSearch as jest.Mock).mockResolvedValue([]);
    (searchTavily.analyzeCompetitors as jest.Mock).mockResolvedValue([]);
    (searchTavily.findStatistics as jest.Mock).mockResolvedValue({ statistical_sources: [] });
    (searchWithExa as jest.Mock).mockResolvedValue({ results: [] });
  });

  test('should execute full workflow successfully', async () => {
    const result = await contentWorkflow.execute({
      tenantId: mockTenantId,
      title: mockTitle,
      queueId: mockQueueId
    });

    expect(result.success).toBe(true);
    expect(result.stepResults?.nexus.success).toBe(true);
    expect(result.stepResults?.vantage.success).toBe(true);
    expect(result.stepResults?.vertex.success).toBe(true);
    expect(result.stepResults?.hemingway.success).toBe(true);
    expect(result.stepResults?.prism.success).toBe(true);

    // Verify DB updates
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE content_queue'),
      expect.any(Array)
    );
  });

  test('should handle Nexus failure', async () => {
    (runMinimax as jest.Mock).mockImplementation((promptFile) => {
        if (promptFile.includes('01_nexus')) throw new Error('LLM Error');
        return '{}';
    });

    const result = await contentWorkflow.execute({
      tenantId: mockTenantId,
      title: mockTitle,
      queueId: mockQueueId
    });

    expect(result.success).toBe(false);
    expect(result.lastStep).toBe('nexus');
    expect(result.error).toContain('LLM Error');
  });
});
