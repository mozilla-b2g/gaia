'use strict';

requireApp('sms/test/unit/mock_map.js');
requireApp('sms/js/threads.js');

suite('Threads', function() {

  teardown(function() {
    Threads.clear();
    Map.history = [];
  });

  suiteTeardown(function() {
    Map = realMap;
  });

  suite('Collection', function() {
    teardown(function() {
      Map.history = [];
    });

    test('is like a Map', function() {
      assert.ok(Threads);
      assert.ok(Threads.set);
      assert.ok(Threads.get);
      assert.ok(Threads.has);
      assert.ok(Threads.delete);
      assert.ok(Threads.clear);
      assert.ok(Threads.size);
      assert.equal(Threads.currentId, null);
      assert.equal(Threads.active, null);
    });

    test('Threads.set(key, val)', function() {
      var record = {};
      var expect = [
        { called: 'has', calledWith: [1] },
        { called: 'set', calledWith: [1, { messages: [] }] }
      ];
      Threads.set(1, record);

      assert.equal(Map.history.length, 2);
      assert.deepEqual(Map.history, expect);
    });

    test('Threads.get(key)', function() {
      var record = {};

      Threads.set(1, record);

      var value = Threads.get(1);

      assert.equal(Map.history.length, 3);
      assert.equal(Map.history[0].called, 'has');
      assert.equal(Map.history[1].called, 'set');
      assert.equal(Map.history[2].called, 'get');

      assert.ok(Array.isArray(value.messages));
    });

    test('Threads.has(key)', function() {
      var record = {};

      Threads.set(1, record);

      assert.equal(Map.history.length, 2);
      assert.equal(Map.history[0].called, 'has');
      assert.equal(Map.history[1].called, 'set');

      assert.ok(Threads.has(1));
    });

    test('!Threads.has(key)', function() {
      assert.equal(Threads.has(2), false);
    });

    test('Threads.delete()', function() {
      var record = {};

      Threads.set(1, record);
      Threads.delete(1);

      assert.equal(Map.history.length, 3);
      assert.equal(Map.history[0].called, 'has');
      assert.equal(Map.history[1].called, 'set');
      assert.equal(Map.history[2].called, 'delete');
      assert.equal(Threads.size(), 0);
    });
  });

  suite('Operational', function() {
    teardown(function() {
      Map.history = [];
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
      assert.deepEqual(Threads.active, null);
    });
  });

});
