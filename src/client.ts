/**
 * WordPress HTTP client for the MCP server.
 * Communicates with the wordpress-mcp-connector plugin REST API.
 */

interface WPResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export class WordPressClient {
  private baseUrl: string;
  private apiKey: string;
  private username?: string;

  constructor(baseUrl: string, apiKey: string, username?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.username = username;
  }

  private get endpoint(): string {
    return `${this.baseUrl}/wp-json/wpmcp/v1`;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params?: Record<string, string | number | boolean>,
  ): Promise<T> {
    let url = `${this.endpoint}${path}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += `?${qs}`;
      }
    }

    const headers: Record<string, string> = {
      'X-MCP-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
    if (this.username) {
      headers['X-MCP-Username'] = this.username;
    }

    const options: RequestInit = { method, headers };
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const json = (await response.json()) as WPResponse<T>;

    if (!json.success) {
      const rawMsg = json.error?.message ?? `HTTP ${response.status}`;
      const errMsg = rawMsg.length > 200 ? rawMsg.substring(0, 200) + '...' : rawMsg;
      const errCode = json.error?.code ?? 'unknown_error';
      throw new Error(`WordPress API error [${errCode}]: ${errMsg}`);
    }

    return json.data as T;
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this.request<T>('GET', path, undefined, params);
  }

  async post<T = unknown>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T = unknown>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
