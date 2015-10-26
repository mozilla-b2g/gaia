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
        'software-button.enabled': false
      }
    }
  });

  var home, system;
  setup(function() {
    home = client.loader.getAppClass('homescreen');
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
    var input = client.findElement('#statusbar');
    client.waitFor(input.displayed.bind(input));
    triggerUpdateDownload();

    client.helper.waitForElement('#dialog-screen').scriptWith(function(el) {
      el.addEventListener('touchend', function() {
        el.classList.add('was-tapped');
      });
    });

    // Tap on the screen coordinate where the rocketbar lives.
    input.tap(25, 25);

    // The tap should have been intercepted by the dialog screen, proving that
    // the dialog was on top of the rocketbar.
    client.helper.waitForElement('#dialog-screen.was-tapped');
  });

});
