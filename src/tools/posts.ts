import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WordPressClient } from '../client.js';

export function registerPostTools(server: McpServer, client: WordPressClient): void {
  server.tool(
    'wp_list_posts',
    'List WordPress posts with filtering and pagination',
    {
      per_page: z.number().min(1).max(100).default(10).describe('Number of posts per page'),
      page: z.number().min(1).default(1).describe('Page number'),
      status: z.string().default('any').describe('Post status filter (publish, draft, any, etc.)'),
      search: z.string().optional().describe('Search term'),
      category: z.number().int().min(1).optional().describe('Filter by category ID'),
      tag: z.number().int().min(1).optional().describe('Filter by tag ID'),
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
      if (args.category !== undefined) params.category = args.category;
      if (args.tag !== undefined) params.tag = args.tag;

      const data = await client.get('/posts', params);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_get_post',
    'Get a single WordPress post by ID',
    {
      id: z.number().int().min(1).describe('Post ID'),
    },
    async (args) => {
      const data = await client.get(`/posts/${args.id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_create_post',
    'Create a new WordPress post',
    {
      title: z.string().describe('Post title (required)'),
      content: z.string().optional().describe('Post content (HTML)'),
      excerpt: z.string().optional().describe('Post excerpt'),
      status: z.enum(['publish', 'draft', 'pending', 'private', 'future']).default('draft').describe('Post status'),
      slug: z.string().optional().describe('Post slug'),
      categories: z.array(z.number().int().min(1)).optional().describe('Array of category IDs'),
      tags: z.array(z.number().int().min(1)).optional().describe('Array of tag IDs'),
      featured_media: z.number().int().min(0).optional().describe('Featured image attachment ID'),
    },
    async (args) => {
      const body: Record<string, unknown> = {
        title: args.title,
        status: args.status,
      };
      if (args.content) body.content = args.content;
      if (args.excerpt) body.excerpt = args.excerpt;
      if (args.slug) body.slug = args.slug;
      if (args.categories) body.categories = args.categories;
      if (args.tags) body.tags = args.tags;
      if (args.featured_media !== undefined) body.featured_media = args.featured_media;

      const data = await client.post('/posts', body);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_update_post',
    'Update an existing WordPress post',
    {
      id: z.number().int().min(1).describe('Post ID (required)'),
      title: z.string().optional().describe('Post title'),
      content: z.string().optional().describe('Post content (HTML)'),
      excerpt: z.string().optional().describe('Post excerpt'),
      status: z.enum(['publish', 'draft', 'pending', 'private', 'future', 'trash']).optional().describe('Post status'),
      slug: z.string().optional().describe('Post slug'),
      categories: z.array(z.number().int().min(1)).optional().describe('Array of category IDs'),
      tags: z.array(z.number().int().min(1)).optional().describe('Array of tag IDs'),
      featured_media: z.number().int().min(0).optional().describe('Featured image attachment ID (0 to remove)'),
    },
    async (args) => {
      const { id, ...rest } = args;
      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) body[key] = value;
      }

      const data = await client.put(`/posts/${id}`, body);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    'wp_delete_post',
    'Delete a WordPress post (moves to trash)',
    {
      id: z.number().int().min(1).describe('Post ID to delete'),
    },
    async (args) => {
      const data = await client.delete(`/posts/${args.id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
