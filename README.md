# 9to5-scout

## Types: Wrangler-generated
- Run `pnpm wrangler types` after altering wrangler.toml (bindings, compat date/flags).
- CI runs `pnpm generate-types` before typecheck/build.
- Do NOT import `@cloudflare/workers-types` in app/runtime code; rely on the generated declaration file.
- If `nodejs_compat` is enabled, also include `@types/node` and add `"node"` to `compilerOptions.types`.
