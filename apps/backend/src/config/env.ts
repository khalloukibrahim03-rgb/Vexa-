import dotenv from 'dotenv';
import { z } from 'zod';

// Load environmental variables
dotenv.config();

// For testing environments, inject default dummy variables if not defined, to ensure CI and tests compile/run cleanly.
if (process.env['NODE_ENV'] === 'test') {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/vexa_test';
  }
  if (!process.env['SESSION_SECRET']) {
    process.env['SESSION_SECRET'] = 'test_session_secret_placeholder_12chars_long';
  }
}

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3001'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid PostgreSQL connection string' }),
  SESSION_SECRET: z.string().min(12, { message: 'SESSION_SECRET must be at least 12 characters long' }),
  CORS_ORIGIN: z.string().default('*'),
});

let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const errorMessages = error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error('❌ Environment configuration validation failed:\n', errorMessages);
  } else {
    console.error('❌ An unknown error occurred during environment configuration parsing:', error);
  }
  process.exit(1);
}

export const env = parsedEnv;
export default env;
