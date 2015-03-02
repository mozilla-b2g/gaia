'use strict';

suite('ObservableArray', function() {
  var methods = [
    'forEach', 'push', 'pop', 'splice', 'set', 'get', 'reset'
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

  suite('check actions', function() {
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
        var eventObj = calls[calls.length - 1][0];
        var expectedEventObj = args[0];

        assert.equal(eventObj.type, event);
        assert.deepEqual(eventObj.detail, expectedEventObj.detail);
      });
    }

    function checkLength(newValue, oldValue) {
      test('length changes correctly', function() {
        if (newValue !== oldValue) {
          assert.deepEqual(this.spies.length.args[0], [newValue, oldValue]);
        } else {
          assert.isTrue(this.spies.length.notCalled);
        }
      });
    }

    function resetSpies(environment) {
      events.forEach(function(event) {
        this.spies[event].reset();
      }, environment);
      environment.spies.length.reset();
    }

    setup(function() {
      this.spies = {};
      events.forEach(function(event) {
        this.spies[event] = this.sinon.spy();
        this.observable.addEventListener(event, this.spies[event]);
      }, this);
      this.spies.length = this.sinon.spy();
      this.observable.observe('length', this.spies.length);
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
          items: [methods[methods.length - 1]]
        }
      });
      checkLength(methods.length - 1, methods.length);
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
      checkLength(methods.length + 1, methods.length);
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
          items: methods.slice(1, 3)
        }
      });
      checkLength(methods.length - 2, methods.length);
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
          items: methods.slice(1, 3)
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
      checkLength(methods.length, methods.length);
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
      checkLength(methods.length + 1, methods.length);
      test('modifies array', function() {
        var expected = methods.slice();
        expected.splice(2, 0, 2);
        assert.deepEqual(this.array, expected);
      });
    });

    suite('set(6, true)', function() {
      setup(function() {
        this.observable.set(6, true);
      });
      checkSpies({ replace: 1 });
      checkArgs('replace', {
        type: 'replace',
        detail: {
          index: 6,
          oldValue: methods[6],
          newValue: true
        }
      });
      checkLength(methods.length, methods.length);
      test('modifies array', function() {
        var expected = methods.slice();
        expected[6] = true;
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
      checkLength(testArray.length, methods.length);
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

    suite('unregister event listeners', function() {
      setup(function() {
        // bind some listeners
        this.spies = [this.sinon.spy(), this.sinon.spy()];
        events.forEach(function(event) {
          this.observable.addEventListener(event, this.spies[0]);
          this.observable.addEventListener(event, this.spies[1]);
        }, this);
      });
      test('(property, handler)', function() {
        // remove handler for property
        this.observable.removeEventListener('insert', this.spies[0]);
        // insert, only other handler should be called
        this.observable.push({});
        assert.equal(this.spies[0].callCount, 0);
        assert.equal(this.spies[1].callCount, 1);
        // remove, both handlers should be called
        this.observable.pop();
        assert.equal(this.spies[0].callCount, 1);
        assert.equal(this.spies[1].callCount, 2);
      });
    });
  });
});
