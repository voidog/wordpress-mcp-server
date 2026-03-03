import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WordPressClient } from '../client.js';

export function registerCategoryTools(server: McpServer, client: WordPressClient): void {
  server.tool(
    'wp_list_categories',
    'List WordPress categories with optional filtering',
    {
      per_page: z.number().min(1).max(100).default(100).describe('Number of categories per page'),
      page: z.number().min(1).default(1).describe('Page number'),
      search: z.string().optional().describe('Search term'),
      parent: z.number().int().min(0).optional().describe('Parent category ID'),
      hide_empty: z.boolean().default(false).describe('Hide categories with no posts'),
    },
    async (args) => {
      const params: Record<string, string | number | boolean> = {
        per_page: args.per_page,
        page: args.page,
        hide_empty: args.hide_empty,
      };
      if (args.search) params.search = args.search;
      if (args.parent !== undefined) params.parent = args.parent;

      const data = await client.get('/categories', params);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_create_category',
    'Create a new WordPress category',
    {
      name: z.string().describe('Category name (required)'),
      slug: z.string().optional().describe('Category slug'),
      description: z.string().optional().describe('Category description'),
      parent: z.number().int().min(0).optional().describe('Parent category ID'),
    },
    async (args) => {
      const body: Record<string, unknown> = { name: args.name };
      if (args.slug) body.slug = args.slug;
      if (args.description) body.description = args.description;
      if (args.parent !== undefined) body.parent = args.parent;

      const data = await client.post('/categories', body);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
