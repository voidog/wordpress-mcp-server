import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WordPressClient } from '../client.js';

export function registerPageTools(server: McpServer, client: WordPressClient): void {
  server.tool(
    'wp_list_pages',
    'List WordPress pages with filtering and pagination',
    {
      per_page: z.number().min(1).max(100).default(10).describe('Number of pages per page'),
      page: z.number().min(1).default(1).describe('Page number'),
      status: z.string().default('any').describe('Page status filter (publish, draft, any, etc.)'),
      search: z.string().optional().describe('Search term'),
      parent: z.number().optional().describe('Filter by parent page ID'),
      orderby: z.string().default('date').describe('Order by field (date, title, modified, etc.)'),
      order: z.enum(['ASC', 'DESC']).default('DESC').describe('Sort order'),
    },
    async (args) => {
      const params: Record<string, string | number | boolean> = {
        per_page: args.per_page,
        page: args.page,
        status: args.status,
        orderby: args.orderby,
        order: args.order,
      };
      if (args.search) params.search = args.search;
      if (args.parent !== undefined) params.parent = args.parent;

      const data = await client.get('/pages', params);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_get_page',
    'Get a single WordPress page by ID',
    {
      id: z.number().describe('Page ID'),
    },
    async (args) => {
      const data = await client.get(`/pages/${args.id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_create_page',
    'Create a new WordPress page',
    {
      title: z.string().describe('Page title (required)'),
      content: z.string().optional().describe('Page content (HTML)'),
      excerpt: z.string().optional().describe('Page excerpt'),
      status: z.enum(['publish', 'draft', 'pending', 'private']).default('draft').describe('Page status'),
      slug: z.string().optional().describe('Page slug'),
      parent: z.number().optional().describe('Parent page ID'),
      featured_media: z.number().optional().describe('Featured image attachment ID'),
    },
    async (args) => {
      const body: Record<string, unknown> = {
        title: args.title,
        status: args.status,
      };
      if (args.content) body.content = args.content;
      if (args.excerpt) body.excerpt = args.excerpt;
      if (args.slug) body.slug = args.slug;
      if (args.parent !== undefined) body.parent = args.parent;
      if (args.featured_media !== undefined) body.featured_media = args.featured_media;

      const data = await client.post('/pages', body);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_update_page',
    'Update an existing WordPress page',
    {
      id: z.number().describe('Page ID (required)'),
      title: z.string().optional().describe('Page title'),
      content: z.string().optional().describe('Page content (HTML)'),
      excerpt: z.string().optional().describe('Page excerpt'),
      status: z.enum(['publish', 'draft', 'pending', 'private', 'trash']).optional().describe('Page status'),
      slug: z.string().optional().describe('Page slug'),
      parent: z.number().optional().describe('Parent page ID'),
      featured_media: z.number().optional().describe('Featured image attachment ID (0 to remove)'),
    },
    async (args) => {
      const { id, ...rest } = args;
      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) body[key] = value;
      }

      const data = await client.put(`/pages/${id}`, body);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_delete_page',
    'Delete a WordPress page (moves to trash)',
    {
      id: z.number().describe('Page ID to delete'),
    },
    async (args) => {
      const data = await client.delete(`/pages/${args.id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
