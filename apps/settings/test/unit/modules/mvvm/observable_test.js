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
      assert.equal(typeof observable.unobserve, 'function');
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
      testRequire(['modules/base/module', 'modules/mvvm/observable'],
        (function(Module, Observable) {
          var NewObservable = Module.create(function() {
            this.super(Observable).call(this);
          }).extend(Observable);
          Object.keys(template).forEach(function (key) {
            Observable.defineObservableProperty(NewObservable.prototype, key, {
              value: template[key]
            });
          });
          this.Observable = NewObservable;
          done();
      }).bind(this));
    });

    executeTest();
  });

  suite('Read-only property', function() {
    var props = ['prop1', 'prop2'];
    var defaultPropValues = ['value1', 'value2'];

    suiteSetup(function(done) {
      testRequire(['modules/base/module', 'modules/mvvm/observable'],
        (function(Module, Observable) {
          var NewObservable = Module.create(function() {
            this.super(Observable).call(this);
          }).extend(Observable);
          Observable.defineObservableProperty(
            NewObservable.prototype, props[0], {
              readonly: true,
              value: defaultPropValues[0]
          });
          Observable.defineObservableProperty(
            NewObservable.prototype, props[1], {
              readonly: true,
              value: defaultPropValues[1]
          });
          this.Observable = NewObservable;
          done();
      }).bind(this));
    });

    test('unable to set the property', function() {
      var observable = this.Observable();
      assert.throw(function() {
        observable[props[0]] = 300;
      }, TypeError, 'setting a property that has only a getter');
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

  suite('Dependency property', function() {
    var props = ['prop1', 'prop2'];
    var defaultPropValues = [2, 3];
    var dependencyProps = ['dprop1', 'dprop2', 'dprop3'];

    suiteSetup(function(done) {
      testRequire(['modules/base/module', 'modules/mvvm/observable'],
        (function(Module, Observable) {
          var NewObservable = Module.create(function() {
            this.super(Observable).call(this);
          }).extend(Observable);
          Observable.defineObservableProperty(
            NewObservable.prototype, props[0], {
              value: defaultPropValues[0]
          });
          Observable.defineObservableProperty(
            NewObservable.prototype, props[1], {
              value: defaultPropValues[1]
          });
          Observable.defineObservableProperty(
            NewObservable.prototype, dependencyProps[0], {
              dependency: props,
              get: function() {
                return this[props[0]] + this[props[1]];
              }
          });
          Observable.defineObservableProperty(
            NewObservable.prototype, dependencyProps[1], {
              dependency: [dependencyProps[0]],
              get: function() {
                return this[dependencyProps[0]];
              }
          });
          Observable.defineObservableProperty(
            NewObservable.prototype, dependencyProps[2], {
              dependency: [dependencyProps[0]],
              get: function() {
                return this[dependencyProps[0]];
              }
          });
          this.Observable = NewObservable;
          done();
      }).bind(this));
    });

    test('The property responds to the dependent property changes correctly',
      function(done) {
        var newPropValue = 100;
        var observable = this.Observable();
        observable.observe(dependencyProps[0], function(newValue, oldValue) {
          assert.equal(oldValue, defaultPropValues[0] + defaultPropValues[1]);
          assert.equal(newValue, defaultPropValues[0] + newPropValue);
          done();
        });
        observable[props[1]] = newPropValue;
    });

    test('The property responds to the dependency property changes correctly',
      function(done) {
        var newPropValue = 100;
        var observable = this.Observable();
        var changeCount = 0;

        observable.observe(dependencyProps[1], function(newValue, oldValue) {
          assert.equal(oldValue, defaultPropValues[0] + defaultPropValues[1]);
          assert.equal(newValue, defaultPropValues[0] + newPropValue);
          changeCount++;
          if (changeCount == 2) {
            done();
          }
        });
        observable.observe(dependencyProps[2], function(newValue, oldValue) {
          assert.equal(oldValue, defaultPropValues[0] + defaultPropValues[1]);
          assert.equal(newValue, defaultPropValues[0] + newPropValue);
          changeCount++;
          if (changeCount == 2) {
            done();
          }
        });
        observable[props[1]] = newPropValue;
    });
  });

  suite('Extendibility', function() {
    var props = ['prop1', 'prop2'];
    var defaultPropValues = [2, 3];
    var dependencyProps = ['dprop1', 'dprop2', 'dprop3'];

    suiteSetup(function(done) {
      testRequire(['modules/base/module', 'modules/mvvm/observable'],
        (function(Module, Observable) {
          var NewObservable = Module.create(function() {
            this.super(Observable).call(this);
          }).extend(Observable);
          Observable.defineObservableProperty(
            NewObservable.prototype, props[0], {
              value: defaultPropValues[0]
          });
          Observable.defineObservableProperty(
            NewObservable.prototype, props[1], {
              value: defaultPropValues[1]
          });
          Observable.defineObservableProperty(
            NewObservable.prototype, dependencyProps[0], {
              dependency: props,
              get: function() {
                return this[props[0]] + this[props[1]];
              }
          });
          Observable.defineObservableProperty(
            NewObservable.prototype, dependencyProps[1], {
              dependency: [dependencyProps[0]],
              get: function() {
                return this[dependencyProps[0]];
              }
          });
          Observable.defineObservableProperty(
            NewObservable.prototype, dependencyProps[2], {
              dependency: [dependencyProps[0]],
              get: function() {
                return this[dependencyProps[0]];
              }
          });

          var NewObservable2 = Module.create(function() {
            this.super(NewObservable).call(this);
          }).extend(NewObservable);
          this.Observable = NewObservable2;
          done();
      }).bind(this));
    });

    test('The property responds to the dependent property changes correctly',
      function(done) {
        var newPropValue = 100;
        var observable = this.Observable();
        observable.observe(dependencyProps[0], function(newValue, oldValue) {
          assert.equal(oldValue, defaultPropValues[0] + defaultPropValues[1]);
          assert.equal(newValue, defaultPropValues[0] + newPropValue);
          done();
        });
        observable[props[1]] = newPropValue;
    });

    test('The property responds to the dependency property changes correctly',
      function(done) {
        var newPropValue = 100;
        var observable = this.Observable();
        var changeCount = 0;

        observable.observe(dependencyProps[1], function(newValue, oldValue) {
          assert.equal(oldValue, defaultPropValues[0] + defaultPropValues[1]);
          assert.equal(newValue, defaultPropValues[0] + newPropValue);
          changeCount++;
          if (changeCount == 2) {
            done();
          }
        });
        observable.observe(dependencyProps[2], function(newValue, oldValue) {
          assert.equal(oldValue, defaultPropValues[0] + defaultPropValues[1]);
          assert.equal(newValue, defaultPropValues[0] + newPropValue);
          changeCount++;
          if (changeCount == 2) {
            done();
          }
        });
        observable[props[1]] = newPropValue;
    });
  });
});
