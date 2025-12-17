
import { multimediaWorkflow } from './multimedia_workflow';
import { runMinimax } from '../execution/llm_minimax';
import { db } from '../execution/db_client';
import { generateArticleImages } from '../execution/image_generator';
import { searchWithExa } from '../execution/search_exa';
import { deployArticle } from '../execution/wp_deployer';

// Mock dependencies
jest.mock('../execution/llm_minimax');
jest.mock('../execution/db_client', () => ({
  db: {
    query: jest.fn(),
    queryOne: jest.fn(),
  }
}));
jest.mock('../execution/image_generator');
jest.mock('../execution/search_exa');
jest.mock('../execution/wp_deployer');

describe('Multimedia Workflow', () => {
  const mockTenantId = 1;
  const mockQueueId = 123;
  const mockContent = '<h1>Test Article</h1><p>Content...</p>';
  const mockOutline = { title: 'Test', sections: [] };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    (db.query as jest.Mock).mockResolvedValue([]);
    (db.queryOne as jest.Mock).mockResolvedValue({
      wp_credentials: '{"url":"https://example.com"}',
      business_name: 'TestBiz'
    });
    
    (runMinimax as jest.Mock).mockImplementation((promptFile) => {
      if (promptFile.includes('06_canvas')) return JSON.stringify({ image_prompts: [{ prompt: 'A nice image' }] });
      if (promptFile.includes('07_lens')) return JSON.stringify({ recommended_videos: [] });
      if (promptFile.includes('08_mosaic')) return JSON.stringify({ html_content: '<html>...</html>' });
      return '{}';
    });

    (generateArticleImages as jest.Mock).mockResolvedValue([{ url: 'http://img.url/1.jpg', localPath: '/tmp/1.jpg' }]);
    (searchWithExa as jest.Mock).mockResolvedValue({ results: [] });
    (deployArticle as jest.Mock).mockResolvedValue({ success: true, postUrl: 'https://example.com/post/1' });
  });

  test('should execute full multimedia workflow successfully', async () => {
    const result = await multimediaWorkflow.execute({
      tenantId: mockTenantId,
      queueId: mockQueueId,
      finalContent: mockContent,
      contentOutline: mockOutline
    });

    expect(result.success).toBe(true);
    expect(result.stepResults?.canvas.success).toBe(true);
    expect(result.stepResults?.pixel.success).toBe(true);
    expect(result.stepResults?.deployer.success).toBe(true);
    
    // Verify image generation was called
    expect(generateArticleImages).toHaveBeenCalled();

    // Verify deployment was called
    expect(deployArticle).toHaveBeenCalled();
  });

  test('should handle deployment failure gracefully', async () => {
    (deployArticle as jest.Mock).mockResolvedValue({ success: false, error: 'WP Error' });

    const result = await multimediaWorkflow.execute({
      tenantId: mockTenantId,
      queueId: mockQueueId,
      finalContent: mockContent,
      contentOutline: mockOutline
    });

    // The workflow itself might fail or succeed depending on logic, 
    // but in this case deployer step fails, so workflow should fail.
    expect(result.success).toBe(false);
    expect(result.lastStep).toBe('deployer');
    expect(result.error).toContain('WP Error');
  });
});
