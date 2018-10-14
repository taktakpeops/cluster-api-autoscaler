'use strict';

const assert = require('assert');
const sinon = require('sinon');

const {
  ActiveWorker,
} = require('../src/active-worker');

const {
  wait,
} = require('../src/utils');

describe('test ActiveWorker class', () => {
  let ptr;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    ptr = new ActiveWorker('somename', [{
      type: 'cpu',
      limit: 50,
    }]);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('the hasScaled method', async () => {
    const spy = sandbox.spy(ptr, 'cleanRecords');

    ptr.hasScaled();
    assert.strictEqual(ptr.scaled, true);

    await wait(1000);

    assert.strictEqual(spy.calledOnce, true);
    assert.strictEqual(ptr.scaled, false);
  });

  it('the onNewMetric method with scaled set to `false` and with an increase in the metrics', done => {
    ptr.on('increase-cpu', evt => {
      assert.strictEqual(evt.value, 55);
      assert.strictEqual(ptr.records.length, 1);

      done();
    });
    ptr.onNewMetric({
      type: 'cpu',
      value: 55,
      time: Date.now(),
    });
  });

  it('the onNewMetric method with scaled set to `false` and with an decrease in the metrics', done => {
    ptr.on('decrease-cpu', evt => {
      assert.strictEqual(evt.value, 45);
      assert.strictEqual(ptr.records.length, 1);

      done();
    });
    ptr.onNewMetric({
      type: 'cpu',
      value: 45,
      time: Date.now(),
    });
  });

  it('the onNewMetric method with scaled set to `true`', () => {
    const spy = sandbox.spy(ptr, 'emit');
    ptr.hasScaled();
    ptr.onNewMetric({
      type: 'cpu',
      value: 45,
      time: Date.now(),
    });

    assert.notStrictEqual(spy.calledOnce, true);
  });

  it('the getWorkerHistory method with default limit', () => {
    // create records
    [50, 40, 55].forEach(value => {
      ptr.onNewMetric({
        type: 'cpu',
        value,
        time: Date.now(),
      });
    });

    const history = ptr.getWorkerHistory('cpu');

    assert.strictEqual(history.length, 3);
    assert.strictEqual(history.every(h => h.type === 'cpu'), true);
  });

  it('the getWorkerHistory method with custom limit (500ms from now)', () => {
    const now = Date.now();
    // create records
    [50, 40, 55, 60, 70, 40].forEach((value, idx) => {
      ptr.onNewMetric({
        type: 'cpu',
        value,
        time: now - (150 * idx),
      });
    });

    const history = ptr.getWorkerHistory('cpu', 500);

    assert.strictEqual(history.length, 4);
    assert.strictEqual(history.every(h => h.type === 'cpu'), true);
  });

  it('the getWorkerRecordsInPercentAvg with default limit', () => {
    [50, 40, 55, 60, 70, 40].forEach(value => {
      ptr.onNewMetric({
        type: 'cpu',
        value,
        time: Date.now(),
      });
    });

    const avg = ptr.getWorkerRecordsInPercentAvg('cpu');

    assert.strictEqual(avg, 52.5);
  });

  it('the getWorkerRecordsInPercentAvg with custom limit', () => {
    const now = Date.now();

    [50, 40, 55, 60, 70, 40].forEach((value, idx) => {
      ptr.onNewMetric({
        type: 'cpu',
        value,
        time: now - (150 * idx),
      });
    });

    const avg = ptr.getWorkerRecordsInPercentAvg('cpu', 500);

    assert.strictEqual(avg, 51.25);
  });
});
