/* global BookmarksDatabase */

(function(exports) {
  'use strict';

  function BrowserSettings() {
  }

  // Use a setting in order to be "called" by settings app
  BrowserSettings.prototype.addRemoteRequestSetting =
                                    function(key, requestFunction) {
    function observer(setting) {
      var isRequested = setting.settingValue;
      if (!isRequested) {
        return;
      }

      requestFunction();

      // Reset the setting value to false
      var lock = navigator.mozSettings.createLock();
      var falseSetting = {};
      falseSetting[key] = false;
      lock.set(falseSetting);
    }

    navigator.mozSettings.addObserver(key, observer);

    var getRequest = navigator.mozSettings.createLock().get(key);
    getRequest.onsuccess = function() {
      observer({settingName: key, settingValue: getRequest.result[key]});
    };
  };

  BrowserSettings.prototype.start = function() {
    this.addRemoteRequestSetting(
      'clear.browser.bookmarks',
      function clearBrowserBookmarks() {
        return BookmarksDatabase.clear();
      }
    );

    this.addRemoteRequestSetting(
      'clear.browser.history',
      function clearHistory() {
        window.places.clear();
      }
    );

    this.addRemoteRequestSetting(
      'clear.browser.private-data',
      function clearPrivateData() {
        var request = navigator.mozApps.getSelf();
        request.onsuccess = function() {
          request.result.clearBrowserData();
        };
      }
    );
  };

  exports.BrowserSettings = BrowserSettings;
})(window);
