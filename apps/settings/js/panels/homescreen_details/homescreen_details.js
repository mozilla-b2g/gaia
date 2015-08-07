/**
 * Homescreen detail panel.
 */
define(require => {
  'use strict';

  const DEFAULT_MANIFEST = 'app://verticalhome.gaiamobile.org/manifest.webapp';

  var SettingsService = require('modules/settings_service');
  var mozApps = require('modules/navigator/mozApps');

  var HomescreenDetails = function ctor_homescreen_details() {
    this._elements = {};
    this._app = null;
  };

  HomescreenDetails.prototype = {
    /**
     * initialization.
     * @param {Object} elements A list of HTML elements.
     */
    init: function hd_init(elements) {
      this._elements = elements;

      this._elements.uninstallButton.addEventListener('click',
        this.uninstall.bind(this));
    },

    /**
     * update detail contents.
     * @param {Object} options Homescreen data
     */
    onBeforeShow: function hd_onBeforeShow(options) {
      options.author = options.author || {url: '', name: ''};
      options.version = options.version || '0.0.0';
      options.description = options.description || '';

      this._elements.detailTitle.textContent = options.name;
      this._elements.detailURLLink.href = options.author.url;
      this._elements.detailName.textContent = options.author.name;
      this._elements.detailURL.textContent = options.author.url;
      this._elements.detailVersion.textContent = `v.${options.version}`;
      this._elements.detailDescription.textContent = options.description;
      this._elements.uninstallButton.disabled = !options.removable;

      this._app = options.app;
    },

    /**
     * Uninstall the current app.
     */
    uninstall: function hd_uninstall() {
      mozApps.mgmt.uninstall(this._app).onsuccess = () => {
        const settings = window.navigator.mozSettings;

        // Change the homescreen back to the default one.
        var homescreenSetting = settings.createLock().set({
          'homescreen.manifestURL': DEFAULT_MANIFEST
        });
        homescreenSetting.onsuccess = () => {
          this.back();
        };
      };
    },

    /**
     * Back to the previous panel.
     */
    back: function hd_back() {
      SettingsService.navigate('homescreen-list');
    }
  };

  return () => new HomescreenDetails();
});
