'use strict';

/* global ScreenAutoBrightness, ScreenAutoBrightnessValues */

require('/js/screen_auto_brightness.js');

suite('system/ScreenAutoBrightness', function() {
  var realMozPower, fakeTimer;
 
  setup(function() {
    realMozPower = navigator.mozPower;
    var mockMozPower = {
      screenBrightness: 0.7
    };

    Object.defineProperty(navigator, 'mozPower', {
      configurable: true,
      get: function() {
        return mockMozPower;
      }
    });

    fakeTimer = this.sinon.useFakeTimers();
  });

  teardown(function() {
    Object.defineProperty(navigator, 'mozPower', {
      configurable: true,
      get: function() {
        return realMozPower;
      }
    });

    fakeTimer.restore();
  });

  suite('screenAutoBrightnessValues()', function() {
    var brightnessValues;

    setup(function() {
      brightnessValues = new ScreenAutoBrightnessValues();
    });

    test('test initial state', function() {
      assert.equal(brightnessValues.getAverage(),
                   brightnessValues.DEFAULT_BRIGHTNESS_VALUE);
      assert.equal(brightnessValues.getLatest(),
                   brightnessValues.DEFAULT_BRIGHTNESS_VALUE);
    });


    // Min, max, average. May copy some from below.
    test('test computeBrightnessFromLux()', function() {
      var brightness;

      brightness = brightnessValues.computeBrightnessFromLux(0.1);
      assert.equal(brightness, 0.1);

      brightness = brightnessValues.computeBrightnessFromLux(1);
      assert.equal(brightness, 0.1);

      brightness = brightnessValues.computeBrightnessFromLux(10);
      assert.equal(brightness, 0.27);

      brightness = brightnessValues.computeBrightnessFromLux(100);
      assert.equal(brightness, 0.54);

      brightness = brightnessValues.computeBrightnessFromLux(10000);
      assert.equal(brightness, 1);

      brightness = brightnessValues.computeBrightnessFromLux(20000);
      assert.equal(brightness, 1);

    });

    test('test timestamp of pushed brightness values', function() {
      var now, timestamp1, timestamp2;
      now = Date.now();

      fakeTimer.tick(100);
      brightnessValues.pushLuxValue(1);
      timestamp1 = brightnessValues.getLatestTimestamp();
      assert.isTrue(now + 100 <= timestamp1);

      fakeTimer.tick(100);
      brightnessValues.pushLuxValue(2);
      timestamp2 = brightnessValues.getLatestTimestamp();
      assert.isTrue(timestamp1 + 100 <= timestamp2);
    });

    test('test synthesize brightness values', function() {
      var brightness, timestamp;
      brightnessValues.pushLuxValue(10);
      brightness = brightnessValues.getLatest();
      timestamp = brightnessValues.getLatestTimestamp();
      brightnessValues.synthesizeWithLatest();

      assert.equal(brightness, brightnessValues.getLatest());
      assert.equal(timestamp, brightnessValues.getLatestTimestamp());
    });

    test('test average brightness value', function() {
      brightnessValues.pushLuxValue(10); // 0.27
      brightnessValues.pushLuxValue(100); // 0.54
      brightnessValues.pushLuxValue(1000); // 0.81

      assert.equal(brightnessValues.getAverage(), 0.54);
    });
  });


  suite('autoAdjustBrightness()', function() {
    var autoAdjuster, screenBrightness;

    setup(function() {
      autoAdjuster = new ScreenAutoBrightness();
      autoAdjuster.reset();
        autoAdjuster.onbrightnesschange = function(brightness) {
            screenBrightness = brightness;
        };
      screenBrightness = undefined;
    });

    test('auto adjust brightness to brghtness 0.1', function() {
      // Push 5 lux values. Note that this doesn't necessary trigger
      // autoAdjuster.onbrightnesschange().
      for (let i = 0; i < 5; i++) {
        autoAdjuster.autoAdjust(0.1);
        fakeTimer.tick(10);
      }

      // Make sure that as time passes, we update screenBrightness and
      // eventually adjust to the desired value.
      while (!screenBrightness || screenBrightness > 0.1) {
        fakeTimer.tick(100);
      }

      assert.equal(screenBrightness, 0.1);
    });

    test('auto adjust brightness to 0.27 and then to 0.54', function() {
      // Push 5 lux values. Note that this doesn't necessary trigger
      // autoAdjuster.onbrightnesschange().
      for (let i = 0; i < 5; i++) {
        autoAdjuster.autoAdjust(10);
        fakeTimer.tick(10);
      }

      // Make sure that as time passes, we update screenBrightness and
      // eventually adjust to the desired value.
      while (!screenBrightness || screenBrightness > 0.27) {
        fakeTimer.tick(100);
      }


      // We moved downward to <=0.27.
      assert.isTrue(screenBrightness <= 0.27);

      // Push 5 lux values. Note that this doesn't necessary trigger
      // autoAdjuster.onbrightnesschange().
      for (let i = 0; i < 5; i++) {
        autoAdjuster.autoAdjust(100);
        fakeTimer.tick(10);
      }

      while (screenBrightness < 0.54) {
        fakeTimer.tick(100);
      }

      // We moved upward to >= 0.54.
      assert.isTrue(screenBrightness >= 0.54);
    });

    test('auto adjust brightness to brightness 1', function() {
      // Push 5 lux values. Note that this doesn't necessary trigger
      // autoAdjuster.onbrightnesschange().
      for (let i = 0; i < 5; i++) {
        autoAdjuster.autoAdjust(10000);
        fakeTimer.tick(10);
      }

      // Make sure that as time passes, we update screenBrightness and
      // eventually adjust to the desired value.
      while (!screenBrightness || screenBrightness < 1) {
        fakeTimer.tick(100);
      }

      // We moved upward to 1.0
      assert.equal(screenBrightness, 1.0);
    });


    test('test upward cooldown time', function() {
      var timestamp1, timestamp2;
      assert.equal(autoAdjuster._state,
                   ScreenAutoBrightness.prototype.STATE_COOLING_DOWN);

      timestamp1 = Date.now();

      autoAdjuster.autoAdjust(10000);
      while (!screenBrightness) {
        fakeTimer.tick(100);
      }

      // screenBrightness is first updated.
      timestamp2 = Date.now();
      assert.equal(autoAdjuster._state,
                   ScreenAutoBrightness.prototype.STATE_MOVING_UP);
      assert.isTrue(timestamp2 - timestamp1 >=
                    ScreenAutoBrightness.prototype.COOL_DOWN_MS_UP);
    });

    test('test downward cooldown time', function() {
      var timestamp1, timestamp2;
      assert.equal(autoAdjuster._state,
                   ScreenAutoBrightness.prototype.STATE_COOLING_DOWN);

      timestamp1 = Date.now();

      autoAdjuster.autoAdjust(0.1);
      while (!screenBrightness) {
        fakeTimer.tick(100);
      }

      // screenBrightness is first updated.
      timestamp2 = Date.now();
      assert.equal(autoAdjuster._state,
                   ScreenAutoBrightness.prototype.STATE_MOVING_DOWN);
      assert.isTrue(timestamp2 - timestamp1 >=
                    ScreenAutoBrightness.prototype.COOL_DOWN_MS_DOWN);
    });

    test('test synthetic brightness value', function() {
      // Just push one value and check if we will eventually adjust to the
      // desired brightness.
      autoAdjuster.autoAdjust(0.1);

      while (!screenBrightness || screenBrightness > 0.1) {
        fakeTimer.tick(100);
      }

      assert.equal(screenBrightness, 0.1);
    });

    test('auto adjust is not triggered if the change is too small', function() {
      // Push 5 lux values. Note that this doesn't necessary trigger
      // autoAdjuster.onbrightnesschange().
      for (let i = 0; i < 5; i++) {
        autoAdjuster.autoAdjust(10);
        fakeTimer.tick(10);
      }

      while (!screenBrightness || screenBrightness > 0.27) {
        fakeTimer.tick(100);
      }
      assert.isTrue(screenBrightness <= 0.27);

      screenBrightness = undefined;
      // This shouldn't trigger the adjustment.
      for (let i = 0; i < 10; i++) {
        autoAdjuster.autoAdjust(15);
        fakeTimer.tick(10);
      }

      assert.isTrue(screenBrightness === undefined);
    });

    test('test pausing and resuming the auto adjuster', function() {
      autoAdjuster.autoAdjust(0.1);

      while (!screenBrightness) {
        fakeTimer.tick(100);
      }
      // screenBrightness is updated. Now we are moving down.

      assert.equal(autoAdjuster._state,
                   ScreenAutoBrightness.prototype.STATE_MOVING_DOWN);

      autoAdjuster.pause();
      assert.equal(autoAdjuster._state,
                   ScreenAutoBrightness.prototype.STATE_PAUSED);

      screenBrightness = undefined;
      // If we are in the paused state, we are not affected by the arrival of
      // new lux values.
      for (let i = 0; i < 5; i++) {
        autoAdjuster.autoAdjust(10000);
        fakeTimer.tick(100);
      }
      // We should still be in the paused state, and screenBrightness should
      // remain untouched.
      assert.equal(autoAdjuster._state,
                   ScreenAutoBrightness.prototype.STATE_PAUSED);
      assert.isTrue(screenBrightness === undefined);

      // Resume the auto adjuster.
      autoAdjuster.resume();
      assert.equal(autoAdjuster._state,
                   ScreenAutoBrightness.prototype.STATE_COOLING_DOWN);
      // After resuming, get the current brightness from mozPower.
      assert.equal(autoAdjuster._currentBrightness, 0.7);
    });
  });

});
