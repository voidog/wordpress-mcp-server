import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockMcpServer } from '../helpers/mock-server.js';
import { WordPressClient } from '../../src/client.js';
import { registerTagTools } from '../../src/tools/tags.js';

describe('Tag Tools', () => {
  let server: MockMcpServer;
  let client: WordPressClient;

  beforeEach(() => {
    server = new MockMcpServer();
    client = new WordPressClient('https://wp.test', 'key');
    vi.spyOn(client, 'get').mockResolvedValue([]);
    vi.spyOn(client, 'post').mockResolvedValue({ id: 1 });

    registerTagTools(server as any, client);
  });

  it('registers 2 tag tools', () => {
    expect(server.tools.size).toBe(2);
    expect(server.tools.has('wp_list_tags')).toBe(true);
    expect(server.tools.has('wp_create_tag')).toBe(true);
  });

  // --------------- wp_list_tags ---------------

  describe('wp_list_tags', () => {
    it('calls client.get with default params', async () => {
      const handler = server.getToolHandler('wp_list_tags')!;
      await handler({
        per_page: 100,
        page: 1,
        hide_empty: false,
      });
      expect(client.get).toHaveBeenCalledWith('/tags', {
        per_page: 100,
        page: 1,
        hide_empty: false,
      });
    });

    it('includes search when provided', async () => {
      const handler = server.getToolHandler('wp_list_tags')!;
      await handler({
        per_page: 100,
        page: 1,
        hide_empty: false,
        search: 'javascript',
      });
      expect(client.get).toHaveBeenCalledWith('/tags', expect.objectContaining({
        search: 'javascript',
      }));
    });

    it('returns JSON text content with correct structure', async () => {
      vi.spyOn(client, 'get').mockResolvedValueOnce([{ id: 1, name: 'js' }]);
      const handler = server.getToolHandler('wp_list_tags')!;
      const result = await handler({ per_page: 100, page: 1, hide_empty: false });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('"name": "js"');
      expect(JSON.parse(result.content[0].text)).toEqual([{ id: 1, name: 'js' }]);
    });

    it('propagates client.get errors', async () => {
      vi.spyOn(client, 'get').mockRejectedValueOnce(new Error('Network failure'));
      const handler = server.getToolHandler('wp_list_tags')!;
      await expect(
        handler({ per_page: 100, page: 1, hide_empty: false }),
      ).rejects.toThrow('Network failure');
    });
  });

  // --------------- wp_list_tags schema validation ---------------

  describe('wp_list_tags schema validation', () => {
    it('rejects per_page below min (0)', async () => {
      await expect(server.invokeHandler('wp_list_tags', { per_page: 0 })).rejects.toThrow();
    });

    it('rejects per_page above max (101)', async () => {
      await expect(server.invokeHandler('wp_list_tags', { per_page: 101 })).rejects.toThrow();
    });

    it('accepts per_page at min boundary (1)', async () => {
      const result = await server.invokeHandler('wp_list_tags', { per_page: 1 });
      expect(result.content[0].type).toBe('text');
    });

    it('accepts per_page at max boundary (100)', async () => {
      const result = await server.invokeHandler('wp_list_tags', { per_page: 100 });
      expect(result.content[0].type).toBe('text');
    });

    it('rejects page below min (0)', async () => {
      await expect(server.invokeHandler('wp_list_tags', { page: 0 })).rejects.toThrow();
    });

    it('defaults hide_empty to false', async () => {
      await server.invokeHandler('wp_list_tags', {});
      expect(client.get).toHaveBeenCalledWith('/tags', expect.objectContaining({
        hide_empty: false,
      }));
    });

    it('applies defaults for per_page and page', async () => {
      await server.invokeHandler('wp_list_tags', {});
      expect(client.get).toHaveBeenCalledWith('/tags', expect.objectContaining({
        per_page: 100,
        page: 1,
      }));
    });
  });

  // --------------- wp_create_tag ---------------

  describe('wp_create_tag', () => {
    it('sends required name field', async () => {
      const handler = server.getToolHandler('wp_create_tag')!;
      await handler({ name: 'TypeScript' });
      expect(client.post).toHaveBeenCalledWith('/tags', { name: 'TypeScript' });
    });

    it('includes optional slug', async () => {
      const handler = server.getToolHandler('wp_create_tag')!;
      await handler({ name: 'TypeScript', slug: 'typescript' });
      expect(client.post).toHaveBeenCalledWith('/tags', {
        name: 'TypeScript',
        slug: 'typescript',
      });
    });

    it('includes optional description', async () => {
      const handler = server.getToolHandler('wp_create_tag')!;
      await handler({ name: 'TypeScript', description: 'TS related posts' });
      expect(client.post).toHaveBeenCalledWith('/tags', {
        name: 'TypeScript',
        description: 'TS related posts',
      });
    });
  });
});
