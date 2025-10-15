import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = dirname(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      'cloudflare:email': resolve(projectRoot, 'src/test-support/cloudflare-email.ts'),
      'html-entities': resolve(projectRoot, 'src/test-support/html-entities.ts'),
    },
  },
});
