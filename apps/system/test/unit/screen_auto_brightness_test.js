'use strict';

/* global ScreenAutoBrightness */

require('/js/screen_auto_brightness.js');

suite('system/ScreenAutoBrightness', function() {
  var fakeTimer,
      screenBrightness;
 
  setup(function() {
    fakeTimer = this.sinon.useFakeTimers();
  });

  teardown(function() {
    fakeTimer.restore();
  });

  suite('autoAdjustBrightness()', function() {
    var autoAdjuster;

    setup(function() {
      autoAdjuster = new ScreenAutoBrightness();
        autoAdjuster.onbrightnesschange = function(brightness) {
            screenBrightness = brightness;
        };
      screenBrightness = undefined;
    });

    test('auto adjust brightness to lux 0.1', function() {
      autoAdjuster.autoAdjust(0.1);
      assert.equal(screenBrightness, 0.1);
    });

    test('auto adjust brightness to lux 1', function() {
      autoAdjuster.autoAdjust(1);
      assert.equal(screenBrightness, 0.1);
    });

    test('auto adjust brightness to lux 10', function() {
      autoAdjuster.autoAdjust(10);
      assert.equal(screenBrightness, 0.27);
    });

    test('auto adjust brightness to lux 10000', function() {
      autoAdjuster.autoAdjust(10000);
      assert.equal(screenBrightness, 1);
    });

    test('auto adjust brightness to lux 20000', function() {
      autoAdjuster.autoAdjust(20000);
      assert.equal(screenBrightness, 1);
    });

    test('auto adjust to same value as current brightness', function() {
      var sb;
      autoAdjuster.autoAdjust(1);
      sb = screenBrightness;
      assert.equal(autoAdjuster._state, 0);
      autoAdjuster.autoAdjust(2);
      assert.equal(autoAdjuster._state, 0);
      assert.equal(screenBrightness, sb);
      assert.equal(screenBrightness, 0.1);
    });

    test('auto adjust is not triggered if the change is too small', function() {
      var sb;
      autoAdjuster.autoAdjust(8);
      sb = screenBrightness;
      autoAdjuster.autoAdjust(12);
      assert.equal(screenBrightness, sb);
    });

    test('auto adjust is not triggered if change lies inside delay period',
         function() {
      var sb;
      autoAdjuster.autoAdjust(8);
      sb = screenBrightness;
      assert.equal(autoAdjuster._state, 0);
      autoAdjuster.autoAdjust(200);
      assert.equal(autoAdjuster._state, 1);
      assert.equal(autoAdjuster._autoDelayPrevLux, 200);
      assert.equal(screenBrightness, sb);
      fakeTimer.tick(autoAdjuster._autoAdjustDelay / 3);
      assert.equal(autoAdjuster._state, 1);
      autoAdjuster.autoAdjust(50);
      assert.equal(autoAdjuster._autoDelayPrevLux, 50);
      assert.equal(autoAdjuster._state, 1);
      assert.equal(screenBrightness, sb);
      fakeTimer.tick(autoAdjuster._autoAdjustDelay / 3);
      autoAdjuster.autoAdjust(12);
      assert.equal(autoAdjuster._state, 1);
      assert.equal(autoAdjuster._autoDelayPrevLux, 12);
      assert.equal(screenBrightness, sb);
      fakeTimer.tick(autoAdjuster._autoAdjustDelay / 3);
      assert.equal(autoAdjuster._state, 0);
      assert.equal(screenBrightness, sb);
    });

  });

});
