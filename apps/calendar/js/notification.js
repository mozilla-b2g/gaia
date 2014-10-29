/* global Notification */
define(function(require, exports, module) {
'use strict';

var NotificationHelper = require('shared/notification_helper');
var debug = require('debug')('notification');

var cachedSelf;

// Will be injected...
exports.app = null;

exports.sendNotification = function(title, body, url) {
  return getSelf().then(app => {
    if (!app) {
      // This is perhaps a test environment?
      debug('mozApps.getSelf gave us lemons!');
      return Promise.resolve();
    }

    var icon = NotificationHelper.getIconURI(app);
    icon += '?';
    icon += url;
    var notification = new Notification(title, { body: body, icon: icon });
    return new Promise((resolve, reject) => {
      notification.onshow = resolve;
      notification.onerror = reject;
      notification.onclick = function() {
        launch(url);
      };
    });
  });
};

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
  return getSelf().then(app => {
    if (app) {
      app.launch();
    }

    exports.app.go(url);
  });
}

});
