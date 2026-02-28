import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockMcpServer } from '../helpers/mock-server.js';
import { WordPressClient } from '../../src/client.js';
import { registerCategoryTools } from '../../src/tools/categories.js';

describe('Category Tools', () => {
  let server: MockMcpServer;
  let client: WordPressClient;

  beforeEach(() => {
    server = new MockMcpServer();
    client = new WordPressClient('https://wp.test', 'key');
    vi.spyOn(client, 'get').mockResolvedValue([]);
    vi.spyOn(client, 'post').mockResolvedValue({ id: 1 });

    registerCategoryTools(server as any, client);
  });

  it('registers 2 category tools', () => {
    expect(server.tools.size).toBe(2);
    expect(server.tools.has('wp_list_categories')).toBe(true);
    expect(server.tools.has('wp_create_category')).toBe(true);
  });

  // --------------- wp_list_categories ---------------

  describe('wp_list_categories', () => {
    it('calls client.get with default params', async () => {
      const handler = server.getToolHandler('wp_list_categories')!;
      await handler({
        per_page: 100,
        page: 1,
        hide_empty: false,
      });
      expect(client.get).toHaveBeenCalledWith('/categories', {
        per_page: 100,
        page: 1,
        hide_empty: false,
      });
    });

    it('includes search when provided', async () => {
      const handler = server.getToolHandler('wp_list_categories')!;
      await handler({
        per_page: 100,
        page: 1,
        hide_empty: false,
        search: 'news',
      });
      expect(client.get).toHaveBeenCalledWith('/categories', expect.objectContaining({
        search: 'news',
      }));
    });

    it('includes parent when provided', async () => {
      const handler = server.getToolHandler('wp_list_categories')!;
      await handler({
        per_page: 100,
        page: 1,
        hide_empty: false,
        parent: 3,
      });
      expect(client.get).toHaveBeenCalledWith('/categories', expect.objectContaining({
        parent: 3,
      }));
    });

    it('returns JSON text content with correct structure', async () => {
      vi.spyOn(client, 'get').mockResolvedValueOnce([{ id: 1, name: 'News' }]);
      const handler = server.getToolHandler('wp_list_categories')!;
      const result = await handler({ per_page: 100, page: 1, hide_empty: false });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('"name": "News"');
      expect(JSON.parse(result.content[0].text)).toEqual([{ id: 1, name: 'News' }]);
    });

    it('propagates client.get errors', async () => {
      vi.spyOn(client, 'get').mockRejectedValueOnce(new Error('Network failure'));
      const handler = server.getToolHandler('wp_list_categories')!;
      await expect(
        handler({ per_page: 100, page: 1, hide_empty: false }),
      ).rejects.toThrow('Network failure');
    });
  });

  // --------------- wp_list_categories schema validation ---------------

  describe('wp_list_categories schema validation', () => {
    it('rejects per_page below min (0)', async () => {
      await expect(server.invokeHandler('wp_list_categories', { per_page: 0 })).rejects.toThrow();
    });

    it('rejects per_page above max (101)', async () => {
      await expect(server.invokeHandler('wp_list_categories', { per_page: 101 })).rejects.toThrow();
    });

    it('accepts per_page at min boundary (1)', async () => {
      const result = await server.invokeHandler('wp_list_categories', { per_page: 1 });
      expect(result.content[0].type).toBe('text');
    });

    it('accepts per_page at max boundary (100)', async () => {
      const result = await server.invokeHandler('wp_list_categories', { per_page: 100 });
      expect(result.content[0].type).toBe('text');
    });

    it('rejects page below min (0)', async () => {
      await expect(server.invokeHandler('wp_list_categories', { page: 0 })).rejects.toThrow();
    });

    it('defaults hide_empty to false', async () => {
      await server.invokeHandler('wp_list_categories', {});
      expect(client.get).toHaveBeenCalledWith('/categories', expect.objectContaining({
        hide_empty: false,
      }));
    });

    it('applies defaults for per_page and page', async () => {
      await server.invokeHandler('wp_list_categories', {});
      expect(client.get).toHaveBeenCalledWith('/categories', expect.objectContaining({
        per_page: 100,
        page: 1,
      }));
    });
  });

  // --------------- wp_create_category ---------------

  describe('wp_create_category', () => {
    it('sends required name field', async () => {
      const handler = server.getToolHandler('wp_create_category')!;
      await handler({ name: 'Tech' });
      expect(client.post).toHaveBeenCalledWith('/categories', { name: 'Tech' });
    });

    it('includes optional slug', async () => {
      const handler = server.getToolHandler('wp_create_category')!;
      await handler({ name: 'Tech', slug: 'tech' });
      expect(client.post).toHaveBeenCalledWith('/categories', {
        name: 'Tech',
        slug: 'tech',
      });
    });

    it('includes optional description', async () => {
      const handler = server.getToolHandler('wp_create_category')!;
      await handler({ name: 'Tech', description: 'Technology posts' });
      expect(client.post).toHaveBeenCalledWith('/categories', {
        name: 'Tech',
        description: 'Technology posts',
      });
    });

    it('includes optional parent', async () => {
      const handler = server.getToolHandler('wp_create_category')!;
      await handler({ name: 'Frontend', parent: 5 });
      expect(client.post).toHaveBeenCalledWith('/categories', {
        name: 'Frontend',
        parent: 5,
      });
    });
  });
});
