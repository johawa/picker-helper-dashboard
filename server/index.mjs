import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import { boxesFor, deletionDocs, summarize } from './sessions.mjs';

loadEnv(fileURLToPath(new URL('../.env', import.meta.url)));

const port = Number(process.env.PORT || 4301);
const couchUrl = (process.env.COUCHDB_URL || 'http://127.0.0.1:5984').replace(/\/$/, '');
const couchUser = process.env.COUCHDB_USER || '';
const couchPassword = process.env.COUCHDB_PASSWORD || '';
const auth0Domain = (process.env.AUTH0_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const audience = process.env.AUTH0_AUDIENCE || '';
const emailClaim = 'https://picker-dashboard/email';
const databases = ['sessions', 'pickings'];

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/sessions', requireUser, async (_req, res) => {
  try {
    const [sessions, pickings] = await Promise.all([allDocs('sessions'), allDocs('pickings')]);
    res.json({ sessions: summarize(sessions, pickings) });
  } catch (error) {
    sendCouchError(res, error);
  }
});

app.get('/api/sessions/detail', requireUser, async (req, res) => {
  const id = singleQuery(req.query.id);
  if (!id) {
    res.status(400).json({ error: 'Choose a session.' });
    return;
  }
  try {
    const [sessions, pickings] = await Promise.all([allDocs('sessions'), allDocs('pickings')]);
    const summary = summarize(sessions, pickings).find((row) => row.id === id);
    if (!summary) {
      res.status(404).json({ error: 'That session is not in the database.' });
      return;
    }
    res.json({ session: { ...summary, boxes: boxesFor(pickings, id) } });
  } catch (error) {
    sendCouchError(res, error);
  }
});

app.delete('/api/sessions', requireUser, async (req, res) => {
  const id = singleQuery(req.query.id);
  if (!id || id.startsWith('_')) {
    res.status(400).json({ error: 'Choose a session.' });
    return;
  }
  try {
    const [sessions, pickings] = await Promise.all([allDocs('sessions'), allDocs('pickings')]);
    const plan = deletionDocs(sessions, pickings, id);
    if (plan.sessions.length === 0 && plan.pickings.length === 0) {
      res.status(404).json({ error: 'That session is not in the database.' });
      return;
    }
    await bulkDelete('pickings', plan.pickings);
    await bulkDelete('sessions', plan.sessions);
    res.json({ deleted: id, boxes: plan.pickings.length });
  } catch (error) {
    sendCouchError(res, error);
  }
});

const dist = join(process.cwd(), 'dist', 'picker-dashboard', 'browser');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(join(dist, 'index.html'));
  });
}

app.use((error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const status = Number(error?.status) || 500;
  if (status === 401) {
    res.status(401).json({ error: 'Sign in again to continue.' });
    return;
  }
  res.status(status).json({ error: 'The dashboard could not complete that request.' });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Dashboard API listening on http://127.0.0.1:${port}`);
});

function requireUser(req, res, next) {
  if (!auth0Domain || !audience || auth0Domain.startsWith('your-tenant')) {
    next();
    return;
  }
  const check = auth({
    audience,
    issuerBaseURL: `https://${auth0Domain}/`,
  });
  check(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    const allowed = allowedEmails();
    if (allowed.size === 0) {
      res.status(403).json({ error: 'No allowed emails are configured.' });
      return;
    }
    const email = emailFrom(req.auth?.payload);
    if (!email || !allowed.has(email)) {
      res.status(403).json({ error: 'This account is not allowed to use the dashboard.' });
      return;
    }
    next();
  });
}

function allowedEmails() {
  return new Set(
    (process.env.ALLOWED_EMAILS || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function emailFrom(payload) {
  const candidates = [payload?.email, payload?.[emailClaim]];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim().toLowerCase();
  }
  return '';
}

function singleQuery(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim() : '';
}

async function allDocs(database) {
  assertDatabase(database);
  const response = await fetch(`${couchUrl}/${database}/_all_docs?include_docs=true`, {
    headers: couchHeaders(),
  });
  if (!response.ok) throw couchFailure(response.status);
  const body = await response.json();
  return (body.rows ?? []).map((row) => row.doc).filter(Boolean);
}

async function bulkDelete(database, docs) {
  if (docs.length === 0) return;
  assertDatabase(database);
  const response = await fetch(`${couchUrl}/${database}/_bulk_docs`, {
    method: 'POST',
    headers: { ...couchHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ docs }),
  });
  if (!response.ok) throw couchFailure(response.status);
  const body = await response.json();
  const failed = (Array.isArray(body) ? body : []).find((row) => row.error);
  if (failed) {
    const error = new Error(failed.reason || failed.error);
    error.status = failed.error === 'conflict' ? 409 : 502;
    throw error;
  }
}

function couchHeaders() {
  if (!couchUser || !couchPassword) {
    const error = new Error('CouchDB is not configured.');
    error.status = 503;
    throw error;
  }
  return {
    authorization: `Basic ${Buffer.from(`${couchUser}:${couchPassword}`).toString('base64')}`,
    accept: 'application/json',
  };
}

function assertDatabase(database) {
  if (!databases.includes(database)) {
    const error = new Error('Unknown database.');
    error.status = 404;
    throw error;
  }
}

function couchFailure(status) {
  const error = new Error(status === 401 ? 'CouchDB refused the dashboard login.' : 'CouchDB is not reachable.');
  error.status = status === 401 ? 502 : 502;
  return error;
}

function sendCouchError(res, error) {
  const status = Number(error?.status) || 502;
  const message =
    status === 503
      ? error.message
      : status === 409
        ? 'That session changed while it was being deleted. Refresh and try again.'
        : 'The database could not be reached.';
  res.status(status).json({ error: message });
}

function loadEnv(file) {
  if (!existsSync(file)) return;
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
    if (process.env[key] == null) process.env[key] = value;
  }
}
