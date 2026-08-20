const PLACEHOLDER_PATTERNS = [
  'change-me',
  'change_me',
  'changeme',
  'dev-secret',
  'dev-refresh-secret',
  'secret-change-in-production',
  'placeholder',
  'your-secret',
  'your_secret',
  'your-refresh-secret',
  'example',
  'xxx',
  'dummy',
  'test-secret',
];

// Environments that must never run with placeholder/weak secrets.
const STRICT_ENVS = new Set(['production', 'prod', 'staging', 'qa', 'uat']);

export function validateConfig(config: Record<string, any>) {
  const nodeEnv = String(config.NODE_ENV || 'development').toLowerCase();
  const secrets = [
    { key: 'JWT_SECRET', value: config.JWT_SECRET },
    { key: 'JWT_REFRESH_SECRET', value: config.JWT_REFRESH_SECRET },
  ];

  for (const { key, value } of secrets) {
    if (!value || typeof value !== 'string') {
      throw new Error(`${key} is not set in environment variables`);
    }

    const normalized = value.toLowerCase();
    const isPlaceholder = PLACEHOLDER_PATTERNS.some((pattern) =>
      normalized.includes(pattern),
    );

    // Placeholders are never acceptable — not even in development.
    if (isPlaceholder) {
      throw new Error(
        `${key} contains a placeholder value '${value}'. Generate a secure random secret.`,
      );
    }

    // Strong enforcement for any non-local environment.
    if (STRICT_ENVS.has(nodeEnv) && value.length < 32) {
      throw new Error(
        `${key} is too short (${value.length} chars). Minimum 32 characters required.`,
      );
    }
  }

  return config;
}
