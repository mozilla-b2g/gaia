'use strict';
/* global applications */
/* global AppWindow */
/* global BrowserConfigHelper */
/* global SettingsListener */
/* global Service */

(function(exports) {

  function SearchWindow() {
    this.instanceID = 'search';
    this.publish('created');

    this._setBrowserConfig = this.setBrowserConfig.bind(this);
    SettingsListener.observe('rocketbar.searchAppURL', '',
      this._setBrowserConfig);

    return this;
  }

  SearchWindow.REGISTERED_EVENTS = [
    // Let our parent AppWindow handle error events.
    'mozbrowsererror',
    'mozbrowserlocationchange'
  ];

  SearchWindow.SUB_COMPONENTS = {
    'childWindowFactory': 'ChildWindowFactory',
    'transitionController': 'AppTransitionController',
    'valueSelector': 'ValueSelector'
  };

  SearchWindow.SUB_MODULES = {
    'contextmenu': 'BrowserContextMenu'
  };

  SearchWindow.prototype = Object.create(AppWindow.prototype);

  SearchWindow.prototype.constructor = SearchWindow;

  SearchWindow.SUSPENDING_ENABLED = false;

  SearchWindow.prototype._DEBUG = false;

  SearchWindow.prototype.CLASS_NAME = 'SearchWindow';

  SearchWindow.prototype.CLASS_LIST = 'appWindow searchWindow';

  SearchWindow.prototype.HIERARCHY_MANAGER = 'Rocketbar';

  SearchWindow.prototype.openAnimation = 'immediate';

  SearchWindow.prototype.closeAnimation = 'immediate';

  SearchWindow.prototype.eventPrefix = 'search';

  SearchWindow.prototype.containerElement =
    document.getElementById('rocketbar-results');

  SearchWindow.prototype.view = function aw_view() {
    return `<div class="${this.CLASS_LIST}" id="${this.instanceID}"
             transition-state="closed">
             <div class="browser-container"></div>
           </div>`;
  };

  // The search window orientation depends on the orientation of
  // current root app.
  SearchWindow.prototype.lockOrientation = function() {
    // XXX: Tell AppWindowManager to do this.
    var currentApp = Service.query('AppWindowManager.getActiveWindow');
    currentApp && currentApp.setOrientation();
  };

  // We don't need to wait.
  // Kill process will call requestclose to let manager decide
  // if we want to wait the background needs repaint,
  // but we don't need it right now.
  SearchWindow.prototype.requestClose = function() {
    this.close();
  };

  /**
   * Overrides appWindow.destroy.
   * Unobserves from any living listeners.
   */
  SearchWindow.prototype.destroy = function() {
    SettingsListener.unobserve('rocketbar.searchAppURL',
      this._setBrowserConfig);
    AppWindow.prototype.destroy.call(this);
  };

  /**
   * Construct browser config object by manifestURL.
   * @param {String} url The settings url of the search app.
   */
  SearchWindow.prototype.setBrowserConfig = function(url) {
    var manifestURL = url ? url.match(/(^.*?:\/\/.*?\/)/)[1] +
      'manifest.webapp' : '';
    this.manifestURL = manifestURL;
    this.searchAppURL = url;

    var app = applications.getByManifestURL(manifestURL);
    this.origin = app.origin;
    this.manifestURL = app.manifestURL;
    this.url = app.origin + '/index.html';

    this.browser_config =
      new BrowserConfigHelper({
        url: this.origin,
        manifestURL: this.manifestURL
      });

    this.manifest = this.browser_config.manifest;
    this.browser_config.url = this.url;
    this.browser_config.isSearch = true;
    this.config = this.browser_config;
    this.isSearch = true;
    this.name = this.manifest.name;

    this.render();
    this.open();
  };

  exports.SearchWindow = SearchWindow;

}(window));
