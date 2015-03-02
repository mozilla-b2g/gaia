'use strict';

suite('Observable', function() {
  var template = {
    testBoolean: true,
    testNumber: 10,
    testString: 'test',
    'test object': {}
    // currently disabled - we don't handle functions
    // testFunction: function() {}
  };

  function executeTest() {
    test('shape: Observable({}).observe is a function', function() {
      var observable = this.Observable({});
      assert.equal(typeof observable.observe, 'function');
    });
    test('shape: Observable({}).unobserve is a function', function() {
      var observable = this.Observable({});
      assert.equal(typeof observable.observe, 'function');
    });

    suite('Creates observable properties', function() {
      var props = Object.keys(template);
      setup(function() {
        this.observable = this.Observable(template);
      });

      // some tests for each property
      props.forEach(function(prop) {
        test('prop: "' + prop + '" copied value', function() {
          assert.equal(this.observable[prop], template[prop]);
        });

        // test some stuff for observing
        suite('prop: "' + prop + '" observe', function() {
          setup(function() {
            this.spy = this.sinon.spy();
            this.observable.observe(prop, this.spy);
          });
          test('does not generate any callbacks when attaching', function() {
            assert.isFalse(this.spy.called);
          });

          test('does not notify when set to same value', function() {
            this.observable[prop] = template[prop];
            assert.isFalse(this.spy.called);
          });

          test('notifies when set to new value', function() {
            this.newValue = {};
            this.observable[prop] = this.newValue;
            assert.isTrue(this.spy.calledWith(this.newValue, template[prop]));
          });
        });
      });

      suite('unobserve', function() {
        setup(function() {
          // bind some listeners
          this.spies = [this.sinon.spy(), this.sinon.spy()];
          props.forEach(function(prop) {
            this.observable.observe(prop, this.spies[0]);
            this.observable.observe(prop, this.spies[1]);
          }, this);
        });
        test('(property, handler)', function() {
          // remove handler for property
          this.observable.unobserve('testNumber', this.spies[0]);
          // change property - only other handler should be called
          this.observable.testNumber = {};
          assert.equal(this.spies[0].callCount, 0);
          assert.equal(this.spies[1].callCount, 1);
          // change a different property, both handlers should be called
          this.observable.testString = {};
          assert.equal(this.spies[0].callCount, 1);
          assert.equal(this.spies[1].callCount, 2);
        });
        test('(handler)', function() {
          // remove handler for all properties
          this.observable.unobserve(this.spies[0]);
          // change property - only other handler should be called
          this.observable.testNumber = {};
          assert.equal(this.spies[0].callCount, 0);
          assert.equal(this.spies[1].callCount, 1);
          // change a different property, only other handler should be called
          this.observable.testString = {};
          assert.equal(this.spies[0].callCount, 0);
          assert.equal(this.spies[1].callCount, 2);
        });
        test('(property)', function() {
          // remove handler for all properties
          this.observable.unobserve('testNumber');
          // change property - neither handler should be called
          this.observable.testNumber = {};
          assert.equal(this.spies[0].callCount, 0);
          assert.equal(this.spies[1].callCount, 0);
          // change a different property, both handlers should be called
          this.observable.testString = {};
          assert.equal(this.spies[0].callCount, 1);
          assert.equal(this.spies[1].callCount, 1);
        });
      });
    });
  }

  suite('Object form', function() {
    suiteSetup(function(done) {
      testRequire(['modules/mvvm/observable'], (function(Observable) {
        this.Observable = Observable;
        done();
      }).bind(this));
    });

    executeTest();
  });

  suite('Prototype form', function() {
    suiteSetup(function(done) {
      testRequire(['modules/mvvm/observable'], (function(Observable) {
        function NewObservable() {}
        Observable.augment(NewObservable.prototype);
        Object.keys(template).forEach(function (key) {
          Observable.defineObservableProperty(NewObservable.prototype, key, {
            value: template[key]
          });
        });
        this.Observable = function() {
          return new NewObservable();
        };
        done();
      }).bind(this));
    });

    executeTest();
  });

  suite('Read-only property', function() {
    var props = ['fakePropertyName', 'fakePropertyName2'];
    var defaultPropValues = ['fakeValue', 'fakeValue2'];

    suiteSetup(function(done) {
      testRequire(['modules/mvvm/observable'], (function(Observable) {
        function NewObservable() {}
        Observable.augment(NewObservable.prototype);
        Observable.defineObservableProperty(NewObservable.prototype, props[0], {
          permission: 'r',
          value: defaultPropValues[0]
        });
        Observable.defineObservableProperty(NewObservable.prototype, props[1], {
          permission: 'r',
          value: defaultPropValues[1]
        });
        this.Observable = function() {
          return new NewObservable();
        };
        done();
      }).bind(this));
    });

    test('unable to set the property', function() {
      var observable = this.Observable();
      function setReadOnlyProperty() {
        observable[props[0]] = 300;
      }
      assert.throw(setReadOnlyProperty, TypeError,
        'setting a property that has only a getter');
    });

    test('internal property exists', function() {
      var observable = this.Observable();
      assert.equal(observable['_' + props[0]], defaultPropValues[0]);
      assert.equal(observable['_' + props[1]], defaultPropValues[1]);
    });

    test('calls to the listeners when the internal property changes',
      function(done) {
        var newPropValue = 'newFakeValue';
        var observable = this.Observable();
        observable.observe(props[1], function(newValue, oldValue) {
          assert.equal(oldValue, defaultPropValues[1]);
          assert.equal(newValue, newPropValue);
          done();
        });
        observable['_' + props[1]] = newPropValue;
    });
  });
});
