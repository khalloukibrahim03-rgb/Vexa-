# VEXA — RAILWAY RUNTIME & DEPLOYMENT GUIDE

To successfully run and deploy the VEXA modular monorepo backend on Railway, the following environment variables are strictly required at runtime:

## Required Environment Variables

| Variable Name | Required | Description / Recommended Value |
| :--- | :---: | :--- |
| **`DATABASE_URL`** | **YES** | The PostgreSQL database connection string. <br> Format: `postgresql://postgres:password@host:port/database` |
| **`SESSION_SECRET`** | **YES** | A secure cryptographic key used to sign session HMAC tokens. <br> Min length: **12 characters**. |
| **`PORT`** | **YES** | Handled automatically by Railway. The container binds to this port. |
| **`NODE_ENV`** | NO | Set to `production` or `development`. Defaults to `development`. |

## Reproduction Steps from Clean Environments

On clean cloud hosting instances, the monorepo build and bootstrap sequence is structured as follows:

1. **Dependency Installation**:
   ```bash
   npm install
   ```
2. **Topological Monorepo Build**:
   ```bash
   npm run build
   ```
   *Note: This automatically triggers schema generation and types compiling in `@vexa/database` before building `@vexa/backend`.*

3. **Runtime Execution**:
   ```bash
   npm run start --workspace=@vexa/backend
   ```
