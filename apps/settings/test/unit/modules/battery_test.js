/* global define */
'use strict';

suite('Battery', function() {
  var sandbox = sinon.sandbox.create();
  var MockPlatformBattery;
  var map = {
    'modules/battery': {
      'modules/navigator/battery': 'MockPlatformBattery'
    }
  };

  // Load a new Batery instance
  var loadBattery = function(callback) {
    var requireCtx = testRequire([], map, function() {});
    define('MockPlatformBattery', function() {
      return MockPlatformBattery;
    });
    requireCtx(['modules/battery'], callback);
  };

  setup(function() {
    MockPlatformBattery = {
      charging: null,
      level: null,
      addEventListener: function() {}
    };
  });

  teardown(function() {
    sandbox.restore();
  });

  suite('return correct values when initialized', function() {
    test('charging', function(done) {
      MockPlatformBattery.charging = true;
      MockPlatformBattery.level = 0.5;
      MockPlatformBattery.chargingTime = 13337;
      MockPlatformBattery.dischargingTime = Infinity;

      loadBattery(function(Battery) {
        assert.equal(Battery.level, 50);
        assert.equal(Battery.state, 'charging');
        assert.equal(Battery.chargingTime, 13337);
        assert.equal(Battery.dischargingTime, Infinity);
        done();
      });
    });

    test('charged', function(done) {
      MockPlatformBattery.charging = true;
      MockPlatformBattery.level = 1;

      loadBattery(function(Battery) {
        assert.equal(Battery.level, 100);
        assert.equal(Battery.state, 'charged');
        done();
      });
    });

    test('unplugged', function(done) {
      MockPlatformBattery.charging = false;
      MockPlatformBattery.level = 1;

      loadBattery(function(Battery) {
        assert.equal(Battery.level, 100);
        assert.equal(Battery.state, 'unplugged');
        done();
      });
    });
  });

  suite('status changes', function() {
    test('should reflect level changes', function(done) {
      sandbox.spy(MockPlatformBattery, 'addEventListener');
      MockPlatformBattery.level = 0.5;

      loadBattery(function(Battery) {
        assert.equal(Battery.level, 50);
        // change the level
        MockPlatformBattery.level = 0.51;
        // emit the event
        MockPlatformBattery.addEventListener.args.some(function(arg) {
          if (arg[0] === 'levelchange') {
            arg[1].call();
            return true;
          }
        });
        assert.equal(Battery.level, 51);
        done();
      });
    });

    test('should reflect state changes', function(done) {
      sandbox.spy(MockPlatformBattery, 'addEventListener');
      MockPlatformBattery.charging = false;
      MockPlatformBattery.level = 1;

      loadBattery(function(Battery) {
        assert.equal(Battery.state, 'unplugged');
        // change the state
        MockPlatformBattery.charging = true;
        // emit the event
        MockPlatformBattery.addEventListener.args.some(function(arg) {
          if (arg[0] === 'chargingchange') {
            arg[1].call();
            return true;
          }
        });
        assert.equal(Battery.state, 'charged');
        done();
      });
    });

    test('should reflect chargingTime changes', function(done) {
      sandbox.spy(MockPlatformBattery, 'addEventListener');
      MockPlatformBattery.charging = true;
      MockPlatformBattery.level = 10;
      MockPlatformBattery.chargingTime = 13337;

      loadBattery(function(Battery) {
        // change the state
        MockPlatformBattery.chargingTime = 13337 - 1337;
        // emit the event
        MockPlatformBattery.addEventListener.args.some(function(arg) {
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
      sandbox.spy(MockPlatformBattery, 'addEventListener');
      MockPlatformBattery.charging = false;
      MockPlatformBattery.level = 9;
      MockPlatformBattery.dischargingTime = 13337;

      loadBattery(function(Battery) {
        // change the state
        MockPlatformBattery.dischargingTime = 13337 - 1337;
        // emit the event
        MockPlatformBattery.addEventListener.args.some(function(arg) {
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
