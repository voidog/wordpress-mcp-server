import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WordPressClient } from '../client.js';

export function registerTagTools(server: McpServer, client: WordPressClient): void {
  server.tool(
    'wp_list_tags',
    'List WordPress tags with optional filtering',
    {
      per_page: z.number().min(1).max(100).default(100).describe('Number of tags per page'),
      page: z.number().min(1).default(1).describe('Page number'),
      search: z.string().optional().describe('Search term'),
      hide_empty: z.boolean().default(false).describe('Hide tags with no posts'),
    },
    async (args) => {
      const params: Record<string, string | number | boolean> = {
        per_page: args.per_page,
        page: args.page,
        hide_empty: args.hide_empty,
      };
      if (args.search) params.search = args.search;

      const data = await client.get('/tags', params);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_create_tag',
    'Create a new WordPress tag',
    {
      name: z.string().describe('Tag name (required)'),
      slug: z.string().optional().describe('Tag slug'),
      description: z.string().optional().describe('Tag description'),
    },
    async (args) => {
      const body: Record<string, unknown> = { name: args.name };
      if (args.slug) body.slug = args.slug;
      if (args.description) body.description = args.description;

      const data = await client.post('/tags', body);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
