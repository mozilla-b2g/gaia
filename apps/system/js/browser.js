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
    console.log('XXX open...' + url);
    var config = new BrowserConfigHelper({url: 'file://'+url});
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
        this.newPrivateWindow.bind(this));
      window.addEventListener('activity-view',
        this.handleActivity.bind(this));
      window.addEventListener('activity-open',
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
        case 'text/html':
          handleOpenUrl(data.url||data.filename, false);
          break;
      }
    },

    /**
     * Opens a new private window.
     */
    newPrivateWindow: function() {
      var config = new BrowserConfigHelper({
        url: 'app://search.gaiamobile.org/newtab.html?private=1',
        manifestURL: 'app://search.gaiamobile.org/manifest.webapp'
      });
      config.isMockPrivate = true;
      config.oop = true;
      config.isPrivate = true;
      var newApp = new AppWindow(config);
      newApp.requestOpen();
    }
  };

  exports.Browser = Browser;

}(window));
