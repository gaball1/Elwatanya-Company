const PLACEHOLDER_PATTERNS = [
  'change-me',
  'dev-secret',
  'placeholder',
  'your-secret',
];

export function validateConfig(config: Record<string, any>) {
  const nodeEnv = config.NODE_ENV || 'development';
  const secrets = [
    { key: 'JWT_SECRET', value: config.JWT_SECRET },
    { key: 'JWT_REFRESH_SECRET', value: config.JWT_REFRESH_SECRET },
  ];

  for (const { key, value } of secrets) {
    if (!value || typeof value !== 'string') {
      throw new Error(`${key} is not set in environment variables`);
    }

    if (nodeEnv === 'production') {
      const isPlaceholder = PLACEHOLDER_PATTERNS.some((pattern) =>
        value.toLowerCase().includes(pattern),
      );
      if (isPlaceholder) {
        throw new Error(
          `${key} contains a placeholder value '${value}'. Generate a secure random secret for production.`,
        );
      }

      if (value.length < 32) {
        throw new Error(
          `${key} is too short (${value.length} chars). Minimum 32 characters required in production.`,
        );
      }
    }
  }

  return config;
}
