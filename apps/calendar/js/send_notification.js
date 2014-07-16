/* global Promise, Notification, NotificationHelper */
Calendar.sendNotification = function(title, body, url) {
  'use strict';

  var debug = Calendar.debug('sendNotification');

  var cachedSelf;

  /**
   * Bug 987458:
   *
   * Due to a bug in the platform, multiple requests to
   * mozApps.getSelf() will fail if fired in close succession.
   * Therefore we must make sure to only ever fire a single request to
   * getSelf for all reminders.
   */
  function getSelf() {
    if (!cachedSelf) {
      cachedSelf = new Promise((resolve, reject) => {
        var req = navigator.mozApps.getSelf();

        req.onsuccess = (event) => {
          resolve(event.target.result);
        };

        req.onerror = () => {
          reject('mozApps.getSelf unsuccessful :(');
        };
      });
    }

    return cachedSelf;
  }

  /**
   * Start the calendar app and open the url.
   */
  function launch() {
    return getSelf().then((app) => {
      if (app) {
        app.launch();
      }

      Calendar.App.go(url);
    });
  }

  return getSelf().then((app) => {
    var icon = NotificationHelper.getIconURI(app);
    return new Promise((resolve, reject) => {
      debug('notification', { title: title, body: body });
      var notification = new Notification(title, { body: body, icon: icon });
      debug('notification object', notification);
      notification.onshow = resolve;
      notification.onerror = reject;
      notification.onclick = launch;
    });
  });
};
