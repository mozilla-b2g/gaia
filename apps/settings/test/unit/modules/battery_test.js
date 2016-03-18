/* global MockBattery */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_getbattery.js');

suite('Battery', function() {
  var realGetBattery;
  var map = {
    'modules/battery': {
      'modules/navigator/battery': 'MockBattery'
    }
  };

  // Load a new Battery instance
  var loadBattery = function(callback) {
    var requireCtx = testRequire([], map, function() {});
    define('MockBattery', function() {
      return MockBattery.getBattery();
    });
    requireCtx(['modules/battery'], callback);
  };

  setup(function() {
    realGetBattery = navigator.getBattery;

    navigator.getBattery = MockBattery.getBattery;
  });

  teardown(function() {
    navigator.getBattery = realGetBattery;
  });

  suite('return correct values when initialized', function() {
    test('charging', function(done) {
      MockBattery._battery.charging = true;
      MockBattery._battery.level = 0.5;
      MockBattery._battery.chargingTime = 13337;
      MockBattery._battery.dischargingTime = Infinity;

      loadBattery(function(Battery) {
        assert.equal(Battery.level, 50);
        assert.equal(Battery.state, 'charging');
        assert.equal(Battery.chargingTime, 13337);
        assert.equal(Battery.dischargingTime, Infinity);
        done();
      });
    });

    test('charged', function(done) {
      MockBattery._battery.charging = true;
      MockBattery._battery.level = 1;

      loadBattery(function(Battery) {
        assert.equal(Battery.level, 100);
        assert.equal(Battery.state, 'charged');
        done();
      });
    });

    test('unplugged', function(done) {
      MockBattery._battery.charging = false;
      MockBattery._battery.level = 1;

      loadBattery(function(Battery) {
        assert.equal(Battery.level, 100);
        assert.equal(Battery.state, 'unplugged');
        done();
      });
    });
  });

  suite('status changes', function() {
    test('should reflect level changes', function(done) {
      this.sinon.spy(MockBattery._battery, 'addEventListener');
      MockBattery._battery.level = 0.5;

      loadBattery(function(Battery) {
        assert.equal(Battery.level, 50);
        // change the level
        MockBattery._battery.level = 0.51;
        // emit the event
        MockBattery._battery.addEventListener.args.some(function(arg) {
          if (arg[0] === 'levelchange') {
            arg[1].call();
            return true;
          }
        });
        assert.equal(Battery.level, 51);
        MockBattery._battery.addEventListener.restore();
        done();
      });
    });

    test('should reflect state changes', function(done) {
      this.sinon.spy(MockBattery._battery, 'addEventListener');
      MockBattery._battery.charging = false;
      MockBattery._battery.level = 1;

      loadBattery(function(Battery) {
        assert.equal(Battery.state, 'unplugged');
        // change the state
        MockBattery._battery.charging = true;
        // emit the event
        MockBattery._battery.addEventListener.args.some(function(arg) {
          if (arg[0] === 'chargingchange') {
            arg[1].call();
            return true;
          }
        });
        assert.equal(Battery.state, 'charged');
        MockBattery._battery.addEventListener.restore();
        done();
      });
    });

    test('should reflect chargingTime changes', function(done) {
      this.sinon.spy(MockBattery._battery, 'addEventListener');
      MockBattery._battery.charging = true;
      MockBattery._battery.level = 10;
      MockBattery._battery.chargingTime = 13337;

      loadBattery(function(Battery) {
        // change the state
        MockBattery._battery.chargingTime = 13337 - 1337;
        // emit the event
        MockBattery._battery.addEventListener.args.some(function(arg) {
          if (arg[0] === 'chargingtimechange') {
            arg[1].call();
            return true;
          }
        });
        assert.equal(Battery.chargingTime, 13337 - 1337);
        done();
      });
    });

    test('should reflect dischargingTime changes', function(done) {
      this.sinon.spy(MockBattery._battery, 'addEventListener');
      MockBattery._battery.charging = false;
      MockBattery._battery.level = 9;
      MockBattery._battery.dischargingTime = 13337;

      loadBattery(function(Battery) {
        // change the state
        MockBattery._battery.dischargingTime = 13337 - 1337;
        // emit the event
        MockBattery._battery.addEventListener.args.some(function(arg) {
          if (arg[0] === 'dischargingtimechange') {
            arg[1].call();
            return true;
          }
        });
        assert.equal(Battery.dischargingTime, 13337 - 1337);
        done();
      });
    });
  });
});
