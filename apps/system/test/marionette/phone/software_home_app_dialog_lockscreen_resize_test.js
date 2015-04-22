'use strict';
var LockScreen = require('../lib/lockscreen.js');

var ALERT_APP_URL = 'app://fakeapp.gaiamobile.org';

marionette('Software Home Button - Dialog Lockscreen Resize', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'software-button.enabled': true
    },
    apps: {
      'fakeapp.gaiamobile.org': __dirname + '/../../apps/fakeapp'
    }
  });
  var system, lockscreen;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    lockscreen = (new LockScreen()).start(client);
    lockscreen.relock();
  });

  test('Dialog resizes when lockscreen unlocked', function() {
    // Launch our fake app in the background.
    client.apps.launch(ALERT_APP_URL);
    var frame = system.waitForLaunch(ALERT_APP_URL);
    client.switchToFrame(frame);

    // Fire an alert from the fake app.
    client.executeScript(function() {
      setTimeout(function() {
        alert('Alert!');
      });
    });

    // Unlock the screen.
    client.switchToFrame();
    lockscreen.unlock();

    // Wait for the app window dialog to pop up.
    var dialog = client.helper.waitForElement('.appWindow .modal-dialog-alert');

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var sbRect = system.statusbar.scriptWith(rect);
      var dialogRect = dialog.scriptWith(rect);
      var shbRect = system.softwareButtons.scriptWith(rect);

      return winHeight === (sbRect.height + dialogRect.height + shbRect.height);
    });
  });
});
