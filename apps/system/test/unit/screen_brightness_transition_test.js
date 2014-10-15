'use strict';

/* global ScreenBrightnessTransition */

require('/js/screen_brightness_transition.js');

suite('ScreenBrightnessTransition', function() {
  var realMozPower;
  var fakeTimer;

  setup(function() {
    realMozPower = navigator.mozPower;
    var mockMozPower = {
      screenBrightness: 0.5
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

  test('transitionTo(1)', function() {
    var transition = new ScreenBrightnessTransition();
    transition.onsuccess = this.sinon.stub();

    transition.transitionTo(1);
    for (var i = 0; i < 50; i++) {
      assert.isTrue(transition.isRunning);
      // Ignore floating error.
      assert.isTrue(
        navigator.mozPower.screenBrightness - (0.5 + 0.01 * i) < 1E-15);
      fakeTimer.tick(transition.STEP_INTERVAL_MS);
    }
    assert.isFalse(transition.isRunning);
    assert.equal(navigator.mozPower.screenBrightness, 1);
    assert.isTrue(transition.onsuccess.calledOnce);

    // Make sure no other things happens after more ticks
    fakeTimer.tick(transition.STEP_INTERVAL_MS * 10);
    assert.equal(navigator.mozPower.screenBrightness, 1);
    assert.isTrue(transition.onsuccess.calledOnce);
  });

  test('transitionTo(0)', function() {
    var transition = new ScreenBrightnessTransition();
    transition.onsuccess = this.sinon.stub();

    transition.transitionTo(0);

    for (var i = 0; i < 50; i++) {
      assert.isTrue(transition.isRunning);
      // Ignore floating error.
      assert.isTrue(
        navigator.mozPower.screenBrightness - (0.5 - 0.01 * i) < 1E-15);
      fakeTimer.tick(transition.STEP_INTERVAL_MS);
    }
    assert.isFalse(transition.isRunning);
    assert.equal(navigator.mozPower.screenBrightness, 0);
    assert.isTrue(transition.onsuccess.calledOnce);

    // Make sure no other things happens after more ticks
    fakeTimer.tick(transition.STEP_INTERVAL_MS * 10);
    assert.equal(navigator.mozPower.screenBrightness, 0);
    assert.isTrue(transition.onsuccess.calledOnce);
  });

  test('abort()', function() {
    var transition = new ScreenBrightnessTransition();
    transition.onsuccess = this.sinon.stub();

    transition.transitionTo(1);

    fakeTimer.tick(transition.STEP_INTERVAL_MS * 25);
    // Ignore floating error.
    assert.isTrue(
      navigator.mozPower.screenBrightness - (0.5 + 0.01 * 25) < 1E-15);

    transition.abort();

    assert.isFalse(transition.isRunning);

    // Make sure notthings happens after more ticks
    fakeTimer.tick(transition.STEP_INTERVAL_MS * 10);
    // Ignore floating error.
    assert.isTrue(
      navigator.mozPower.screenBrightness - (0.5 + 0.01 * 25) < 1E-15);
    assert.isFalse(transition.onsuccess.calledOnce);
  });
});
