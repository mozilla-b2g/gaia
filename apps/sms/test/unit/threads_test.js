/*global Threads */

'use strict';

requireApp('sms/js/threads.js');

suite('Threads', function() {
  suiteSetup(function() {
    window.location.hash = '';
  });

  teardown(function() {
    Threads.clear();
  });

  suite('Collection', function() {
    test('is like a Map', function() {
      assert.ok(Threads);
      assert.isFunction(Threads.set);
      assert.isFunction(Threads.get);
      assert.isFunction(Threads.has);
      assert.isFunction(Threads.delete);
      assert.isFunction(Threads.clear);
      assert.isNumber(Threads.size);
      assert.equal(Threads.currentId, null);
      assert.equal(Threads.active, null);
    });

    test('Threads.set(key, val)', function() {
      Threads.set(1, {});
      assert.deepEqual(Threads.get(1), { messages: [] });
      assert.equal(Threads.size, 1);
    });

    test('Threads.get(key)', function() {
      Threads.set(1, {});
      var value = Threads.get(1);
      assert.ok(Array.isArray(value.messages));
      assert.equal(Threads.size, 1);
    });

    test('Threads.has(key)', function() {
      assert.equal(Threads.has(1), false);
      Threads.set(1, {});
      assert.equal(Threads.has(1), true);
    });

    test('Threads.delete()', function() {
      Threads.set(1, {});
      assert.equal(Threads.has(1), true);
      assert.equal(Threads.size, 1);
      Threads.delete(1);
      assert.equal(Threads.has(1), false);
      assert.equal(Threads.size, 0);
    });
  });

  suite('Operational', function() {
    setup(function() {
      window.location.hash = '';
    });

    teardown(function() {
      Threads.delete(5);
    });

    test('Threads.currentId', function() {
      window.location.hash = '#thread=5';
      assert.equal(Threads.currentId, 5);

      window.location.hash = '';
      assert.equal(Threads.currentId, null);
    });

    test('Threads.active', function() {
      Threads.set(5, { a: 'alpha' });

      window.location.hash = '#thread=5';
      assert.deepEqual(Threads.active, {
        a: 'alpha',
        messages: []
      });

      window.location.hash = '';
      assert.equal(Threads.active, null);
    });
  });
});
