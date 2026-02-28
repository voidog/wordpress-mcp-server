import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockMcpServer } from '../helpers/mock-server.js';
import { WordPressClient } from '../../src/client.js';
import { registerPageTools } from '../../src/tools/pages.js';

describe('Page Tools', () => {
  let server: MockMcpServer;
  let client: WordPressClient;

  beforeEach(() => {
    server = new MockMcpServer();
    client = new WordPressClient('https://wp.test', 'key');
    vi.spyOn(client, 'get').mockResolvedValue({ pages: [] });
    vi.spyOn(client, 'post').mockResolvedValue({ id: 1 });
    vi.spyOn(client, 'put').mockResolvedValue({ id: 1 });
    vi.spyOn(client, 'delete').mockResolvedValue({ deleted: true });

    registerPageTools(server as any, client);
  });

  // --------------- Registration ---------------

  it('registers all 5 page tools', () => {
    expect(server.tools.size).toBe(5);
    expect(server.tools.has('wp_list_pages')).toBe(true);
    expect(server.tools.has('wp_get_page')).toBe(true);
    expect(server.tools.has('wp_create_page')).toBe(true);
    expect(server.tools.has('wp_update_page')).toBe(true);
    expect(server.tools.has('wp_delete_page')).toBe(true);
  });

  // --------------- wp_list_pages ---------------

  describe('wp_list_pages', () => {
    it('calls client.get with default params', async () => {
      const handler = server.getToolHandler('wp_list_pages')!;
      await handler({
        per_page: 10,
        page: 1,
        status: 'any',
        orderby: 'date',
        order: 'DESC',
      });
      expect(client.get).toHaveBeenCalledWith('/pages', {
        per_page: 10,
        page: 1,
        status: 'any',
        orderby: 'date',
        order: 'DESC',
      });
    });

    it('includes search param when provided', async () => {
      const handler = server.getToolHandler('wp_list_pages')!;
      await handler({
        per_page: 10,
        page: 1,
        status: 'any',
        search: 'about',
        orderby: 'date',
        order: 'DESC',
      });
      expect(client.get).toHaveBeenCalledWith('/pages', expect.objectContaining({
        search: 'about',
      }));
    });

    it('includes parent param when provided', async () => {
      const handler = server.getToolHandler('wp_list_pages')!;
      await handler({
        per_page: 10,
        page: 1,
        status: 'any',
        parent: 5,
        orderby: 'date',
        order: 'DESC',
      });
      expect(client.get).toHaveBeenCalledWith('/pages', expect.objectContaining({
        parent: 5,
      }));
    });

    it('returns JSON text content with correct structure', async () => {
      vi.spyOn(client, 'get').mockResolvedValueOnce([{ id: 1, title: 'Home' }]);
      const handler = server.getToolHandler('wp_list_pages')!;
      const result = await handler({
        per_page: 10,
        page: 1,
        status: 'any',
        orderby: 'date',
        order: 'DESC',
      });
      expect(result.content[0].type).toBe('text');
      expect(result.content).toEqual([
        { type: 'text', text: JSON.stringify([{ id: 1, title: 'Home' }], null, 2) },
      ]);
      expect(JSON.parse(result.content[0].text)).toEqual([{ id: 1, title: 'Home' }]);
    });

    it('propagates client.get errors', async () => {
      vi.spyOn(client, 'get').mockRejectedValueOnce(new Error('Network failure'));
      const handler = server.getToolHandler('wp_list_pages')!;
      await expect(
        handler({ per_page: 10, page: 1, status: 'any', orderby: 'date', order: 'DESC' }),
      ).rejects.toThrow('Network failure');
    });
  });

  // --------------- wp_list_pages schema validation ---------------

  describe('wp_list_pages schema validation', () => {
    it('rejects per_page below min (0)', async () => {
      await expect(server.invokeHandler('wp_list_pages', { per_page: 0 })).rejects.toThrow();
    });

    it('rejects per_page above max (101)', async () => {
      await expect(server.invokeHandler('wp_list_pages', { per_page: 101 })).rejects.toThrow();
    });

    it('accepts per_page at min boundary (1)', async () => {
      const result = await server.invokeHandler('wp_list_pages', { per_page: 1 });
      expect(result.content[0].type).toBe('text');
    });

    it('accepts per_page at max boundary (100)', async () => {
      const result = await server.invokeHandler('wp_list_pages', { per_page: 100 });
      expect(result.content[0].type).toBe('text');
    });

    it('rejects page below min (0)', async () => {
      await expect(server.invokeHandler('wp_list_pages', { page: 0 })).rejects.toThrow();
    });

    it('rejects invalid order value', async () => {
      await expect(server.invokeHandler('wp_list_pages', { order: 'invalid' })).rejects.toThrow();
    });

    it('accepts order ASC', async () => {
      const result = await server.invokeHandler('wp_list_pages', { order: 'ASC' });
      expect(result.content[0].type).toBe('text');
    });

    it('applies defaults for per_page, page, status, orderby, order', async () => {
      await server.invokeHandler('wp_list_pages', {});
      expect(client.get).toHaveBeenCalledWith('/pages', expect.objectContaining({
        per_page: 10,
        page: 1,
        status: 'any',
        orderby: 'date',
        order: 'DESC',
      }));
    });

    it('passes parent field through validation', async () => {
      await server.invokeHandler('wp_list_pages', { parent: 5 });
      expect(client.get).toHaveBeenCalledWith('/pages', expect.objectContaining({
        parent: 5,
      }));
    });
  });

  // --------------- wp_get_page ---------------

  describe('wp_get_page', () => {
    it('calls client.get with correct path', async () => {
      const handler = server.getToolHandler('wp_get_page')!;
      await handler({ id: 10 });
      expect(client.get).toHaveBeenCalledWith('/pages/10');
    });

    it('returns page data as JSON with correct structure', async () => {
      vi.spyOn(client, 'get').mockResolvedValueOnce({ id: 10, title: 'About' });
      const handler = server.getToolHandler('wp_get_page')!;
      const result = await handler({ id: 10 });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('"id": 10');
      expect(JSON.parse(result.content[0].text)).toHaveProperty('id', 10);
    });
  });

  // --------------- wp_create_page ---------------

  describe('wp_create_page', () => {
    it('sends required fields to client.post', async () => {
      const handler = server.getToolHandler('wp_create_page')!;
      await handler({ title: 'New Page', status: 'draft' });
      expect(client.post).toHaveBeenCalledWith('/pages', {
        title: 'New Page',
        status: 'draft',
      });
    });

    it('includes optional fields when provided', async () => {
      const handler = server.getToolHandler('wp_create_page')!;
      await handler({
        title: 'Child Page',
        status: 'publish',
        content: '<p>Content</p>',
        excerpt: 'Summary',
        slug: 'child-page',
        parent: 5,
        featured_media: 10,
      });
      expect(client.post).toHaveBeenCalledWith('/pages', {
        title: 'Child Page',
        status: 'publish',
        content: '<p>Content</p>',
        excerpt: 'Summary',
        slug: 'child-page',
        parent: 5,
        featured_media: 10,
      });
    });

    it('omits optional fields when not provided', async () => {
      const handler = server.getToolHandler('wp_create_page')!;
      await handler({ title: 'Minimal', status: 'draft' });
      const body = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(body).not.toHaveProperty('content');
      expect(body).not.toHaveProperty('excerpt');
      expect(body).not.toHaveProperty('slug');
      expect(body).not.toHaveProperty('parent');
      expect(body).not.toHaveProperty('featured_media');
    });
  });

  // --------------- wp_update_page ---------------

  describe('wp_update_page', () => {
    it('calls client.put with correct path and body', async () => {
      const handler = server.getToolHandler('wp_update_page')!;
      await handler({ id: 10, title: 'Updated Page' });
      expect(client.put).toHaveBeenCalledWith('/pages/10', { title: 'Updated Page' });
    });

    it('excludes id from the body', async () => {
      const handler = server.getToolHandler('wp_update_page')!;
      await handler({ id: 10, title: 'Updated' });
      const body = (client.put as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(body).not.toHaveProperty('id');
    });

    it('includes parent in update body', async () => {
      const handler = server.getToolHandler('wp_update_page')!;
      await handler({ id: 10, parent: 5 });
      expect(client.put).toHaveBeenCalledWith('/pages/10', { parent: 5 });
    });

    it('sends empty body when only id provided', async () => {
      const handler = server.getToolHandler('wp_update_page')!;
      await handler({ id: 10 });
      expect(client.put).toHaveBeenCalledWith('/pages/10', {});
    });
  });

  // --------------- wp_delete_page ---------------

  describe('wp_delete_page', () => {
    it('calls client.delete with correct path', async () => {
      const handler = server.getToolHandler('wp_delete_page')!;
      await handler({ id: 10 });
      expect(client.delete).toHaveBeenCalledWith('/pages/10');
    });

    it('returns deletion result as JSON with correct structure', async () => {
      vi.spyOn(client, 'delete').mockResolvedValueOnce({ deleted: true, id: 10 });
      const handler = server.getToolHandler('wp_delete_page')!;
      const result = await handler({ id: 10 });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('"deleted": true');
      expect(JSON.parse(result.content[0].text)).toHaveProperty('deleted', true);
    });
  });
});
