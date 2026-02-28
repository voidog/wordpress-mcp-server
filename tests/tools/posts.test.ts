import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockMcpServer } from '../helpers/mock-server.js';
import { WordPressClient } from '../../src/client.js';
import { registerPostTools } from '../../src/tools/posts.js';

describe('Post Tools', () => {
  let server: MockMcpServer;
  let client: WordPressClient;

  beforeEach(() => {
    server = new MockMcpServer();
    client = new WordPressClient('https://wp.test', 'key');
    // Mock all client methods
    vi.spyOn(client, 'get').mockResolvedValue({ posts: [] });
    vi.spyOn(client, 'post').mockResolvedValue({ id: 1 });
    vi.spyOn(client, 'put').mockResolvedValue({ id: 1 });
    vi.spyOn(client, 'delete').mockResolvedValue({ deleted: true });

    registerPostTools(server as any, client);
  });

  // --------------- Registration ---------------

  it('registers all 5 post tools', () => {
    expect(server.tools.size).toBe(5);
    expect(server.tools.has('wp_list_posts')).toBe(true);
    expect(server.tools.has('wp_get_post')).toBe(true);
    expect(server.tools.has('wp_create_post')).toBe(true);
    expect(server.tools.has('wp_update_post')).toBe(true);
    expect(server.tools.has('wp_delete_post')).toBe(true);
  });

  // --------------- wp_list_posts ---------------

  describe('wp_list_posts', () => {
    it('calls client.get with default params', async () => {
      const handler = server.getToolHandler('wp_list_posts')!;
      await handler({
        per_page: 10,
        page: 1,
        status: 'any',
        orderby: 'date',
        order: 'DESC',
      });
      expect(client.get).toHaveBeenCalledWith('/posts', {
        per_page: 10,
        page: 1,
        status: 'any',
        orderby: 'date',
        order: 'DESC',
      });
    });

    it('includes search param when provided', async () => {
      const handler = server.getToolHandler('wp_list_posts')!;
      await handler({
        per_page: 10,
        page: 1,
        status: 'any',
        search: 'hello',
        orderby: 'date',
        order: 'DESC',
      });
      expect(client.get).toHaveBeenCalledWith('/posts', expect.objectContaining({
        search: 'hello',
      }));
    });

    it('includes category param when provided', async () => {
      const handler = server.getToolHandler('wp_list_posts')!;
      await handler({
        per_page: 10,
        page: 1,
        status: 'any',
        category: 5,
        orderby: 'date',
        order: 'DESC',
      });
      expect(client.get).toHaveBeenCalledWith('/posts', expect.objectContaining({
        category: 5,
      }));
    });

    it('includes tag param when provided', async () => {
      const handler = server.getToolHandler('wp_list_posts')!;
      await handler({
        per_page: 10,
        page: 1,
        status: 'any',
        tag: 3,
        orderby: 'date',
        order: 'DESC',
      });
      expect(client.get).toHaveBeenCalledWith('/posts', expect.objectContaining({
        tag: 3,
      }));
    });

    it('returns JSON text content with correct structure', async () => {
      vi.spyOn(client, 'get').mockResolvedValueOnce([{ id: 1, title: 'Post' }]);
      const handler = server.getToolHandler('wp_list_posts')!;
      const result = await handler({
        per_page: 10,
        page: 1,
        status: 'any',
        orderby: 'date',
        order: 'DESC',
      });
      expect(result.content[0].type).toBe('text');
      expect(result.content).toEqual([
        { type: 'text', text: JSON.stringify([{ id: 1, title: 'Post' }], null, 2) },
      ]);
      expect(JSON.parse(result.content[0].text)).toEqual([{ id: 1, title: 'Post' }]);
    });

    it('propagates client.get errors', async () => {
      vi.spyOn(client, 'get').mockRejectedValueOnce(new Error('Network failure'));
      const handler = server.getToolHandler('wp_list_posts')!;
      await expect(
        handler({ per_page: 10, page: 1, status: 'any', orderby: 'date', order: 'DESC' }),
      ).rejects.toThrow('Network failure');
    });
  });

  // --------------- wp_list_posts schema validation ---------------

  describe('wp_list_posts schema validation', () => {
    it('rejects per_page below min (0)', async () => {
      await expect(server.invokeHandler('wp_list_posts', { per_page: 0 })).rejects.toThrow();
    });

    it('rejects per_page above max (101)', async () => {
      await expect(server.invokeHandler('wp_list_posts', { per_page: 101 })).rejects.toThrow();
    });

    it('accepts per_page at min boundary (1)', async () => {
      const result = await server.invokeHandler('wp_list_posts', { per_page: 1 });
      expect(result.content[0].type).toBe('text');
    });

    it('accepts per_page at max boundary (100)', async () => {
      const result = await server.invokeHandler('wp_list_posts', { per_page: 100 });
      expect(result.content[0].type).toBe('text');
    });

    it('rejects page below min (0)', async () => {
      await expect(server.invokeHandler('wp_list_posts', { page: 0 })).rejects.toThrow();
    });

    it('rejects invalid order value', async () => {
      await expect(server.invokeHandler('wp_list_posts', { order: 'invalid' })).rejects.toThrow();
    });

    it('accepts order ASC', async () => {
      const result = await server.invokeHandler('wp_list_posts', { order: 'ASC' });
      expect(result.content[0].type).toBe('text');
    });

    it('accepts order DESC', async () => {
      const result = await server.invokeHandler('wp_list_posts', { order: 'DESC' });
      expect(result.content[0].type).toBe('text');
    });

    it('applies defaults for per_page, page, status, orderby, order', async () => {
      const result = await server.invokeHandler('wp_list_posts', {});
      expect(client.get).toHaveBeenCalledWith('/posts', expect.objectContaining({
        per_page: 10,
        page: 1,
        status: 'any',
        orderby: 'date',
        order: 'DESC',
      }));
      expect(result.content[0].type).toBe('text');
    });
  });

  // --------------- wp_create_post schema validation ---------------

  describe('wp_create_post schema validation', () => {
    it('rejects invalid status value', async () => {
      await expect(
        server.invokeHandler('wp_create_post', { title: 'Test', status: 'invalid' }),
      ).rejects.toThrow();
    });

    it('accepts all valid status values', async () => {
      for (const status of ['publish', 'draft', 'pending', 'private', 'future']) {
        const result = await server.invokeHandler('wp_create_post', { title: 'Test', status });
        expect(result.content[0].type).toBe('text');
      }
    });

    it('defaults status to draft', async () => {
      await server.invokeHandler('wp_create_post', { title: 'Test' });
      expect(client.post).toHaveBeenCalledWith('/posts', expect.objectContaining({
        status: 'draft',
      }));
    });
  });

  // --------------- wp_get_post ---------------

  describe('wp_get_post', () => {
    it('calls client.get with correct path', async () => {
      const handler = server.getToolHandler('wp_get_post')!;
      await handler({ id: 42 });
      expect(client.get).toHaveBeenCalledWith('/posts/42');
    });

    it('returns post data as JSON with correct structure', async () => {
      vi.spyOn(client, 'get').mockResolvedValueOnce({ id: 42, title: 'My Post' });
      const handler = server.getToolHandler('wp_get_post')!;
      const result = await handler({ id: 42 });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('"id": 42');
      expect(JSON.parse(result.content[0].text)).toHaveProperty('id', 42);
    });
  });

  // --------------- wp_create_post ---------------

  describe('wp_create_post', () => {
    it('sends required fields to client.post', async () => {
      const handler = server.getToolHandler('wp_create_post')!;
      await handler({ title: 'New Post', status: 'draft' });
      expect(client.post).toHaveBeenCalledWith('/posts', {
        title: 'New Post',
        status: 'draft',
      });
    });

    it('includes optional fields when provided', async () => {
      const handler = server.getToolHandler('wp_create_post')!;
      await handler({
        title: 'New Post',
        status: 'publish',
        content: '<p>Body</p>',
        excerpt: 'Summary',
        slug: 'new-post',
        categories: [1, 2],
        tags: [3],
        featured_media: 10,
      });
      expect(client.post).toHaveBeenCalledWith('/posts', {
        title: 'New Post',
        status: 'publish',
        content: '<p>Body</p>',
        excerpt: 'Summary',
        slug: 'new-post',
        categories: [1, 2],
        tags: [3],
        featured_media: 10,
      });
    });

    it('omits optional fields when not provided', async () => {
      const handler = server.getToolHandler('wp_create_post')!;
      await handler({ title: 'Minimal', status: 'draft' });
      const body = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(body).not.toHaveProperty('content');
      expect(body).not.toHaveProperty('excerpt');
      expect(body).not.toHaveProperty('slug');
      expect(body).not.toHaveProperty('categories');
      expect(body).not.toHaveProperty('tags');
      expect(body).not.toHaveProperty('featured_media');
    });
  });

  // --------------- wp_update_post ---------------

  describe('wp_update_post', () => {
    it('calls client.put with correct path and body', async () => {
      const handler = server.getToolHandler('wp_update_post')!;
      await handler({ id: 5, title: 'Updated Title' });
      expect(client.put).toHaveBeenCalledWith('/posts/5', { title: 'Updated Title' });
    });

    it('excludes id from the body', async () => {
      const handler = server.getToolHandler('wp_update_post')!;
      await handler({ id: 5, title: 'Updated' });
      const body = (client.put as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(body).not.toHaveProperty('id');
    });

    it('includes only defined optional fields', async () => {
      const handler = server.getToolHandler('wp_update_post')!;
      await handler({
        id: 5,
        title: 'Updated',
        status: 'publish',
        categories: [1],
      });
      expect(client.put).toHaveBeenCalledWith('/posts/5', {
        title: 'Updated',
        status: 'publish',
        categories: [1],
      });
    });

    it('sends empty body when only id provided', async () => {
      const handler = server.getToolHandler('wp_update_post')!;
      await handler({ id: 5 });
      expect(client.put).toHaveBeenCalledWith('/posts/5', {});
    });
  });

  // --------------- wp_delete_post ---------------

  describe('wp_delete_post', () => {
    it('calls client.delete with correct path', async () => {
      const handler = server.getToolHandler('wp_delete_post')!;
      await handler({ id: 7 });
      expect(client.delete).toHaveBeenCalledWith('/posts/7');
    });

    it('returns deletion result as JSON with correct structure', async () => {
      vi.spyOn(client, 'delete').mockResolvedValueOnce({ deleted: true, id: 7 });
      const handler = server.getToolHandler('wp_delete_post')!;
      const result = await handler({ id: 7 });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('"deleted": true');
      expect(JSON.parse(result.content[0].text)).toHaveProperty('deleted', true);
    });
  });
});
