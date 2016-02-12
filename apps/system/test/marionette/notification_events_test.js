'use strict';

/* globals Notification */

var assert = require('assert');
var NotificationList = require('./lib/notification.js').NotificationList;

var EMAIL_ORIGIN = 'email.gaiamobile.org';
var EMAIL_APP = 'app://' + EMAIL_ORIGIN;
var EMAIL_APP_MANIFEST = EMAIL_APP + '/manifest.webapp';

var MESSAGE_HANDLER_ORIGIN = 'messagehandlerapp.gaiamobile.org';
var MESSAGE_HANDLER_APP = 'app://' + MESSAGE_HANDLER_ORIGIN;

marionette('Notification events', function() {
  var apps = {};
  apps[MESSAGE_HANDLER_ORIGIN] = __dirname + '/../apps/messagehandlerapp';
  var client = marionette.client({
    profile: {
      apps: apps
    }
  });
  var details = {tag: 'test tag',
                 body: 'test body',
                 data: {number: 2,
                        string: '123',
                        array: [1, 2, 3],
                        obj: {test: 'test'}}};
  var system;
  var notificationList;
  setup(function() {
    system = client.loader.getAppClass('system');
    notificationList = new NotificationList(client);
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
    client.apps.launch(MESSAGE_HANDLER_APP);
    client.apps.switchToApp(MESSAGE_HANDLER_APP);

    client.executeScript(function(details) {
      var notification;
      notification = new Notification('testtitle', details);
    }, [details]);

    client.switchToFrame();
    client.apps.close(MESSAGE_HANDLER_APP);
    client.apps.launch(MESSAGE_HANDLER_APP);

    client.switchToFrame();

    notificationList.waitForNotificationCount(1);
    notificationList.refresh();
    // closes all monitored notifications
    // -> mozSetMessageHandler should get the corresponding close events
    notificationList.clear();

    // get into the context containing the mocked api and the data object
    client.apps.switchToApp(MESSAGE_HANDLER_APP);
    var data = null;
    client.waitFor(function() {
      data = client.executeScript(function() {
        return window.wrappedJSObject.getLastMessageData();
      });
      return data != null && data.data != null;
    });

    assert.equal(JSON.stringify(data.data), JSON.stringify(details.data),
                 'Notification data should match');
    done();
  });
});
