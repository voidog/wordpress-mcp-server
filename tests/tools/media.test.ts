import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockMcpServer } from '../helpers/mock-server.js';
import { WordPressClient } from '../../src/client.js';
import { registerMediaTools } from '../../src/tools/media.js';

describe('Media Tools', () => {
  let server: MockMcpServer;
  let client: WordPressClient;

  beforeEach(() => {
    server = new MockMcpServer();
    client = new WordPressClient('https://wp.test', 'key');
    vi.spyOn(client, 'get').mockResolvedValue({ media: [] });
    vi.spyOn(client, 'post').mockResolvedValue({ id: 1 });
    vi.spyOn(client, 'put').mockResolvedValue({ id: 1 });
    vi.spyOn(client, 'delete').mockResolvedValue({ deleted: true });

    registerMediaTools(server as any, client);
  });

  // --------------- Registration ---------------

  it('registers all 5 media tools', () => {
    expect(server.tools.size).toBe(5);
    expect(server.tools.has('wp_list_media')).toBe(true);
    expect(server.tools.has('wp_get_media')).toBe(true);
    expect(server.tools.has('wp_upload_media')).toBe(true);
    expect(server.tools.has('wp_update_media')).toBe(true);
    expect(server.tools.has('wp_delete_media')).toBe(true);
  });

  // --------------- wp_list_media ---------------

  describe('wp_list_media', () => {
    it('calls client.get with default params', async () => {
      const handler = server.getToolHandler('wp_list_media')!;
      await handler({ per_page: 10, page: 1 });
      expect(client.get).toHaveBeenCalledWith('/media', {
        per_page: 10,
        page: 1,
      });
    });

    it('includes mime_type when provided', async () => {
      const handler = server.getToolHandler('wp_list_media')!;
      await handler({ per_page: 10, page: 1, mime_type: 'image/jpeg' });
      expect(client.get).toHaveBeenCalledWith('/media', expect.objectContaining({
        mime_type: 'image/jpeg',
      }));
    });

    it('includes search when provided', async () => {
      const handler = server.getToolHandler('wp_list_media')!;
      await handler({ per_page: 10, page: 1, search: 'logo' });
      expect(client.get).toHaveBeenCalledWith('/media', expect.objectContaining({
        search: 'logo',
      }));
    });

    it('returns JSON text content with correct structure', async () => {
      vi.spyOn(client, 'get').mockResolvedValueOnce([{ id: 1, title: 'Logo' }]);
      const handler = server.getToolHandler('wp_list_media')!;
      const result = await handler({ per_page: 10, page: 1 });
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual([{ id: 1, title: 'Logo' }]);
    });

    it('propagates client.get errors', async () => {
      vi.spyOn(client, 'get').mockRejectedValueOnce(new Error('Network failure'));
      const handler = server.getToolHandler('wp_list_media')!;
      await expect(handler({ per_page: 10, page: 1 })).rejects.toThrow('Network failure');
    });
  });

  // --------------- wp_list_media schema validation ---------------

  describe('wp_list_media schema validation', () => {
    it('rejects per_page below min (0)', async () => {
      await expect(server.invokeHandler('wp_list_media', { per_page: 0 })).rejects.toThrow();
    });

    it('rejects per_page above max (101)', async () => {
      await expect(server.invokeHandler('wp_list_media', { per_page: 101 })).rejects.toThrow();
    });

    it('accepts per_page at min boundary (1)', async () => {
      const result = await server.invokeHandler('wp_list_media', { per_page: 1 });
      expect(result.content[0].type).toBe('text');
    });

    it('accepts per_page at max boundary (100)', async () => {
      const result = await server.invokeHandler('wp_list_media', { per_page: 100 });
      expect(result.content[0].type).toBe('text');
    });

    it('rejects page below min (0)', async () => {
      await expect(server.invokeHandler('wp_list_media', { page: 0 })).rejects.toThrow();
    });

    it('applies defaults for per_page and page', async () => {
      await server.invokeHandler('wp_list_media', {});
      expect(client.get).toHaveBeenCalledWith('/media', expect.objectContaining({
        per_page: 10,
        page: 1,
      }));
    });
  });

  // --------------- wp_get_media ---------------

  describe('wp_get_media', () => {
    it('calls client.get with correct path', async () => {
      const handler = server.getToolHandler('wp_get_media')!;
      await handler({ id: 20 });
      expect(client.get).toHaveBeenCalledWith('/media/20');
    });

    it('returns media data as JSON with correct structure', async () => {
      vi.spyOn(client, 'get').mockResolvedValueOnce({ id: 20, title: 'Image' });
      const handler = server.getToolHandler('wp_get_media')!;
      const result = await handler({ id: 20 });
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toHaveProperty('id', 20);
    });
  });

  // --------------- wp_upload_media ---------------

  describe('wp_upload_media', () => {
    it('returns error when no source and no base64+filename', async () => {
      const handler = server.getToolHandler('wp_upload_media')!;
      const result = await handler({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provide either source_url or both base64 and filename');
    });

    it('returns error when base64 provided without filename', async () => {
      const handler = server.getToolHandler('wp_upload_media')!;
      const result = await handler({ base64: 'abc123' });
      expect(result.isError).toBe(true);
    });

    it('returns error when filename provided without base64', async () => {
      const handler = server.getToolHandler('wp_upload_media')!;
      const result = await handler({ filename: 'test.jpg' });
      expect(result.isError).toBe(true);
    });

    it('uploads via source_url', async () => {
      const handler = server.getToolHandler('wp_upload_media')!;
      await handler({ source_url: 'https://example.com/image.jpg' });
      expect(client.post).toHaveBeenCalledWith('/media', {
        source_url: 'https://example.com/image.jpg',
      });
    });

    it('uploads via base64 and filename', async () => {
      const handler = server.getToolHandler('wp_upload_media')!;
      await handler({ base64: 'abc123', filename: 'test.jpg' });
      expect(client.post).toHaveBeenCalledWith('/media', {
        base64: 'abc123',
        filename: 'test.jpg',
      });
    });

    it('sends both source_url and base64+filename when both provided', async () => {
      const handler = server.getToolHandler('wp_upload_media')!;
      await handler({
        source_url: 'https://example.com/image.jpg',
        base64: 'abc123',
        filename: 'test.jpg',
      });
      expect(client.post).toHaveBeenCalledWith('/media', {
        source_url: 'https://example.com/image.jpg',
        base64: 'abc123',
        filename: 'test.jpg',
      });
    });

    it('includes optional metadata fields', async () => {
      const handler = server.getToolHandler('wp_upload_media')!;
      await handler({
        source_url: 'https://example.com/image.jpg',
        title: 'My Image',
        caption: 'A caption',
        alt_text: 'Alt description',
        description: 'Detailed description',
      });
      expect(client.post).toHaveBeenCalledWith('/media', {
        source_url: 'https://example.com/image.jpg',
        title: 'My Image',
        caption: 'A caption',
        alt_text: 'Alt description',
        description: 'Detailed description',
      });
    });
  });

  // --------------- wp_update_media ---------------

  describe('wp_update_media', () => {
    it('calls client.put with correct path', async () => {
      const handler = server.getToolHandler('wp_update_media')!;
      await handler({ id: 20, title: 'Updated Title' });
      expect(client.put).toHaveBeenCalledWith('/media/20', { title: 'Updated Title' });
    });

    it('excludes id from the body', async () => {
      const handler = server.getToolHandler('wp_update_media')!;
      await handler({ id: 20, caption: 'New caption' });
      const body = (client.put as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(body).not.toHaveProperty('id');
      expect(body).toHaveProperty('caption', 'New caption');
    });

    it('sends empty body when only id provided', async () => {
      const handler = server.getToolHandler('wp_update_media')!;
      await handler({ id: 20 });
      expect(client.put).toHaveBeenCalledWith('/media/20', {});
    });
  });

  // --------------- wp_delete_media ---------------

  describe('wp_delete_media', () => {
    it('calls client.delete with correct path', async () => {
      const handler = server.getToolHandler('wp_delete_media')!;
      await handler({ id: 20 });
      expect(client.delete).toHaveBeenCalledWith('/media/20');
    });

    it('returns deletion result as JSON with correct structure', async () => {
      vi.spyOn(client, 'delete').mockResolvedValueOnce({ deleted: true });
      const handler = server.getToolHandler('wp_delete_media')!;
      const result = await handler({ id: 20 });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('"deleted": true');
      expect(JSON.parse(result.content[0].text)).toHaveProperty('deleted', true);
    });
  });
});
