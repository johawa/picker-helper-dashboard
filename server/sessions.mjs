export function sessionLabel(doc) {
  return typeof doc?.name === 'string' && doc.name.trim() ? doc.name.trim() : String(doc?._id ?? '');
}

export function roundKg(value) {
  return Math.round(value * 1000) / 1000;
}

function boxTime(doc) {
  const raw = doc?.date ?? doc?.timestamp;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

function visibleDocs(docs) {
  return docs.filter((doc) => doc && typeof doc._id === 'string' && !doc._id.startsWith('_') && !doc._deleted);
}

export function summarize(sessionDocs, pickingDocs) {
  const sessions = visibleDocs(sessionDocs);
  const pickings = visibleDocs(pickingDocs);
  const boxesBySession = new Map();
  for (const box of pickings) {
    if (typeof box.sessionId !== 'string' || !box.sessionId || box.sessionId.startsWith('_')) continue;
    const list = boxesBySession.get(box.sessionId) ?? [];
    list.push(box);
    boxesBySession.set(box.sessionId, list);
  }

  const known = new Set(sessions.map((doc) => doc._id));
  const rows = sessions.map((doc) => toSummary(doc, boxesBySession.get(doc._id) ?? [], false));

  for (const [sessionId, boxes] of boxesBySession) {
    if (known.has(sessionId)) continue;
    rows.push(
      toSummary(
        { _id: sessionId, name: sessionId },
        boxes,
        true,
      ),
    );
  }

  rows.sort((a, b) => (b.latestAt ?? '').localeCompare(a.latestAt ?? '') || a.name.localeCompare(b.name));
  return rows;
}

function toSummary(doc, boxes, orphan) {
  let total = 0;
  let latest = null;
  for (const box of boxes) {
    if (typeof box.amount === 'number' && Number.isFinite(box.amount)) total += box.amount;
    const time = boxTime(box);
    if (time != null && (latest == null || time > latest)) latest = time;
  }
  return {
    id: String(doc._id),
    name: sessionLabel(doc),
    berry: typeof doc.berry === 'string' && doc.berry.trim() ? doc.berry.trim() : null,
    supervisor: typeof doc.supervisor === 'string' && doc.supervisor.trim() ? doc.supervisor.trim() : null,
    defaultWeight: typeof doc.defaultWeight === 'number' && Number.isFinite(doc.defaultWeight) ? doc.defaultWeight : null,
    syncedAt: typeof doc.syncedAt === 'string' ? doc.syncedAt : null,
    boxCount: boxes.length,
    totalKg: roundKg(total),
    latestAt: latest == null ? null : new Date(latest).toISOString(),
    orphan,
  };
}

export function boxesFor(pickingDocs, sessionId) {
  return visibleDocs(pickingDocs)
    .filter((doc) => doc.sessionId === sessionId)
    .map((doc) => ({
      id: doc._id,
      pickerId: doc.pickerId,
      amount: doc.amount,
      timestamp: typeof doc.timestamp === 'string' ? doc.timestamp : '',
      date: doc.date ?? doc.timestamp ?? '',
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));
}

export function deletionDocs(sessionDocs, pickingDocs, sessionId) {
  const sessions = visibleDocs(sessionDocs).filter((doc) => doc._id === sessionId);
  const pickings = visibleDocs(pickingDocs).filter((doc) => doc.sessionId === sessionId);
  return {
    sessions: sessions.map(tombstone),
    pickings: pickings.map(tombstone),
  };
}

function tombstone(doc) {
  return { _id: doc._id, _rev: doc._rev, _deleted: true };
}
