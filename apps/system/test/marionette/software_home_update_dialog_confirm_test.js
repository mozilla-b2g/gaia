'use strict';

var fs = require('fs');

var SHARED_PATH = __dirname + '/../../../../shared/test/integration/';

marionette('Software Home Button - Update Dialog Confirm', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var home, system;
  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
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
      var shbRect = system.softwareButtons.scriptWith(rect);
      return dialogRect.bottom === shbRect.top &&
        winHeight === (dialogRect.height + shbRect.height);
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
      var shbRect = system.softwareButtons.scriptWith(rect);
      return dialogRect.bottom === shbRect.top &&
        winHeight === (dialogRect.height + shbRect.height);
    });
  });
});
