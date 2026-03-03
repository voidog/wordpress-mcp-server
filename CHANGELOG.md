# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-03

### Added

- **MCP server** — stdio-based Model Context Protocol server for WordPress management
- **20 tools** — Full CRUD for posts, pages, media, categories, tags, and site info
- **WordPress client** — HTTP client with API key authentication and structured error handling
- **Zod schema validation** — Input validation with boundary constraints for all tool parameters
- **Error handling** — Structured error responses with message truncation (200 char limit)
- **Test suite** — 148 Vitest tests (99% statement coverage) with Zod schema validation and error propagation tests
- **CI/CD** — GitHub Actions with Node.js 20/22 matrix and Codecov integration

[1.1.0]: https://github.com/voidog/wordpress-mcp-server/releases/tag/v1.1.0
