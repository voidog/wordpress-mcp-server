import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockMcpServer } from '../helpers/mock-server.js';
import { WordPressClient } from '../../src/client.js';
import { registerSiteTools } from '../../src/tools/site.js';

describe('Site Tools', () => {
  let server: MockMcpServer;
  let client: WordPressClient;

  beforeEach(() => {
    server = new MockMcpServer();
    client = new WordPressClient('https://wp.test', 'key');
    vi.spyOn(client, 'get').mockResolvedValue({ name: 'Test Site' });

    registerSiteTools(server as any, client);
  });

  it('registers wp_get_site_info tool', () => {
    expect(server.tools.has('wp_get_site_info')).toBe(true);
  });

  it('calls client.get with /site', async () => {
    const handler = server.getToolHandler('wp_get_site_info')!;
    await handler();
    expect(client.get).toHaveBeenCalledWith('/site');
  });

  it('returns site data as JSON text content with correct structure', async () => {
    const siteData = { name: 'My WP', url: 'https://wp.test' };
    vi.spyOn(client, 'get').mockResolvedValueOnce(siteData);
    const handler = server.getToolHandler('wp_get_site_info')!;
    const result = await handler();
    expect(result.content[0].type).toBe('text');
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify(siteData, null, 2) },
    ]);
    expect(JSON.parse(result.content[0].text)).toEqual(siteData);
  });

  it('propagates client.get errors', async () => {
    vi.spyOn(client, 'get').mockRejectedValueOnce(new Error('Network failure'));
    const handler = server.getToolHandler('wp_get_site_info')!;
    await expect(handler()).rejects.toThrow('Network failure');
  });
});
