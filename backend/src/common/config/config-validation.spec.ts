import { describe, it, expect } from 'vitest';
import { validateConfig } from './config-validation';

const STRONG = 'a'.repeat(48);
const STRONG2 = 'b'.repeat(48);

describe('validateConfig', () => {
  it('throws when JWT_SECRET is missing', () => {
    expect(() =>
      validateConfig({ NODE_ENV: 'development', JWT_REFRESH_SECRET: STRONG }),
    ).toThrow(/JWT_SECRET is not set/);
  });

  it('throws when JWT_REFRESH_SECRET is missing', () => {
    expect(() =>
      validateConfig({ NODE_ENV: 'development', JWT_SECRET: STRONG }),
    ).toThrow(/JWT_REFRESH_SECRET is not set/);
  });

  it.each(['dev-secret-change-in-production', 'change-me', 'placeholder', 'your-secret'])(
    'rejects placeholder secret %s even in development',
    (placeholder) => {
      expect(() =>
        validateConfig({
          NODE_ENV: 'development',
          JWT_SECRET: placeholder,
          JWT_REFRESH_SECRET: STRONG,
        }),
      ).toThrow(/contains a placeholder value/);
    },
  );

  it('rejects placeholder refresh secret even in development', () => {
    expect(() =>
      validateConfig({
        NODE_ENV: 'development',
        JWT_SECRET: STRONG,
        JWT_REFRESH_SECRET: 'dev-refresh-secret-change-in-production',
      }),
    ).toThrow(/contains a placeholder value/);
  });

  it('accepts a short non-placeholder secret in development', () => {
    expect(() =>
      validateConfig({
        NODE_ENV: 'development',
        JWT_SECRET: 'local-only',
        JWT_REFRESH_SECRET: 'local-only-refresh',
      }),
    ).not.toThrow();
  });

  it('rejects a short secret in production', () => {
    expect(() =>
      validateConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'short',
        JWT_REFRESH_SECRET: STRONG2,
      }),
    ).toThrow(/too short/);
  });

  it('rejects a short refresh secret in staging', () => {
    expect(() =>
      validateConfig({
        NODE_ENV: 'staging',
        JWT_SECRET: STRONG,
        JWT_REFRESH_SECRET: 'short-refresh',
      }),
    ).toThrow(/too short/);
  });

  it('accepts strong secrets in production', () => {
    expect(() =>
      validateConfig({
        NODE_ENV: 'production',
        JWT_SECRET: STRONG,
        JWT_REFRESH_SECRET: STRONG2,
      }),
    ).not.toThrow();
  });
});
