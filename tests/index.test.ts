import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for src/index.ts — environment variable validation and tool registration.
 *
 * Since index.ts has top-level side-effects (reads env, creates client, registers tools,
 * calls main()), we test by dynamically importing the module with controlled env.
 */

// Mock the MCP SDK transport so main() doesn't actually start stdio
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

// Track tool registrations via the real McpServer
const toolSpy = vi.fn();
const connectSpy = vi.fn().mockResolvedValue(undefined);

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    tool = toolSpy;
    connect = connectSpy;
  },
}));

describe('index.ts', () => {
  const originalEnv = { ...process.env };
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    toolSpy.mockClear();
    connectSpy.mockClear();
    process.env = { ...originalEnv };
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  it('exits with code 1 when WORDPRESS_URL is missing', async () => {
    delete process.env.WORDPRESS_URL;
    process.env.WORDPRESS_API_KEY = 'some-key';

    await expect(import('../src/index.js')).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('WORDPRESS_URL'),
    );
  });

  it('exits with code 1 when WORDPRESS_API_KEY is missing', async () => {
    process.env.WORDPRESS_URL = 'https://wp.test';
    delete process.env.WORDPRESS_API_KEY;

    await expect(import('../src/index.js')).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when both env vars are missing', async () => {
    delete process.env.WORDPRESS_URL;
    delete process.env.WORDPRESS_API_KEY;

    await expect(import('../src/index.js')).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('starts successfully without WORDPRESS_USERNAME', async () => {
    process.env.WORDPRESS_URL = 'https://wp.test';
    process.env.WORDPRESS_API_KEY = 'test-key';
    delete process.env.WORDPRESS_USERNAME;

    await import('../src/index.js');

    expect(exitSpy).not.toHaveBeenCalled();
    expect(connectSpy).toHaveBeenCalled();
  });

  it('registers all tool groups when env vars are set', async () => {
    process.env.WORDPRESS_URL = 'https://wp.test';
    process.env.WORDPRESS_API_KEY = 'test-key';

    await import('../src/index.js');

    // Total tools: site(1) + categories(2) + tags(2) + posts(5) + pages(5) + media(5) = 20
    expect(toolSpy.mock.calls.length).toBe(20);
  });

  it('registers tools with expected names', async () => {
    process.env.WORDPRESS_URL = 'https://wp.test';
    process.env.WORDPRESS_API_KEY = 'test-key';

    await import('../src/index.js');

    const registeredNames = toolSpy.mock.calls.map((call: unknown[]) => call[0]);
    expect(registeredNames).toContain('wp_get_site_info');
    expect(registeredNames).toContain('wp_list_posts');
    expect(registeredNames).toContain('wp_list_pages');
    expect(registeredNames).toContain('wp_list_media');
    expect(registeredNames).toContain('wp_list_categories');
    expect(registeredNames).toContain('wp_list_tags');
  });

  it('calls server.connect with a transport', async () => {
    process.env.WORDPRESS_URL = 'https://wp.test';
    process.env.WORDPRESS_API_KEY = 'test-key';

    await import('../src/index.js');

    expect(connectSpy).toHaveBeenCalled();
  });
});
