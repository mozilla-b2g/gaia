marionette('Settings', function() {
  'use strict';

  // sadly must come before the client call because the client call creates
  // a teardown which close the connection before this gets invoked if called
  // after it.
  teardown(function() {
    camera.close();
  });

  var assert = require('assert');
  var client = marionette.client();
  var camera = new (require('../lib/camera'))(client);

  setup(function() {
    camera.launch();
  });

  test('enables grid', function() {
    camera.waitForHudReady();
    camera.tapSettings();
    camera.waitForSettingsPanel();
    camera.tapGridSettings();
    camera.waitForSettingOptionsPanel();
    camera.tapOnOption();
    camera.waitForGridOn();
  });

  test('disables grid', function() {
    camera.waitForHudReady();
    camera.tapSettings();
    camera.waitForSettingsPanel();
    camera.tapGridSettings();
    camera.waitForSettingOptionsPanel();
    camera.tapOffOption();
    camera.waitForGridOff();
  });

  test('enables timer', function() {
    camera.waitForHudReady();
    camera.tapSettings();
    camera.waitForSettingsPanel();
    camera.tapSelfTimerSettings();
    camera.waitForSettingOptionsPanel();
    camera.tapSelfTimer2SecsOption();
    camera.waitForNotification();
  });

  test('takes picture with 2 seconds timer', function() {
    camera.waitForHudReady();
    camera.tapSettings();
    camera.waitForSettingsPanel();
    camera.tapSelfTimerSettings();
    camera.waitForSettingOptionsPanel();
    camera.tapSelfTimer2SecsOption();
    camera.waitForNotification();
    camera.tapCapture();
    camera.waitForCountDown();
    camera.waitForThumbnail();
  });

  test('disables timer', function() {
    camera.waitForHudReady();
    camera.tapSettings();
    camera.waitForSettingsPanel();
    camera.tapSelfTimerSettings();
    camera.waitForSettingOptionsPanel();
    camera.tapOffOption();
    camera.waitForNotification();
  });

});
