'use strict';

var fs = require('fs');

var SHARED_PATH = __dirname + '/../../../../../shared/test/integration/';

marionette('Software Home Button - Update Dialog Confirm', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'software-button.enabled': false
    }
  });

  var home, system;
  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
  });

  function triggerUpdateDownload() {
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'update-downloaded'
        }
      }));
    });
  }

  test('Update confirm screen with battery', function() {
    client.executeScript(fs.readFileSync(
      SHARED_PATH + '/mock_navigator_battery.js', 'utf8'));

    triggerUpdateDownload();

    function rect(el) {
      return el.getBoundingClientRect();
    }
    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var dialog = client.findElement('#dialog-screen');
      var dialogRect = dialog.scriptWith(rect);
      return winHeight === dialogRect.height;
    });
  });

  test('Update confirm screen without battery', function() {
    client.executeScript(function() {
      window.wrappedJSObject.navigator.battery.level = 0;
      window.wrappedJSObject.navigator.battery.charging = false;
    });

    triggerUpdateDownload();

    function rect(el) {
      return el.getBoundingClientRect();
    }
    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var dialog = client.findElement('#dialog-screen');
      var dialogRect = dialog.scriptWith(rect);
      return winHeight === dialogRect.height;
    });
  });

  test('Rocketbar should not be expandable in update dialog', function() {
    var input = client.findElement('#homescreen .titlebar');
    client.waitFor(input.displayed.bind(input));
    triggerUpdateDownload();
    client.helper.waitForElement('#dialog-screen');
    input.tap(25, 25);
    // Waiting for the element to disappear is how we assert the element won't
    // show up since internally marionette will poll for it's appearance.
    client.helper.waitForElementToDisappear(system.Selector.activeKeyboard);
  });
});
