/* global UrlHelper, AppWindow, BrowserConfigHelper, LazyLoader */

(function(exports) {

  'use strict';

  function handleOpenUrl(url, isPrivate) {
    var config = new BrowserConfigHelper({url: url});
    config.oop = true;
    config.isPrivate = isPrivate;
    var newApp = new AppWindow(config);

    newApp.requestOpen();
  }

  function Browser() {}

  /**
   * Opens a new private window.
   * @param {String} url The url to navigate to
   */
  Browser.prototype = {

    start: function() {
      window.addEventListener('new-private-window',
        this.newPrivateWindow.bind(this));
      window.navigator.mozSetMessageHandler('activity',
        this.handleActivity.bind(this));
    },

    handleActivity: function(activity) {
      // Activities can send multiple names, right now we only handle
      // one so we only filter on types
      var data = activity.source.data;
      switch (data.type) {
        case 'url':
          if (!window.UrlHelper) {
            LazyLoader.load(['shared/js/url_helper.js']).then(function() {
              handleOpenUrl(
                UrlHelper.getUrlFromInput(data.url), data.isPrivate);
            }).catch(function(err) {
              console.error(err);
            });
          } else {
            handleOpenUrl(UrlHelper.getUrlFromInput(data.url), data.isPrivate);
          }
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
