'use strict';

/* globals Notification */

var assert = require('assert');

var CALENDAR_APP = 'app://calendar.gaiamobile.org';
var CALENDAR_APP_MANIFEST = CALENDAR_APP + '/manifest.webapp';

marionette('mozChromeNotifications:', function() {
  var client = marionette.client();

  var system;
  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('Checking mozResendAllNotifications API', function(done) {
    // switch to system app and do basic tests
    client.switchToFrame();
    var error = client.executeAsyncScript(function() {
      if (!('mozChromeNotifications' in navigator)) {
        marionetteScriptFinished('No mozChromeNotifications API');
      }

      var api = navigator.mozChromeNotifications;
      if (!('mozResendAllNotifications' in api)) {
        marionetteScriptFinished(
          'No mozResendAllNotifications in mozChromeNotifications API');
      }

      if (typeof api.mozResendAllNotifications !== 'function') {
        marionetteScriptFinished('mozResendAllNotifications is not a function');
      }

      marionetteScriptFinished(false);
    });
    assert.equal(error, false, 'mozChromeNotifications API error: ' + error);
    done();
  });

  test('Sending no notification, resends none', function(done) {
    // switch to calendar app and send notification
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    var error = client.executeAsyncScript(function(title) {
      var notification = new Notification('Title');
      notification.addEventListener('close', function() {
        marionetteScriptFinished(false);
      });
      notification.close();
    });
    assert.equal(error, false, 'Error on sending notification: ' + error);

    // switch to system app and trigger resending
    client.switchToFrame();
    error = client.executeAsyncScript(function() {
      var resendCb = (function(number) {
        if (number !== 0) {
          marionetteScriptFinished('Should have resent nothing');
        }

        marionetteScriptFinished(false);
      }).bind(this);

      navigator.mozChromeNotifications.mozResendAllNotifications(resendCb);
    });
    assert.equal(error, false, 'Error on no resend: ' + error);
    done();
  });

  test('Sending one notification, resends one', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    var error = client.executeAsyncScript(function(title) {
      var notification = new Notification(title);
      notification.addEventListener('show', function() {
        marionetteScriptFinished(false);
      });
    }, [notificationTitle]);
    assert.equal(error, false, 'Error on sending notification: ' + error);

    // switch to system app and trigger resending
    client.switchToFrame();
    error = client.executeAsyncScript(function() {
      var resendCb = (function(number) {
        if (number !== 1) {
          marionetteScriptFinished(
            'Unexpected number of resent notifications: ' + number +
            ' instead of 1.');
        }

        marionetteScriptFinished(false);
      }).bind(this);
      navigator.mozChromeNotifications.mozResendAllNotifications(resendCb);
    });
    assert.equal(error, false, 'Error on one resend: ' + error);
    done();
  });

  test('Sending two notifications, resends two', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    var error = client.executeAsyncScript(function(title) {
      var notification1 = new Notification(title + '--1');
      notification1.addEventListener('show', function() {
        var notification2 = new Notification(title + '--2');
        notification2.addEventListener('show', function() {
          marionetteScriptFinished(false);
	});
      });
    }, [notificationTitle]);
    assert.equal(error, false, 'Error on sending notification: ' + error);

    // switch to system app and trigger resending
    client.switchToFrame();
    error = client.executeAsyncScript(function() {
      var resendCb = (function(number) {
        if (number !== 2) {
          marionetteScriptFinished(
            'Unexpected number of resent notifications: ' + number +
            ' instead of 2.');
        }

        marionetteScriptFinished(false);
      }).bind(this);
      navigator.mozChromeNotifications.mozResendAllNotifications(resendCb);
    });
    assert.equal(error, false, 'Error on two resend: ' + error);
    done();
  });

  test('Sending two notifications, close one, resends one', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    var error = client.executeAsyncScript(function(title) {
      var notification1 = new Notification(title + '--1');
      notification1.addEventListener('show', function() {
        notification1.close();
        var notification2 = new Notification(title + '--2');
        notification2.addEventListener('show', function() {
          marionetteScriptFinished(false);
	});
      });
    }, [notificationTitle]);
    assert.equal(error, false, 'Error on sending notification: ' + error);

    // switch to system app and trigger resending
    client.switchToFrame();
    error = client.executeAsyncScript(function() {
      var resendCb = (function(number) {
        if (number !== 1) {
          marionetteScriptFinished(
            'Unexpected number of resent notifications: ' + number +
            ' instead of 1.');
        }

        marionetteScriptFinished(false);
      }).bind(this);
      navigator.mozChromeNotifications.mozResendAllNotifications(resendCb);
    });
    assert.equal(error, false, 'Error on one resend after one close: ' + error);
    done();
  });

  test('Sending one notification, remove from tray, resend', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    var error = client.executeAsyncScript(function(title) {
      var notification = new Notification(title);
      notification.addEventListener('show', function() {
        marionetteScriptFinished(false);
      });
    }, [notificationTitle]);
    assert.equal(error, false, 'Error sending notification: ' + error);

    // switch to system app and remove from tray
    client.switchToFrame();
    error = client.executeAsyncScript(function(manifest) {
      var container =
        document.getElementById('desktop-notifications-container');
      var selector = '[data-manifest-u-r-l="' + manifest + '"]';
      var nodes = container.querySelectorAll(selector);
      if (nodes.length !== 1) {
        marionetteScriptFinished(
          'Unexpected number of notifications: expected 1');
      }

      nodes[0].remove();
      if (container.querySelectorAll(selector).length !== 0) {
        marionetteScriptFinished('Node should have disappeared');
      }

      marionetteScriptFinished(false);
    }, [CALENDAR_APP_MANIFEST]);
    assert.equal(error, false, 'Error when removing from tray: ' + error);

    client.apps.switchToApp(CALENDAR_APP);

    // switch to system app and trigger resending
    client.switchToFrame();
    error = client.executeAsyncScript(function(manifest) {
      var resendCb = (function(number) {
        if (number !== 1) {
          marionetteScriptFinished(
            'Unexpected number of resent notifications: ' + number +
            ' instead of 1.');
        }

        marionetteScriptFinished(false);
      }).bind(this);
      navigator.mozChromeNotifications.mozResendAllNotifications(resendCb);
    }, [CALENDAR_APP_MANIFEST]);
    assert.equal(error, false, 'Error when resending after removing: ' + error);

    client.apps.switchToApp(CALENDAR_APP);

    client.switchToFrame();
    error = client.executeAsyncScript(function(manifest) {
        var container =
          document.getElementById('desktop-notifications-container');
        var selector = '[data-manifest-u-r-l="' + manifest + '"]';
        var nodes = container.querySelectorAll(selector);
        if (nodes.length === 1) {
          marionetteScriptFinished(false);
        }

        marionetteScriptFinished(
          'Unexpected number of notifications: expected 1 but got ' +
          nodes.length);
    }, [CALENDAR_APP_MANIFEST]);
    assert.equal(error, false, 'Error when checking resent in tray: ' + error);
    done();
  });

});
