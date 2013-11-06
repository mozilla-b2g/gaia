/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var WindowManager = (function() {
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
