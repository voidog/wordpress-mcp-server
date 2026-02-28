/**
 * Mock McpServer that captures tool registrations for testing.
 *
 * The real McpServer.tool() has these overloads we care about:
 *   tool(name, description, cb)                     — zero-arg tool
 *   tool(name, description, paramsSchema, cb)        — tool with params
 *
 * We capture the registrations so tests can look up and invoke handlers.
 */

import { z } from 'zod';

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;

export interface RegisteredToolInfo {
  description?: string;
  schema?: Record<string, z.ZodType>;
  handler: ToolHandler;
}

export class MockMcpServer {
  tools: Map<string, RegisteredToolInfo> = new Map();

  /**
   * Mimics the overloaded McpServer.tool() signature.
   * Parses arguments the same way the real implementation does.
   */
  tool(name: string, ...rest: unknown[]): void {
    let description: string | undefined;
    let schema: Record<string, z.ZodType> | undefined;

    // If first remaining arg is a string, it's the description
    if (typeof rest[0] === 'string') {
      description = rest.shift() as string;
    }

    // If there are 2+ args left, the first is the schema, the last is the callback
    if (rest.length > 1) {
      schema = rest.shift() as Record<string, z.ZodType>;
    }

    const handler = rest[0] as ToolHandler;

    this.tools.set(name, { description, schema, handler });
  }

  getToolHandler(name: string): ToolHandler | undefined {
    return this.tools.get(name)?.handler;
  }

  getToolInfo(name: string): RegisteredToolInfo | undefined {
    return this.tools.get(name);
  }

  /**
   * Validates args through the stored Zod schema, then invokes the handler.
   * This mimics what the real McpServer does — applies defaults, enforces
   * min/max/enum constraints, etc.
   */
  async invokeHandler(name: string, args: Record<string, unknown> = {}): Promise<any> {
    const info = this.tools.get(name);
    if (!info) {
      throw new Error(`Tool not found: ${name}`);
    }

    let validatedArgs = args;
    if (info.schema) {
      const objectSchema = z.object(info.schema);
      validatedArgs = objectSchema.parse(args);
    }

    return info.handler(validatedArgs);
  }
}
