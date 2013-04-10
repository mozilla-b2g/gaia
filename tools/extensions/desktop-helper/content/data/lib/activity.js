!function() {

  var win;
  FFOS_RUNTIME.getAppWindow(function(unsafe) {
    win = unsafe;
  });

  function Activity(config) {
    this.onsuccess = false;
    this.onerror = false;
    this.config = config;

    setTimeout(this.launchActivity.bind(this));
  }

  Activity.prototype = {

    /**
     * Find the activity within all manifests, and launch the app
     */
    launchActivity: function() {

      var self = this;

      // Find the activity within all of the apps
      // Not sure if there's a better way of doing this?
      win.navigator.mozApps.mgmt.getAll().onsuccess = function(e) {

        var apps = e.target.result;
        var activityApp;

        try {
          for (var i = 0, app; app = apps[i]; i++) {

            if (!app.manifest.activities) { continue }

            var activityFound = false;
            for (var activityKey in app.manifest.activities) {

              // Verify the key matches
              if (activityKey != self.config.name) { continue }

              // Verify we match a filter
              if (app.manifest.activities[activityKey].filters.type
                .indexOf(self.config.data.type) === -1) {
                  continue;
              }

              // We found the activity
              activityFound = true;
            }

            if (activityFound) {
              activityApp = app;
              break;
            }
          }
        } catch (e) {
          console.error('ERROR when checking for activity', JSON.stringify(e));
        }

        if (!activityApp) {
          console.error('ERROR: could not find activity');
          return;
        }

        console.log('Launching activity:' + JSON.stringify(self.config));

        activityApp.launch();
      };
    }
  };

  /**
   * A postMessage implementation of MozActivity
   * Posts to the system App frame which listens and launches the app
   */
  function ActivityPostMessage(config) {
    this.onsuccess = false;
    this.onerror = false;
    this.config = config;

    setTimeout(this.proxyActivity.bind(this));
  }

  ActivityPostMessage.prototype = {
    proxyActivity: function() {
      parent.postMessage({
        action: 'ffosRuntimeActivity',
        config: this.config
      }, 'http://system.gaiamobile.org:8080');
    }
  };

  if (/system.gaiamobile.org/.test(location.href)) {
    win.MozActivity = Activity;
  } else {
    win.MozActivity = ActivityPostMessage;
  }

  /**
   * Handle messages for mozChromeEvent from iframes
   */
  if (/system.gaiamobile.org/.test(location.href)) {
    window.addEventListener('message', function(e) {
      if (e.data.action == 'ffosRuntimeActivity') {
        var activity = new Activity(e.data.config);
        activity.onsuccess = function() {
          console.log('Activity success, check for return case.');
        };
      }
    });
  }

    FFOS_RUNTIME.makeNavigatorShim('mozHasPendingMessage', function() {
        return false;
    });
}();
