'use strict';
/* global applications */
/* global AppWindow */
/* global BrowserConfigHelper */
/* global SettingsListener */

(function(exports) {

  function SearchWindow() {
    this.instanceID = 'search';
    this.publish('created');

    SettingsListener.observe('rocketbar.searchAppURL', '',
      this.setBrowserConfig.bind(this));

    return this;
  }

  SearchWindow.REGISTERED_EVENTS = [
    // Let our parent AppWindow handle error events.
    'mozbrowsererror'
  ];

  SearchWindow.SUB_COMPONENTS = {};

  SearchWindow.prototype = {
    __proto__: AppWindow.prototype,

    _DEBUG: false,

    CLASS_NAME: 'Search',

    CLASS_LIST: 'appWindow searchWindow',

    openAnimation: 'immediate',

    closeAnimation: 'immediate',

    eventPrefix: 'search',

    containerElement: document.getElementById('rocketbar-results'),

    // We don't need to wait.
    // Kill process will call requestclose to let manager decide
    // if we want to wait the background needs repaint,
    // but we don't need it right now.
    requestClose: function() {
      this.close();
    },

    /**
     * Construct browser config object by manifestURL.
     * @param {String} url The settings url of the search app.
     */
    setBrowserConfig: function(url) {
      var manifestURL = url ? url.match(/(^.*?:\/\/.*?\/)/)[1] +
        'manifest.webapp' : '';
      this.manifestURL = manifestURL;
      this.searchAppURL = url;

      var app = applications.getByManifestURL(manifestURL);
      this.origin = app.origin;
      this.manifestURL = app.manifestURL;
      this.url = app.origin + '/index.html';

      this.browser_config =
        new BrowserConfigHelper(this.origin, this.manifestURL);

      this.manifest = this.browser_config.manifest;
      this.browser_config.url = this.url;
      this.browser_config.isSearch = true;
      this.config = this.browser_config;
      this.isSearch = true;

      this.render();
      this.open();
    }
  };

  exports.SearchWindow = SearchWindow;

}(window));
