// Module declarations for packages without bundled TypeScript definitions
declare module '@koa/cors' {
  import type { Middleware } from 'koa';
  interface CorsOptions {
    origin?: string | ((ctx: import('koa').Context) => string | Promise<string>);
    allowMethods?: string | string[];
    allowHeaders?: string | string[];
    exposeHeaders?: string | string[];
    maxAge?: number | string;
    credentials?: boolean;
    keepHeadersOnError?: boolean;
    secureContext?: boolean;
    privateNetworkAccess?: boolean;
  }
  function cors(options?: CorsOptions): Middleware;
  export = cors;
}
