import assert from 'node:assert/strict';
import test from 'node:test';
import { boxesFor, deletionDocs, summarize } from './sessions.mjs';

test('summarize counts boxes and keeps boxes whose session document is missing', () => {
  const rows = summarize(
    [
      {
        _id: 'morning',
        name: '06.10.2026 13:03',
        berry: 'strawberries',
        supervisor: 'Ada',
        defaultWeight: 4,
        syncedAt: '2026-10-06T10:00:00.000Z',
      },
    ],
    [
      { _id: 'a', sessionId: 'morning', amount: 4, date: '2026-10-06T09:00:00.000Z' },
      { _id: 'b', sessionId: 'morning', amount: 1.5, date: '2026-10-06T11:00:00.000Z' },
      { _id: 'c', sessionId: 'lost', pickerId: 5, amount: 0.8, date: '2026-10-07T08:00:00.000Z' },
      { _id: '_design/ignore', sessionId: 'morning', amount: 9 },
    ],
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 'lost');
  assert.equal(rows[0].orphan, true);
  assert.equal(rows[0].boxCount, 1);
  assert.equal(rows[1].name, '06.10.2026 13:03');
  assert.equal(rows[1].boxCount, 2);
  assert.equal(rows[1].totalKg, 5.5);
  assert.equal(rows[1].supervisor, 'Ada');
  assert.equal(rows[1].latestAt, '2026-10-06T11:00:00.000Z');
});

test('deletion marks the session and its boxes as CouchDB tombstones', () => {
  const plan = deletionDocs(
    [{ _id: 'morning', _rev: '1-s', name: 'Morning' }],
    [
      { _id: 'a', _rev: '1-a', sessionId: 'morning' },
      { _id: 'b', _rev: '1-b', sessionId: 'other' },
    ],
    'morning',
  );
  assert.deepEqual(plan.sessions, [{ _id: 'morning', _rev: '1-s', _deleted: true }]);
  assert.deepEqual(plan.pickings, [{ _id: 'a', _rev: '1-a', _deleted: true }]);
  assert.deepEqual(
    boxesFor(
      [
        { _id: 'a', sessionId: 'morning', pickerId: 5, amount: 4, date: '2026-10-06T09:00:00.000Z', timestamp: '09:00' },
        { _id: 'b', sessionId: 'morning', pickerId: 8, amount: 1.5, date: '2026-10-06T11:00:00.000Z', timestamp: '11:00' },
      ],
      'morning',
    ).map((box) => box.id),
    ['b', 'a'],
  );
});
