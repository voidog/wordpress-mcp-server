#!/usr/bin/env node
/**
 * WordPress MCP Server
 * Connects Claude to WordPress via the wordpress-mcp-connector plugin REST API.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WordPressClient } from './client.js';
import { registerSiteTools } from './tools/site.js';
import { registerCategoryTools } from './tools/categories.js';
import { registerTagTools } from './tools/tags.js';
import { registerPostTools } from './tools/posts.js';
import { registerPageTools } from './tools/pages.js';
import { registerMediaTools } from './tools/media.js';

const WORDPRESS_URL = process.env.WORDPRESS_URL;
const WORDPRESS_API_KEY = process.env.WORDPRESS_API_KEY;

if (!WORDPRESS_URL || !WORDPRESS_API_KEY) {
  console.error('Error: WORDPRESS_URL and WORDPRESS_API_KEY environment variables are required');
  process.exit(1);
}

const client = new WordPressClient(WORDPRESS_URL, WORDPRESS_API_KEY);

const server = new McpServer({
  name: 'wordpress-mcp-server',
  version: '1.0.0',
});

registerSiteTools(server, client);
registerCategoryTools(server, client);
registerTagTools(server, client);
registerPostTools(server, client);
registerPageTools(server, client);
registerMediaTools(server, client);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
