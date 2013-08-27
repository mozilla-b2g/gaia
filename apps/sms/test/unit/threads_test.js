'use strict';

requireApp('sms/js/threads.js');

suite('Threads', function() {
  suiteSetup(function() {
    window.location.hash = '';
  });

  var defaults = {
    deleteAll: false,
    selectAll: false,
    messages: []
  };

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
      assert.deepEqual(Threads.get(1), defaults);
      assert.equal(Threads.size, 1);
    });

    test('Threads.set(key, val) returns thread', function() {
      assert.deepEqual(Threads.set(1, {}), defaults);
      assert.equal(Threads.size, 1);
    });

    test('Threads.set(key, val) updates existing thread', function() {
      var thread = Threads.set(1, {});

      assert.deepEqual(Threads.set(1, { foo: 'bar' }), thread);
      assert.equal(Threads.size, 1);
    });

    test('Threads.set(key) no value, creates default', function() {
      var thread = Threads.set(1, {});

      assert.deepEqual(Threads.set(1, { foo: 'bar' }), thread);
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

  suite('Threads.List', function() {
    test('selectAll', function() {
      assert.isFalse(Threads.List.selectAll);
    });
    test('deleteAll', function() {
      assert.isFalse(Threads.List.deleteAll);
    });
    test('deleting', function() {
      assert.deepEqual(Threads.List.deleting, []);
    });
    test('tracking', function() {
      assert.deepEqual(Threads.List.tracking, {});
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
        selectAll: false,
        deleteAll: false,
        messages: []
      });

      window.location.hash = '';
      assert.equal(Threads.active, null);
    });

    test('Threads.get(#).messages', function() {
      var thread;

      Threads.set(6, { b: 'beta' });

      thread = Threads.get(6);

      assert.deepEqual(thread, {
        b: 'beta',
        selectAll: false,
        deleteAll: false,
        messages: []
      });

      Threads.get(6).messages.push({id: 1});

      assert.deepEqual(thread, {
        b: 'beta',
        selectAll: false,
        deleteAll: false,
        messages: [{id: 1}]
      });

      // Attempt to add a duplicate
      Threads.get(6).messages.push({id: 1});

      assert.deepEqual(thread, {
        b: 'beta',
        selectAll: false,
        deleteAll: false,
        messages: [{id: 1}]
      });

      // Attempt to add a new
      Threads.get(6).messages.push({id: 2});

      assert.deepEqual(thread, {
        b: 'beta',
        selectAll: false,
        deleteAll: false,
        messages: [{id: 1}, {id: 2}]
      });
    });
  });
});
