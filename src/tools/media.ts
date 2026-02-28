import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WordPressClient } from '../client.js';

export function registerMediaTools(server: McpServer, client: WordPressClient): void {
  server.tool(
    'wp_list_media',
    'List WordPress media attachments with filtering and pagination',
    {
      per_page: z.number().min(1).max(100).default(10).describe('Number of items per page'),
      page: z.number().min(1).default(1).describe('Page number'),
      mime_type: z.string().optional().describe('Filter by MIME type (e.g., image/jpeg, image, video)'),
      search: z.string().optional().describe('Search term'),
    },
    async (args) => {
      const params: Record<string, string | number | boolean> = {
        per_page: args.per_page,
        page: args.page,
      };
      if (args.mime_type) params.mime_type = args.mime_type;
      if (args.search) params.search = args.search;

      const data = await client.get('/media', params);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_get_media',
    'Get a single WordPress media attachment by ID',
    {
      id: z.number().describe('Media attachment ID'),
    },
    async (args) => {
      const data = await client.get(`/media/${args.id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_upload_media',
    'Upload media to WordPress. Provide either source_url (download from URL) or base64+filename (base64-encoded file data)',
    {
      source_url: z.string().optional().describe('URL to download the media from'),
      base64: z.string().optional().describe('Base64-encoded file data'),
      filename: z.string().optional().describe('Filename (required when using base64)'),
      title: z.string().optional().describe('Media title'),
      caption: z.string().optional().describe('Media caption'),
      alt_text: z.string().optional().describe('Alt text for the media'),
      description: z.string().optional().describe('Media description'),
    },
    async (args) => {
      if (!args.source_url && (!args.base64 || !args.filename)) {
        return {
          content: [{ type: 'text', text: 'Error: Provide either source_url or both base64 and filename' }],
          isError: true,
        };
      }

      const body: Record<string, unknown> = {};
      if (args.source_url) body.source_url = args.source_url;
      if (args.base64) body.base64 = args.base64;
      if (args.filename) body.filename = args.filename;
      if (args.title) body.title = args.title;
      if (args.caption) body.caption = args.caption;
      if (args.alt_text) body.alt_text = args.alt_text;
      if (args.description) body.description = args.description;

      const data = await client.post('/media', body);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_update_media',
    'Update WordPress media attachment metadata',
    {
      id: z.number().describe('Media attachment ID (required)'),
      title: z.string().optional().describe('Media title'),
      caption: z.string().optional().describe('Media caption'),
      alt_text: z.string().optional().describe('Alt text'),
      description: z.string().optional().describe('Media description'),
    },
    async (args) => {
      const { id, ...rest } = args;
      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) body[key] = value;
      }

      const data = await client.put(`/media/${id}`, body);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_delete_media',
    'Permanently delete a WordPress media attachment',
    {
      id: z.number().describe('Media attachment ID to delete'),
    },
    async (args) => {
      const data = await client.delete(`/media/${args.id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
