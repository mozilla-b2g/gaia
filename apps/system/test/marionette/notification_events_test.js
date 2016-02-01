'use strict';

/* globals Notification */

var assert = require('assert'),
    fs = require('fs');

var EMAIL_APP = 'app://email.gaiamobile.org';
var EMAIL_APP_MANIFEST = EMAIL_APP + '/manifest.webapp';

marionette('Notification events', function() {

  var client = marionette.client();
  var details = {tag: 'test tag',
                 body: 'test body',
                 data: {number: 2,
                        string: '123',
                        array: [1, 2, 3],
                        obj: {test: 'test'}}};

  var system;
  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('click event starts application', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(EMAIL_APP);
    client.apps.switchToApp(EMAIL_APP);
    var error = client.executeAsyncScript(function(title) {
      var notification = new Notification(title);
      notification.addEventListener('show', function() {
        marionetteScriptFinished(false);
      });
    }, [notificationTitle]);
    assert.equal(error, false, 'Error sending notification: ' + error);

    // close app
    client.switchToFrame();
    client.apps.close(EMAIL_APP);

    // switch to system app, make sure we have one notification
    client.switchToFrame();
    error = client.executeAsyncScript(function(manifest) {
      // get notifications
      var container =
        document.getElementById('desktop-notifications-container');
      var selector = '[data-manifest-u-r-l="' + manifest + '"]';
      var nodes = container.querySelectorAll(selector);
      if (nodes.length !== 1) {
        marionetteScriptFinished('no node to query');
      }
      marionetteScriptFinished(false);
    }, [EMAIL_APP_MANIFEST]);
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
    }, [EMAIL_APP_MANIFEST, EMAIL_APP + '/index.html']);
    assert.equal(error, false, 'Error clicking on notification: ' + error);
    done();
  });

  test('close event removes notification', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(EMAIL_APP);
    client.apps.switchToApp(EMAIL_APP);
    var error = client.executeAsyncScript(function(title) {
      var notification = new Notification(title);
      notification.addEventListener('show', function() {
        marionetteScriptFinished(false);
      });
    }, [notificationTitle]);
    assert.equal(error, false, 'Error sending notification: ' + error);

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
    }, [EMAIL_APP_MANIFEST]);
    assert.equal(error, false, 'desktop-notification-close error: ' + error);

    // switch back to calendar, and fetch notifications
    client.apps.switchToApp(EMAIL_APP);
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

  test('closing notification invokes close handler', function() {
    client.apps.launch(EMAIL_APP);
    client.apps.switchToApp(EMAIL_APP);
    // Note: this will timeout on failure
    client.executeAsyncScript(function() {
      var notification = new Notification('Title');
      notification.addEventListener('close', function() {
        marionetteScriptFinished();
      });
      notification.close();
    });
  });

  test('click event on resent notification starts application', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(EMAIL_APP);
    client.apps.switchToApp(EMAIL_APP);
    var error = client.executeAsyncScript(function(title) {
      var notification = new Notification(title);
      notification.addEventListener('show', function() {
        marionetteScriptFinished(false);
      });
    }, [notificationTitle]);
    assert.equal(error, false, 'Error sending notification: ' + error);

    // close app
    client.switchToFrame();
    client.apps.close(EMAIL_APP);

    // switch to system app, remove from tray and trigger resending
    client.switchToFrame();
    error = client.executeAsyncScript(function(manifest) {
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
      nodes[0].remove();

      nodes = container.querySelectorAll(selector);
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
    }, [EMAIL_APP_MANIFEST]);
    assert.equal(error, false, 'Error on resending after removing: ' + error);

    var applicationLaunched = false;
    try {
      client.switchToFrame();

      var faster = client.scope({ searchTimeout: 50 });

      // If the app's iframe is here, it means the "show" event launched it, and
      // it's wrong
      faster.findElement('iframe[src*="' + EMAIL_APP + '"]');
      applicationLaunched = true;
    } catch(e) {}

    if (applicationLaunched) {
      throw new Error('Sending the "show" event launched the app.');
    }

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
    }, [EMAIL_APP_MANIFEST, EMAIL_APP + '/index.html']);
    assert.equal(error, false, 'Error after clicking on resent: ' + error);
    done();
  });

  test('close event removes resent notification', function(done) {
    var notificationTitle = 'Title:' + Date.now();

    // switch to calendar app and send notification
    client.apps.launch(EMAIL_APP);
    client.apps.switchToApp(EMAIL_APP);
    var error = client.executeAsyncScript(function(title) {
      var notification = new Notification(title);
      notification.addEventListener('show', function() {
        marionetteScriptFinished(false);
      });
    }, [notificationTitle]);
    assert.equal(error, false, 'Error sending notification: ' + error);

    // close app
    client.switchToFrame();
    client.apps.close(EMAIL_APP);

    // switch to system app and trigger resending
    client.switchToFrame();
    error = client.executeAsyncScript(function(manifest) {
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
    }, [EMAIL_APP_MANIFEST]);
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
    }, [EMAIL_APP_MANIFEST]);
    assert.equal(error, false, 'Error on sending close event: ' + error);

    // switch back to calendar, and fetch notifications
    client.apps.launch(EMAIL_APP);
    client.apps.switchToApp(EMAIL_APP);
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

  test('custom data available via mozChromeNotificationEvent', function(done) {
    client.switchToFrame();
    var result = client.executeAsyncScript(function(details) {
      var notification;
      notification = new Notification('testtitle', details);
      window.addEventListener('mozChromeNotificationEvent', function(evt) {
        var rv = JSON.stringify(evt.detail.data) ==
                 JSON.stringify(details.data);
        marionetteScriptFinished(rv);
      });
    }, [details]);

    assert.equal(result, true, 'Notification data should match');
    done();
  });

  test('custom data available via mozSetMessageHandler', function(done) {
    client.switchToFrame();

    client.apps.launch(EMAIL_APP);
    client.apps.switchToApp(EMAIL_APP);

    client.executeScript(function(details) {
      var notification;
      notification = new Notification('testtitle', details);
    }, [details]);

    client.switchToFrame();
    client.apps.close(EMAIL_APP);

    // after closing live handlers should be lost, the callbacks too
    client.apps.launch(EMAIL_APP);
    client.apps.switchToApp(EMAIL_APP);

    client.executeScript(fs.readFileSync(
      __dirname + '/lib/fake_moz_set_message_handler.js', 'utf8'));

    // fake mozSetMessageHandler
    client.executeScript(function() {
      window.wrappedJSObject.mozSetMessageHandler('notification');
    });

    client.switchToFrame();

    client.executeScript(function(manifest) {
      // get notifications
      var container =
        document.getElementById('desktop-notifications-container');
      var selector = '[data-manifest-u-r-l="' + manifest + '"]';
      var node = container.querySelectorAll(selector)[0];

      // simulate tapping
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentNotificationEvent', true, true, {
        type: 'desktop-notification-click',
        id: node.dataset.notificationId
      });
      window.dispatchEvent(event);
    }, [EMAIL_APP_MANIFEST]);

    // get into the context containing the mocked api and the data object
    client.apps.switchToApp(EMAIL_APP);
    client.waitFor(function() {
      var data = client.executeScript(function() {
        return window.wrappedJSObject.__getFakeData;
      });
      return data != null;
    });
    var data = client.executeScript(function() {
      return window.wrappedJSObject.__getFakeData;
    });

    assert.equal(JSON.stringify(data), JSON.stringify(details.data),
                 'Notification data should match');
    done();
  });
});
