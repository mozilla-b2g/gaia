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

  function getApp(callback) {
    var req = navigator.mozApps.getSelf();

    req.onerror = function() {
      callback(new Error('cannot find app'));
    };

    req.onsuccess = function sendNotification(e) {
      var app = e.target.result;
      callback(null, e.target.result);
    };
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
