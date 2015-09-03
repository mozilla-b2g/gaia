/* global UrlHelper, AppWindow, BrowserConfigHelper, LazyLoader,
          SettingsListener */

(function(exports) {

  'use strict';

  var privateByDefault = false;

  function handleSettingChange (value) {
    privateByDefault = value;
  }

  SettingsListener.observe('browser.private.default', false,
    handleSettingChange);

  function handleOpenUrl(url, isPrivate) {
    var config = new BrowserConfigHelper({url: url});
    config.oop = true;
    config.isPrivate = isPrivate;
    var newApp = new AppWindow(config);

    newApp.requestOpen();
  }

  function Browser() {}

  Browser.prototype = {

    start: function() {
      window.addEventListener('new-private-window',
        this.newPrivateWindow.bind(this));
      window.addEventListener('activity-view',
        this.handleActivity.bind(this));
    },

    handleActivity: function(e) {
      // Activities can send multiple names, right now we only handle
      // one so we only filter on types
      var data = e.detail.source.data;
      switch (data.type) {
        case 'url':
          LazyLoader.load(['shared/js/url_helper.js']).then(function() {
            var url = UrlHelper.getUrlFromInput(data.url);
            var isPrivate = data.hasOwnProperty('isPrivate') ?
              data.isPrivate : privateByDefault;

            handleOpenUrl(url, isPrivate);
          }).catch(function(err) {
            console.error(err);
          });
          break;
      }
    },

    /**
     * Opens a new private window.
     */
    newPrivateWindow: function() {
      var privateBrowserUrl = location.origin + '/private_browser.html';
      var config = new BrowserConfigHelper({url: privateBrowserUrl});
      config.oop = true;
      config.isPrivate = true;
      var newApp = new AppWindow(config);
      newApp.requestOpen();
    }
  };

  exports.Browser = Browser;

}(window));
