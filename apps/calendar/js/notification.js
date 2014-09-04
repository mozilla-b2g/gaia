/**
 * Notification helper that wraps process of fetching the apps icon and sending
 * app to the given url on click of the notification.
 *
 *
 *    Calendar.Notification.send(
 *      'title', // title
 *      'description', // desc
 *      '/modify-account/1' // (url),
 *      function() {
 *        // notification is sent _not_ clicked here
 *      }
 *    );
 *
 *
 */
Calendar.Notification = (function() {
  'use strict';

  // Due to a bug in the platform, multiple requests to
  // mozApps.getSelf() will fail if fired in close succession.
  // So we must make sure to only ever fire a single request to
  // getSelf for all reminders.
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=987458
  var cachedApp = null;
  var requestInProgress = false;
  var requestQueue = [];

  function fireAppCallbacks(error, app) {
    while (requestQueue.length > 0) {
      (requestQueue.shift())(error, app);
    }
  }

  function makeAppRequest() {
    requestInProgress = true;

    var req = navigator.mozApps.getSelf();

    req.onerror = function() {
      requestInProgress = false;
      fireAppCallbacks(new Error('cannot find app'));
    };

    req.onsuccess = function sendNotification(e) {
      requestInProgress = false;
      cachedApp = e.target.result;
      fireAppCallbacks(null, cachedApp);
    };
  }

  function getApp(callback) {
    if (cachedApp) {
      callback(null, cachedApp);
      return;
    }

    requestQueue.push(callback);

    if (!requestInProgress) {
      makeAppRequest();
    }
  }

  function launchApp(url) {
    getApp(function(err, app) {
      Calendar.App.go(url);
      if (app) {
        app.launch();
      }
    });
  }

  function sendNotification(title, desc, url, callback) {
    getApp(function(err, app) {
      if (err) {
        console.error('Error attemping to find app');
        return callback(err);
      }

      var icon = (app) ?
        NotificationHelper.getIconURI(app) : '';

      icon += '?' + url;

      NotificationHelper.send(
        title,
        desc,
        icon,
        launchApp.bind(null, url)
      );

      callback();
    });
  }

  return {
    send: sendNotification
  };

}());
