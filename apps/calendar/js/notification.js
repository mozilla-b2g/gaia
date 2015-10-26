/* global Notification */
define(function(require, exports, module) {
'use strict';

var NotificationHelper = require('shared/notification_helper');
var co = require('ext/co');
var debug = require('common/debug')('notification');
var performance = require('performance');
var router = require('router');

var cachedSelf;

exports.sendNotification = co.wrap(function *(title, body, url, data) {
  data = data || {};

  var app = yield getSelf();
  if (!app) {
    // This is perhaps a test environment?
    debug('mozApps.getSelf fail');
    return;
  }

  var icon = `${NotificationHelper.getIconURI(app)}?${url}`;
  var notification = new Notification(title, {
    body: body,
    icon: icon,
    // we use the URL as the ID so we display a single notification for each
    // busytime (it will override previous notifications)
    tag: url,
    data: data
  });

  return new Promise((resolve, reject) => {
    notification.onshow = resolve;
    notification.onerror = reject;
    notification.onclick = () => launch(url);
  });
});

exports.revokeNotificationsForEvent = co.wrap(function *(event) {
  var id = event.remote.id;
  var notifications = yield Notification.get();
  notifications.forEach(notification => {
    if (notification.data.id === id) {
      notification.close();
    }
  });
});

/**
 * Bug 987458 - Multipe requests to mozApps.getSelf will fail if fired
 *     in close succession. Therefore we must make sure to only ever fire
 *     a single request to getSelf.
 */
function getSelf() {
  if (!cachedSelf) {
    cachedSelf = new Promise((resolve, reject) => {
      var request = navigator.mozApps.getSelf();

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = () => {
        reject(new Error('mozApps.getSelf failed!'));
      };
    });
  }

  return cachedSelf;
}

/**
 * Start the calendar app and open the url.
 */
function launch(url) {
  // we close all the notifications for the same busytime when we launch the
  // app; we do it like this to make sure we use the same codepath for cases
  // where notification was handled by mozSetMessageHandler or by the
  // Notification instance onclick listener (Bug 1132336)
  closeNotifications(url);

  if (performance.isComplete('fullyLoaded')) {
    return foreground(url);
  }

  // If we're not fully loaded, wait for that to happen to foreground
  // ourselves and navigate to the target url so the user
  // experiences less flickering.
  // XXX: Look into removing this event once PerformanceObserver becomes
  // standardized
  window.addEventListener('fullyLoaded', function onMozAppLoaded() {
    window.removeEventListener('fullyLoaded', onMozAppLoaded);
    return foreground(url);
  });
}
exports.launch = launch;

// Bring ourselves to the foreground at some url.
function foreground(url) {
  return getSelf().then(app => {
    router.go(url);
    return app && app.launch();
  });
}

function closeNotifications(url) {
  Notification.get({ tag: url }).then(notifications => {
    notifications.forEach(n => n.close());
  });
}

});
