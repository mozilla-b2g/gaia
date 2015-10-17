/**
 * Homescreen detail panel.
 */
define(function(require) {
  'use strict';

  const MANIFEST_URL_PREF = 'homescreen.manifestURL';
  const DEFAULT_MANIFEST = 'app://homescreen.gaiamobile.org/manifest.webapp';

  var SettingsService = require('modules/settings_service');
  var mozApps = require('modules/navigator/mozApps');
  var ManifestHelper = require('shared/manifest_helper');

  var HomescreenDetails = function ctor_homescreen_details() {
    this._elements = {};
    this._app = null;
  };

  HomescreenDetails.prototype = {
    /**
     * initialization.
     *
     * @param {Object} elements A list of HTML elements.
     */
    init: function hd_init(elements) {
      this._elements = elements;

      this._elements.uninstallButton.addEventListener('click',
        this.uninstall.bind(this));
    },

    /**
     * Update detail contents.
     *
     * @param {Object} options Home screen data
     */
    onBeforeShow: function hd_onBeforeShow(options) {
      options.author = options.author || { url: '', name: '' };
      options.version = options.version || '0.0.0';
      options.description = options.description || '';

      this._app = options.app;

      var iconSrc = '../style/images/default.png';
      var manifest = new ManifestHelper(this._app.manifest ||
        this._app.updateManifest);
      if (manifest.icons && Object.keys(manifest.icons).length) {
        var key = Object.keys(manifest.icons)[0];
        var iconUrl = manifest.icons[key];
        if (!(/^(http|https|data):/.test(iconUrl))) {
          iconUrl = this._app.origin + '/' + iconUrl;
        }
        iconSrc = iconUrl;
      }

      this._elements.icon.src = iconSrc;
      this._elements.headerTitle.textContent = options.name;
      this._elements.detailTitle.textContent = options.name;
      this._elements.detailName.textContent = options.author.name;
      this._elements.detailVersion.textContent = `v.${options.version}`;
      this._elements.detailDescription.textContent = options.description;
      this._elements.detailURLLink.href = options.author.url;
      this._elements.detailURLLink.textContent = options.author.url;
      this._elements.uninstallButton.disabled = !options.removable;
    },

    /**
     * Uninstall the current app.
     */
    uninstall: function hd_uninstall() {
      const settings = window.navigator.mozSettings;

      // Function to uninstall app and return to the previous panel.
      var uninstallApp = () => {
        mozApps.mgmt.uninstall(this._app).onsuccess = () => {
          this.back();
        };
      };

      // Change the home screen back to the default one if we're
      // uninstalling it.
      var manifestURL = this._app.manifestURL;
      var homescreenSetting = settings.createLock().get(MANIFEST_URL_PREF);
      homescreenSetting.onsuccess = () => {
        var homeManifestURL = homescreenSetting.result[MANIFEST_URL_PREF];
        if (homeManifestURL === manifestURL) {
          var settingObject = {};
          settingObject[MANIFEST_URL_PREF] = DEFAULT_MANIFEST;
          homescreenSetting = settings.createLock().set(settingObject);
          homescreenSetting.onsuccess = () => { uninstallApp(); };
        } else {
          uninstallApp();
        }
      };
    },

    /**
     * Back to the previous panel.
     */
    back: function hd_back() {
      SettingsService.navigate('homescreens-list');
    }
  };

  return () => new HomescreenDetails();
});
