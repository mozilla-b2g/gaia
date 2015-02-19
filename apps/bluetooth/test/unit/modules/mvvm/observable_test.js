'use strict';

suite('Observable', function() {
  suiteSetup(function(done) {
    testRequire(['modules/mvvm/observable'], (function(Observable) {
      this.Observable = Observable;
      done();
    }).bind(this));
  });

  test('shape: Observable({}).observe is a function', function() {
    var observable = this.Observable({});
    assert.equal(typeof observable.observe, 'function');
  });
  test('shape: Observable({}).unobserve is a function', function() {
    var observable = this.Observable({});
    assert.equal(typeof observable.observe, 'function');
  });

  suite('Creates observable properties', function() {
    var template = {
      testBoolean: true,
      testNumber: 10,
      testString: 'test',
      'test object': {}
      // currently disabled - we don't handle functions
      // testFunction: function() {}
    };
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
});
