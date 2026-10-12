import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

function loadEnv(file) {
  if (!existsSync(file)) return {};
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const env = loadEnv('.env');
const authEnv = {
  domain: env.AUTH0_DOMAIN ?? '',
  clientId: env.AUTH0_CLIENT_ID ?? '',
  audience: env.AUTH0_AUDIENCE ?? '',
};

mkdirSync('src/environments', { recursive: true });
writeFileSync(
  'src/environments/auth-env.ts',
  `// Generated from .env. Do not commit.\nexport const authEnv = ${JSON.stringify(authEnv, null, 2)};\n`,
);
