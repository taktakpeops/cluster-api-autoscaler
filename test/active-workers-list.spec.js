'use strict';

const assert = require('assert');

const {
  ActiveWorker,
} = require('../src/active-worker');

const {
  ActiveWorkersList,
} = require('../src/active-workers-list');

const {
  wait,
} = require('../src/utils');

describe('test ActiveWorkerList class', () => {
  it('creates a new ActiveWorker instance when calling `add`', () => {
    const ptr = new ActiveWorkersList();

    const r = ptr.add('toto');
    assert.strictEqual(r instanceof ActiveWorker, true);
  });

  it('retrieve the list of warm workers for the last 1000 ms', async () => {
    const ptr = new ActiveWorkersList([
      { type: 'cpu', limit: 50 },
    ]);

    await Promise.all([ptr.add('tutu'), ptr.add('toto'), ptr.add('titi')].map(async (worker, index) => {
      await wait(200);
      worker.records.push({ type: 'cpu', value: (index % 2) ? 40 : 80, time: Date.now() });
    }));

    const warmWorkers = ptr.getWarmWorkers('cpu', 1000);

    assert.strictEqual(warmWorkers.length, 2);
    assert.deepStrictEqual(warmWorkers.find(x => x.name === 'tutu'), { name: 'tutu' });
    assert.deepStrictEqual(warmWorkers.find(x => x.name === 'titi'), { name: 'titi' });
  });
});
