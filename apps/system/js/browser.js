/* global UrlHelper, AppWindow, BrowserConfigHelper, LazyLoader,
          SettingsListener */

(function(exports) {

  'use strict';

  function handleSettingChange (value) {
    Browser.privateByDefault = value;
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

  Browser.privateByDefault = false;

  Browser.prototype = {

    start: function() {
      window.addEventListener('new-private-window',
        this.newWindow.bind(this));
      window.addEventListener('new-non-private-window',
        this.newWindow.bind(this));
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
              data.isPrivate : Browser.privateByDefault;

            handleOpenUrl(url, isPrivate);
          }).catch(function(err) {
            console.error(err);
          });
          break;
      }
    },

    /**
     * Opens a new browser window.
     */
    newWindow: function(e) {
      var basePath = 'app://search.gaiamobile.org';
      var isPrivate = e && e.type === 'new-private-window';
      var privateFlag = isPrivate ? '1' : '0';
      var config = new BrowserConfigHelper({
        url: basePath + '/newtab.html?private=' + privateFlag,
        manifestURL: basePath + '/manifest.webapp'
      });

      if (isPrivate) {
        config.isMockPrivate = true;
        config.isPrivate = true;
      }

      config.oop = true;

      var newApp = new AppWindow(config);
      newApp.requestOpen();
    }
  };

  exports.Browser = Browser;

}(window));
