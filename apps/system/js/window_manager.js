'use strict';

// Note: Deprecating, stop enhancing here.

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
    getCurrentActiveAppWindow: function() {
      return AppWindowManager._activeApp;
    }
  };
}());
