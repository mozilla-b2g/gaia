'use strict';

suite('ObservableArray', function() {
  var methods = [
    'forEach', 'push', 'pop', 'splice', 'set', 'get', 'reset', 'observe'
  ];

  suiteSetup(function(done) {
    testRequire(['modules/mvvm/observable_array'], (function(ObservableArray) {
      this.ObservableArray = ObservableArray;
      done();
    }).bind(this));
  });

  setup(function() {
    this.array = methods.slice();
    this.observable = this.ObservableArray(this.array);
  });

  suite('shape: ObservableArray(array)', function() {
    methods.forEach(function(method) {
      test('.' + method + ' is a function', function() {
        assert.equal(typeof this.observable[method], 'function');
      });
    });
    test('.length is a number', function() {
      assert.equal(typeof this.observable.length, 'number');
    });
    test('.array is the original array', function() {
      assert.equal(this.observable.array, this.array);
    });
  });

  test('get()', function() {
    assert.ok(this.array.length);
    for (var index = 0; index < this.array.length; index++) {
      assert.equal(this.observable.get(index), this.array[index],
        'index: ' + index);
    }
  });

  suite('observable actions', function() {
    var events = ['insert', 'remove', 'replace', 'reset'];

    function checkSpies(expected) {
      events.forEach(function(event) {
        var expectedCount = expected[event] || 0;
        test(event + ' called ' + expectedCount + ' times', function() {
          assert.equal(this.spies[event].args.length, expectedCount);
        });
      });
    }

    function checkArgs(event) {
      var args = [].slice.call(arguments, 1);
      test(event + ' called with correct arguments', function() {
        var calls = this.spies[event].args;
        assert.deepEqual(calls[calls.length - 1], args);
      });
    }

    function resetSpies(environment) {
      events.forEach(function(event) {
        this.spies[event].reset();
      }, environment);
    }

    setup(function() {
      this.spies = {};
      events.forEach(function(event) {
        this.spies[event] = this.sinon.spy();
        this.observable.addEventListener(event, this.spies[event]);
      }, this);
    });

    suite('pop()', function() {
      setup(function() {
        this.observable.pop();
      });
      checkSpies({ remove: 1 });
      checkArgs('remove', {
        type: 'remove',
        detail: {
          index: methods.length - 1,
          count: 1,
          items: ['observe']
        }
      });
      test('modifies array', function() {
        var expected = methods.slice();
        expected.pop();
        assert.deepEqual(this.array, expected);
      });
    });

    suite('push()', function() {
      setup(function() {
        this.observable.push('test');
      });
      checkSpies({ insert: 1 });
      checkArgs('insert', {
        type: 'insert',
        detail: {
          index: methods.length,
          count: 1,
          items: ['test']
        }
      });
      test('modifies array', function() {
        var expected = methods.slice();
        expected.push('test');
        assert.deepEqual(this.array, expected);
      });
    });

    suite('splice(1, 2)', function() {
      setup(function() {
        this.observable.splice(1, 2);
      });
      checkSpies({ remove: 1 });
      checkArgs('remove', {
        type: 'remove',
        detail: {
          index: 1,
          count: 2,
          items: ['push', 'pop']
        }
      });
      test('modifies array', function() {
        var expect = methods.slice();
        expect.splice(1, 2);
        assert.deepEqual(this.array, expect);
      });
    });

    suite('splice(1, 2, 3, 4)', function() {
      setup(function() {
        this.observable.splice(1, 2, 3, 4);
      });
      checkSpies({ remove: 1, insert: 1 });
      checkArgs('remove', {
        type: 'remove',
        detail: {
          index: 1,
          count: 2,
          items: ['push', 'pop']
        }
      });
      checkArgs('insert', {
        type: 'insert',
        detail: {
          index: 1,
          count: 2,
          items: [3, 4]
        }
      });
      test('modifies array', function() {
        var expected = methods.slice();
        expected.splice(1, 2, 3, 4);
        assert.deepEqual(this.array, expected);
      });
    });

    suite('splice(2, 0, 2)', function() {
      setup(function() {
        this.observable.splice(2, 0, 2);
      });
      checkSpies({ insert: 1 });
      checkArgs('insert', {
        type: 'insert',
        detail: {
          index: 2,
          count: 1,
          items: [2]
        }
      });
      test('modifies array', function() {
        var expected = methods.slice();
        expected.splice(2, 0, 2);
        assert.deepEqual(this.array, expected);
      });
    });

    suite('set(7, true)', function() {
      setup(function() {
        this.observable.set(7, true);
      });
      checkSpies({ replace: 1 });
      checkArgs('replace', {
        type: 'replace',
        detail: {
          index: 7,
          oldValue: methods[7],
          newValue: true
        }
      });
      test('modifies array', function() {
        var expected = methods.slice();
        expected[7] = true;
        assert.deepEqual(this.array, expected);
      });
    });

    suite('reset([])', function() {
      var testArray = [true, false];
      setup(function() {
        this.observable.reset(testArray);
      });
      checkSpies({ reset: 1 });
      checkArgs('reset', {
        type: 'reset',
        detail: {
          items: testArray
        }
      });
      test('changes array', function() {
        assert.equal(this.observable.array, testArray);
      });
    });

    suite('pop() on empty', function() {
      setup(function() {
        this.observable.reset([]);
        resetSpies(this);
        this.observable.pop();
      });
      // no events expected
      checkSpies({});
    });
  });
});
