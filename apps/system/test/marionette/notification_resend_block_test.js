'use strict';

/* globals Notification */

var assert = require('assert');

var CALENDAR_APP = 'app://calendar.gaiamobile.org';

marionette('mozChromeNotifications:', function() {

  var client = marionette.client({
    prefs: {
      'dom.notifications.mozchromenotifications.allow_resend_overwrite': false
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  test('Sending one notification, resends none', function(done) {
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
        if (number !== 0) {
          marionetteScriptFinished(
            'Unexpected number of resent notifications: ' + number +
            ' instead of 0.');
        }

        marionetteScriptFinished(false);
      }).bind(this);
      navigator.mozChromeNotifications.mozResendAllNotifications(resendCb);
    });
    assert.equal(error, false, 'Error on one resend: ' + error);
    done();
  });

});
