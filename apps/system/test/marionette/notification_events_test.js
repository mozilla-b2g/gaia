'use strict';

/* globals Notification */

var assert = require('assert');

var CALENDAR_APP = 'app://calendar.gaiamobile.org';
var CALENDAR_APP_MANIFEST = CALENDAR_APP + '/manifest.webapp';

marionette('Notification events', function() {

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  // FIXME: bug 1006537, only works in B2G with OOP
  test.skip('click event starts application', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    client.executeScript(function(title) {
      /*jshint unused:false*/
      var notification = new Notification(title);
    }, [notificationTitle]);

    // close app
    client.switchToFrame();
    client.apps.close(CALENDAR_APP);

    // switch to system app, make sure we have one notification
    client.switchToFrame();
    var error = client.executeAsyncScript(function(manifest) {
      // get notifications
      var container =
        document.getElementById('desktop-notifications-container');
      var selector = '[data-manifest-u-r-l="' + manifest + '"]';
      var nodes = container.querySelectorAll(selector);
      if (nodes.length !== 1) {
        marionetteScriptFinished('no node to query');
      }
      marionetteScriptFinished(false);
    }, [CALENDAR_APP_MANIFEST]);
    assert.equal(error, false, 'Error checking notifications: ' + error);

    // switch to system app, wait for event
    client.switchToFrame();
    error = client.executeAsyncScript(function(manifest, url) {
      var appListener = function(e) {
        if (e.detail.url === url) {
          window.removeEventListener('appopened', appListener);
          marionetteScriptFinished(false);
        }
      };
      window.addEventListener('appopened', appListener);

      // get notifications
      var container =
        document.getElementById('desktop-notifications-container');
      var selector = '[data-manifest-u-r-l="' + manifest + '"]';
      var node = container.querySelectorAll(selector)[0];
      // pick sent one, simulate tapping

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentNotificationEvent', true, true, {
        type: 'desktop-notification-click',
        id: node.dataset.notificationId
      });
      window.dispatchEvent(event);
    }, [CALENDAR_APP_MANIFEST, CALENDAR_APP + '/index.html']);
    assert.equal(error, false, 'Error clicking on notification: ' + error);
    done();
  });

  test('close event removes notification', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    client.executeScript(function(title) {
      /*jshint unused:false*/
      var notification = new Notification(title);
    }, [notificationTitle]);

    // switch to system app and send desktop-notification-close
    client.switchToFrame();
    var error = client.executeAsyncScript(function(manifest) {
      var container =
        document.getElementById('desktop-notifications-container');
      var selector = '[data-manifest-u-r-l="' + manifest + '"]';
      var nodes = container.querySelectorAll(selector);
      if (nodes.length === 0) {
        marionetteScriptFinished('no node to query');
      }
      for (var i = nodes.length - 1; i >= 0; i--) {
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('mozContentNotificationEvent', true, true, {
          type: 'desktop-notification-close',
          id: nodes[i].dataset.notificationId
        });
        window.dispatchEvent(event);
      }
      marionetteScriptFinished(false);
    }, [CALENDAR_APP_MANIFEST]);
    assert.equal(error, false, 'desktop-notification-close error: ' + error);

    // switch back to calendar, and fetch notifications
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    error = client.executeAsyncScript(function() {
      var promise = Notification.get();
      promise.then(function(notifications) {
        if (notifications && notifications.length !== 0) {
          marionetteScriptFinished('notification still present');
        }
        // success, return no error
        marionetteScriptFinished(false);
      }, function(error) {
        marionetteScriptFinished('promise.then error: ' + error);
      });
    });
    assert.equal(error, false, 'desktop-notification-close error: ' + error);
    done();
  });

  test('click event on resent notification starts application', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    client.executeScript(function(title) {
      /*jshint unused:false*/
      var notification = new Notification(title);
    }, [notificationTitle]);

    // close app
    client.switchToFrame();
    client.apps.close(CALENDAR_APP);

    // switch to system app, remove from tray and trigger resending
    client.switchToFrame();
    var error = client.executeAsyncScript(function(manifest) {
      // first get node from tray
      var container =
        document.getElementById('desktop-notifications-container');
      var selector = '[data-manifest-u-r-l="' + manifest + '"]';
      var nodes = container.querySelectorAll(selector);
      if (nodes.length !== 1) {
        marionetteScriptFinished(
          'Unexpected number of notifications: expected 1');
      }

      // then remove it
      nodes = container.removeChild(nodes[0]).querySelectorAll(selector);
      if (nodes.length !== 0) {
        marionetteScriptFinished('Node should have disappeared');
      }

      var resendCb = (function(number) {
        if (number !== 1) {
          marionetteScriptFinished(
            'Unexpected number of resent notifications: ' + number +
            ' instead of 1.');
        }

        marionetteScriptFinished(false);
      }).bind(this);

      // then perform resend
      navigator.mozChromeNotifications.mozResendAllNotifications(resendCb);
    }, [CALENDAR_APP_MANIFEST]);
    assert.equal(error, false, 'Error on resending after removing: ' + error);

    // close app, to make sure.
    client.switchToFrame();
    // We will use `client.apps.close(CALENDAR_APP)`
    // to instead of the below code,
    // after the http://bugzil.la/1016835 is fixed.
    client.switchToFrame(
      client.findElement('iframe[src*="' + CALENDAR_APP + '"]')
    );
    client.executeScript(function() {
      window.wrappedJSObject.close();
    });

    // switch to system app and send desktop-notification-click
    client.switchToFrame();
    error = client.executeAsyncScript(function(manifest, url) {
      var appListener = function(e) {
        if (e.detail.url === url) {
          window.removeEventListener('appopened', appListener);
          marionetteScriptFinished(false);
        }
      };
      window.addEventListener('appopened', appListener);

      // get notifications
      var container =
        document.getElementById('desktop-notifications-container');
      var selector = '[data-manifest-u-r-l="' + manifest + '"]';
      var nodes = container.querySelectorAll(selector);
      if (nodes.length !== 1) {
        marionetteScriptFinished('no node to query');
      }

      // pick resent one, simulate tapping
      var node = nodes[0];
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentNotificationEvent', true, true, {
        type: 'desktop-notification-click',
        id: node.dataset.notificationId
      });

      window.dispatchEvent(event);
    }, [CALENDAR_APP_MANIFEST, CALENDAR_APP + '/index.html']);
    assert.equal(error, false, 'Error after clicking on resent: ' + error);
    done();
  });

  test('close event removes resent notification', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    client.executeScript(function(title) {
      /*jshint unused:false*/
      var notification = new Notification(title);
    }, [notificationTitle]);

    // close app
    client.switchToFrame();
    client.apps.close(CALENDAR_APP);

    // switch to system app and trigger resending
    client.switchToFrame();
    var error = client.executeAsyncScript(function(manifest) {
      var container =
        document.getElementById('desktop-notifications-container');
      var selector = '[data-manifest-u-r-l="' + manifest + '"]';
      var nodes = container.querySelectorAll(selector);
      if (nodes.length !== 1) {
        marionetteScriptFinished(
          'unexpected number of notifications: ' + nodes.length);
      }

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
    assert.equal(error, false, 'Error on resending: ' + error);

    // switch to system app and send desktop-notification-close
    client.switchToFrame();
    error = client.executeAsyncScript(function(manifest) {
      var container =
        document.getElementById('desktop-notifications-container');
      var selector = '[data-manifest-u-r-l="' + manifest + '"]';
      var nodes = container.querySelectorAll(selector);
      if (nodes.length === 0) {
        marionetteScriptFinished('no node to query');
      }
      for (var i = nodes.length - 1; i >= 0; i--) {
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('mozContentNotificationEvent', true, true, {
          type: 'desktop-notification-close',
          id: nodes[i].dataset.notificationId
        });
        window.dispatchEvent(event);
      }
      marionetteScriptFinished(false);
    }, [CALENDAR_APP_MANIFEST]);
    assert.equal(error, false, 'Error on sending close event: ' + error);

    // switch back to calendar, and fetch notifications
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    error = client.executeAsyncScript(function() {
      var promise = Notification.get();
      promise.then(function(notifications) {
        if (notifications && notifications.length !== 0) {
          marionetteScriptFinished('notification still present');
        }
        // success, return no error
        marionetteScriptFinished(false);
      }, function(error) {
        marionetteScriptFinished('promise.then error: ' + error);
      });
    });
    assert.equal(error, false, 'Error checking closed notifs: ' + error);
    done();
  });

});
