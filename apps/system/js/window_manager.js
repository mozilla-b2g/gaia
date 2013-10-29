'use strict';

// Note: Deprecating, stop enhancing here.

var WindowManager = (function() {
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
