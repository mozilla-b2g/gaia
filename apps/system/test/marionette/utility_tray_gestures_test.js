'use strict';

var UtilityTray = require('./lib/utility_tray');
var assert = require('assert');

marionette('Utility Tray - Gestures', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var system;
  var utilityTray;

  function watchEvent(eventType) {
    client.executeScript(function(eventType) {
      var win = window.wrappedJSObject;
      if (!win.TEST_EVENTS_RECEIVED) {
        win.TEST_EVENTS_RECEIVED = {};
      }
      window.addEventListener(eventType, function() {
        win.TEST_EVENTS_RECEIVED[eventType] = true;
      });
    }, [eventType]);
  }

  function wasEventDispatched(eventType) {
    return !!client.executeScript(function(eventType) {
      var win = window.wrappedJSObject;
      return win.TEST_EVENTS_RECEIVED[eventType];
    }, [eventType]);
  }

  setup(function() {
    system = client.loader.getAppClass('system');
    utilityTray = new UtilityTray(client);

    system.waitForFullyLoaded();
  });

  test('Swiping down when already opened', function() {
    utilityTray.swipeDown();
    utilityTray.waitForOpened();

    utilityTray.swipeDown();
    utilityTray.waitForOpened();
  });

  test('Swiping down', function() {
    watchEvent('utilitytraywillshow');
    watchEvent('utilitytrayshow');
    utilityTray.swipeDown();
    utilityTray.waitForOpened();
    assert.equal(true, wasEventDispatched('utilitytraywillshow'));
    assert.equal(true, wasEventDispatched('utilitytrayshow'));
    assert.equal(true, utilityTray.shown);
  });

  test('Tapping "settings"', function() {
    utilityTray.swipeDown();
    utilityTray.waitForOpened();
    client.executeScript(function() {
      document.getElementById('quick-settings-full-app').click();
    });
    utilityTray.waitForClosed();
    assert.equal(false, utilityTray.shown);
  });

  test('Swiping up', function() {
    watchEvent('utilitytraywillhide');
    watchEvent('utilitytrayhide');

    utilityTray.open();
    utilityTray.swipeUp();
    utilityTray.waitForClosed();

    assert.equal(true, wasEventDispatched('utilitytraywillhide'));
    assert.equal(true, wasEventDispatched('utilitytrayhide'));

    assert.equal(false, utilityTray.shown);
  });

  test('Swiping up in the middle of the tray closes it', function() {
    utilityTray.open();
    utilityTray.swipeUp();
    utilityTray.waitForClosed();
  });
});
