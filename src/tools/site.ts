import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WordPressClient } from '../client.js';

export function registerSiteTools(server: McpServer, client: WordPressClient): void {
  server.tool(
    'wp_get_site_info',
    'Get WordPress site information including name, description, URL, and configuration',
    async () => {
      const data = await client.get('/site');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
