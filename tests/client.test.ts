import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WordPressClient } from '../src/client.js';

function mockResponse(mockFetch: ReturnType<typeof vi.fn>, body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  });
}

describe('WordPressClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  // --------------- Constructor ---------------

  describe('constructor', () => {
    it('strips trailing slashes from baseUrl', () => {
      const client = new WordPressClient('https://example.com///', 'key');
      mockResponse(mockFetch, { success: true, data: {} });
      client.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/wp-json/wpmcp/v1/test',
        expect.anything(),
      );
    });

    it('builds correct endpoint without trailing slash', () => {
      const client = new WordPressClient('https://example.com', 'key');
      mockResponse(mockFetch, { success: true, data: {} });
      client.get('/site');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/wp-json/wpmcp/v1/site',
        expect.anything(),
      );
    });
  });

  // --------------- request() ---------------

  describe('request()', () => {
    let client: WordPressClient;

    beforeEach(() => {
      client = new WordPressClient('https://wp.test', 'test-api-key');
    });

    it('sets X-MCP-API-Key header', async () => {
      mockResponse(mockFetch, { success: true, data: 'ok' });
      await client.get('/site');
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['X-MCP-API-Key']).toBe('test-api-key');
    });

    it('sets Content-Type to application/json', async () => {
      mockResponse(mockFetch, { success: true, data: 'ok' });
      await client.get('/site');
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('includes body for POST requests', async () => {
      mockResponse(mockFetch, { success: true, data: {} });
      await client.post('/posts', { title: 'Hello' });
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify({ title: 'Hello' }));
    });

    it('includes body for PUT requests', async () => {
      mockResponse(mockFetch, { success: true, data: {} });
      await client.put('/posts/1', { title: 'Updated' });
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('PUT');
      expect(options.body).toBe(JSON.stringify({ title: 'Updated' }));
    });

    it('does not include body for GET requests', async () => {
      mockResponse(mockFetch, { success: true, data: {} });
      await client.get('/posts');
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
    });

    it('does not include body for DELETE requests', async () => {
      mockResponse(mockFetch, { success: true, data: {} });
      await client.delete('/posts/1');
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('DELETE');
      expect(options.body).toBeUndefined();
    });

    // --------------- Query string ---------------

    it('builds query string from params', async () => {
      mockResponse(mockFetch, { success: true, data: [] });
      await client.get('/posts', { per_page: 10, status: 'publish' });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('per_page=10');
      expect(url).toContain('status=publish');
    });

    it('filters undefined values from query string', async () => {
      mockResponse(mockFetch, { success: true, data: [] });
      await client.get('/posts', { per_page: 10, search: undefined as unknown as string });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('per_page=10');
      expect(url).not.toContain('search');
    });

    it('filters null values from query string', async () => {
      mockResponse(mockFetch, { success: true, data: [] });
      await client.get('/posts', { per_page: 5, tag: null as unknown as number });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('per_page=5');
      expect(url).not.toContain('tag');
    });

    it('filters empty string values from query string', async () => {
      mockResponse(mockFetch, { success: true, data: [] });
      await client.get('/posts', { per_page: 5, search: '' });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain('search');
    });

    it('does not append query string when params are empty after filtering', async () => {
      mockResponse(mockFetch, { success: true, data: [] });
      await client.get('/posts', { search: '' });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://wp.test/wp-json/wpmcp/v1/posts');
    });

    // --------------- Response handling ---------------

    it('returns data on success', async () => {
      const expected = { id: 1, title: 'Test' };
      mockResponse(mockFetch, { success: true, data: expected });
      const result = await client.get('/posts/1');
      expect(result).toEqual(expected);
    });

    it('throws on error with code and message', async () => {
      mockResponse(mockFetch, {
        success: false,
        error: { code: 'not_found', message: 'Post not found' },
      }, 404);
      await expect(client.get('/posts/999')).rejects.toThrow(
        'WordPress API error [not_found]: Post not found',
      );
    });

    it('truncates error messages longer than 200 chars', async () => {
      const longMsg = 'A'.repeat(250);
      mockResponse(mockFetch, {
        success: false,
        error: { code: 'server_error', message: longMsg },
      }, 500);
      await expect(client.get('/error')).rejects.toThrow(
        `WordPress API error [server_error]: ${'A'.repeat(200)}...`,
      );
    });

    it('falls back to unknown_error when no error code', async () => {
      mockResponse(mockFetch, {
        success: false,
        error: { message: 'Something broke' },
      }, 500);
      await expect(client.get('/error')).rejects.toThrow(
        'WordPress API error [unknown_error]: Something broke',
      );
    });

    it('falls back to HTTP status when no error message', async () => {
      mockResponse(mockFetch, { success: false }, 403);
      await expect(client.get('/forbidden')).rejects.toThrow(
        'WordPress API error [unknown_error]: HTTP 403',
      );
    });

    it('propagates fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(client.get('/site')).rejects.toThrow('Network error');
    });

    it('propagates SyntaxError when response.json() fails', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => { throw new SyntaxError('Unexpected token'); },
        ok: true,
        status: 200,
      });
      await expect(client.get('/site')).rejects.toThrow(SyntaxError);
    });
  });

  // --------------- Convenience methods ---------------

  describe('convenience methods', () => {
    let client: WordPressClient;

    beforeEach(() => {
      client = new WordPressClient('https://wp.test', 'key');
    });

    it('get() uses GET method with params', async () => {
      mockResponse(mockFetch, { success: true, data: 'ok' });
      await client.get('/test', { page: 1 });
      const [url, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('GET');
      expect(url).toContain('page=1');
    });

    it('post() uses POST method with body', async () => {
      mockResponse(mockFetch, { success: true, data: 'ok' });
      await client.post('/test', { foo: 'bar' });
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ foo: 'bar' });
    });

    it('put() uses PUT method with body', async () => {
      mockResponse(mockFetch, { success: true, data: 'ok' });
      await client.put('/test', { baz: 1 });
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('PUT');
      expect(JSON.parse(options.body)).toEqual({ baz: 1 });
    });

    it('delete() uses DELETE method without body', async () => {
      mockResponse(mockFetch, { success: true, data: 'ok' });
      await client.delete('/test/1');
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('DELETE');
      expect(options.body).toBeUndefined();
    });
  });
});
