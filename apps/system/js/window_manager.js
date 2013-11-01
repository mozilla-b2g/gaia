/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var WindowManager = (function() {
  // TODO: Move into app window.
  window.addEventListener('launchapp', windowLauncher);

  // TODO: Remove this.
  function windowLauncher(e) {
    // TODO: Move into app window's attribute.
    var config = e.detail;
    // Don't need to launch system app.
    if (config.url === window.location.href)
      return;

    if (!config.isSystemMessage) {
      // AppWindowManager
    } else {
      if (config.isActivity && config.inline) {
        // ActivityWindowFactory is dealing with this.
        return;
      }

      // If the message specifies we only have to show the app,
      // then we don't have to do anything here
      if (config.changeURL) {
        if (AppWindowManager.runningApps[config.origin]) {
          // If the app is in foreground, it's too risky to change it's
          // URL. We'll ignore this request.
          if (AppWindowManager.displayedApp !== config.origin) {
            var iframe = runningApps[config.origin].browser.element;

            // If the app is opened and it is loaded to the correct page,
            // then there is nothing to do.
            if (iframe.src !== config.url) {
              // Rewrite the URL of the app frame to the requested URL.
              // XXX: We could ended opening URls not for the app frame
              // in the app frame. But we don't care.
              iframe.src = config.url;
            }
          }
        } else if (config.origin !== HomescreenLauncher.origin) {
          // XXX: We could ended opening URls not for the app frame
          // in the app frame. But we don't care.
          var app = new AppWindow(config);

          // set the size of the iframe
          // so Cards View will get a correct screenshot of the frame
          if (config.stayBackground) {
            app.resize(false);
            app.setVisible(false);
          }
        } else {
          HomescreenLauncher.getHomescreen().ensure();
        }
      }

      // We will only bring apps to the foreground when the message
      // specifically requests it.
      if (!config.isActivity)
        return;

      var caller = runningApps[displayedApp];

      runningApps[config.origin].activityCaller = caller;
      caller.activityCallee = runningApps[config.origin];

      // XXX: the correct way would be for UtilityTray to close itself
      // when there is a appwillopen/appopen event.
      UtilityTray.hide();

      setDisplayedApp(config.origin);
    }
  };

  // Return the object that holds the public API
  return {
    getDisplayedApp: function() {
      return AppWindowManager.displayedApp;
    },
    getRunningApps: function() {
      return AppWindowManager.runningApps;
    },
    setDisplayedApp: AppWindowManager.display.bind(AppWindowManager),
    getCurrentDisplayedApp: function() {
      return AppWindowManager.displayedApp;
    },
    getCachedScreenshotForApp: function(origin) {
      var app = runningApps[origin];
      if (!app)
        return null;
      return app.getCachedScreenshot();
    },
    saveScreenshotForApp: function(origin, screenshot) {
      var app = runningApps[origin];
      if (!app)
        return;
      app.saveScreenshot(screenshot);
    },
    getCurrentActiveAppWindow: function() {
      return AppWindowManager._activeApp;
    }
  };
}());
