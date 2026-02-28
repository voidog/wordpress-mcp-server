# WordPress MCP Server

[![Tests](https://github.com/voidog-ai/wordpress-mcp-server/actions/workflows/tests.yml/badge.svg)](https://github.com/voidog-ai/wordpress-mcp-server/actions/workflows/tests.yml)
[![codecov](https://codecov.io/gh/voidog-ai/wordpress-mcp-server/graph/badge.svg)](https://codecov.io/gh/voidog-ai/wordpress-mcp-server)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that gives AI assistants full control over WordPress content management.

Works with the [wordpress-mcp-connector](https://github.com/voidog-ai/wordpress-mcp-connector) WordPress plugin.

## Tools

20 tools for managing WordPress content:

| Category | Tools |
|----------|-------|
| Site | `wp_get_site_info` |
| Posts | `wp_list_posts`, `wp_get_post`, `wp_create_post`, `wp_update_post`, `wp_delete_post` |
| Pages | `wp_list_pages`, `wp_get_page`, `wp_create_page`, `wp_update_page`, `wp_delete_page` |
| Categories | `wp_list_categories`, `wp_create_category` |
| Tags | `wp_list_tags`, `wp_create_tag` |
| Media | `wp_list_media`, `wp_get_media`, `wp_upload_media`, `wp_update_media`, `wp_delete_media` |

## Requirements

- Node.js 22+
- WordPress site with the [wordpress-mcp-connector](https://github.com/voidog-ai/wordpress-mcp-connector) plugin installed and an API key generated

## Quick Start

### 1. Install the WordPress Plugin

Install and activate [wordpress-mcp-connector](https://github.com/voidog-ai/wordpress-mcp-connector) on your WordPress site, then generate an API key from **Settings → MCP Connector**.

### 2. Configure Your MCP Client

Add to your MCP client configuration (e.g. Claude Desktop, Claude Code):

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "npx",
      "args": ["-y", "@voidog/wordpress-mcp-server"],
      "env": {
        "WORDPRESS_URL": "https://your-site.com",
        "WORDPRESS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WORDPRESS_URL` | Yes | WordPress site URL (e.g. `https://example.com`) |
| `WORDPRESS_API_KEY` | Yes | API key from WordPress admin → Settings → MCP Connector |

## Development

```bash
git clone https://github.com/voidog-ai/wordpress-mcp-server.git
cd wordpress-mcp-server
npm install
npm run build
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage
```

Tests live in the `tests/` directory, organized into `client/`, `index/`, and `tools/` subdirectories. All tests run against mock implementations — no live WordPress site required.

### Project Structure

```
wordpress-mcp-server/
├── src/
│   ├── index.ts          # Server entry point
│   ├── client.ts         # WordPress REST API client
│   └── tools/
│       ├── site.ts       # wp_get_site_info
│       ├── posts.ts      # Post CRUD tools
│       ├── pages.ts      # Page CRUD tools
│       ├── media.ts      # Media management tools
│       ├── categories.ts # Category tools
│       └── tags.ts       # Tag tools
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

### Tech Stack

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) — MCP server framework
- [Zod](https://zod.dev/) — Input schema validation
- TypeScript 5.9 / Node.js 22

## Architecture

```
┌─────────────┐    stdio     ┌─────────────────────┐    HTTP     ┌───────────────────────────┐
│  MCP Client │◄────────────►│ wordpress-mcp-server │◄──────────►│ wordpress-mcp-connector   │
│  (Claude)   │              │  (Node.js)           │            │  (WordPress Plugin)       │
└─────────────┘              └─────────────────────┘            └───────────────────────────┘
                                                                  ▲
                                                                  │ REST API
                                                                  ▼
                                                                ┌───────────┐
                                                                │ WordPress │
                                                                │ Database  │
                                                                └───────────┘
```

## License

MIT — see [LICENSE](LICENSE) for details.
