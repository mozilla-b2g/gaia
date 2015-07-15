/* global Service, LazyLoader, IconsHelper */
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
      'clear.browser.history',
      function clearHistory() {
        Service.request('Places:clear');
      }
    );

    this.addRemoteRequestSetting(
      'clear.browser.private-data',
      function clearPrivateData() {
        var request = navigator.mozApps.getSelf();
        request.onsuccess = function() {
          request.result.clearBrowserData();
        };

        // Clear the icon dataStore.
        LazyLoader.load('shared/js/icons_helper.js').then(() => {
          IconsHelper.clear();
        });
      }
    );
  };

  exports.BrowserSettings = BrowserSettings;
})(window);
