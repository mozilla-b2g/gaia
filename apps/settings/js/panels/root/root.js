/* global TelephonySettingHelper */
/**
 * The module loads scripts used by the root panel. In the future these scripts
 * must be converted to AMD modules. Implementation details please refer to
 * {@link Root}.
 *
 * @module root/root
 */
define(function(require) {
  'use strict';

  var LazyLoader = require('shared/lazy_loader');

  /**
   * @alias module:root/root
   * @class Root
   * @requires module:shared/lazy_loader
   * @returns {Root}
   */
  function Root() {}

  Root.prototype = {
    _panel: null,
    _loadScripts: function root_loadScripts() {
      /**
       * Enable or disable the menu items related to the ICC card
       * relying on the card and radio state.
       */
      LazyLoader.load([
        'js/firefox_accounts/menu_loader.js',
        'js/dsds_settings.js',
        'js/telephony_settings.js',
        'js/telephony_items_handler.js'
      ], function() {
        TelephonySettingHelper
          .init()
          .then(function telephonySettingInitDone() {
            window.dispatchEvent(new CustomEvent('telephony-settings-loaded'));
          });
      });
    },

    /**
     * Update the sim related items based on mozMobileConnections.
     */
    _showSimItems: function root_showSimItems(panel) {
      var mozMobileConnections = navigator.mozMobileConnections;
      if (mozMobileConnections) {
        if (mozMobileConnections.length === 1) { // single sim
          var duelSimItem =
            this._panel.querySelector('#simCardManager-settings');
          duelSimItem.hidden = true;
        } else { // DSDS
          var simItem = this._panel.querySelector('#simSecurity-settings');
          simItem.hidden = true;
        }
      } else {
        // hide telephony panels
        var elements = ['#call-settings',
                        '#data-connectivity',
                        '#messaging-settings',
                        '#simSecurity-settings',
                        '#simCardManager-settings'];
        elements.forEach(el => {
          this._panel.querySelector(el).hidden = true;
        });
      }
    },
    /**
     * Update the developer menu item based on the preference.
     */
    _showDeveloperMenuItem: function root_showDeveloperMenuItem() {
      var developerItem = this._panel.querySelector(
        '[data-show-name="developer.menu.enabled"]');
      if (developerItem && navigator.mozSettings) {
        return navigator.mozSettings.createLock()
          .get('developer.menu.enabled').then(
            function(result) {
              developerItem.hidden = !result['developer.menu.enabled'];
          }, function(error) {
            console.error(error);
          });
      } else {
        return Promise.resolve();
      }
    },

    // To delay the show/hide in root panel will cause extra screen reflow,
    // it can be checked by Toggle on Developer > Flash Repainted Area.
    init: function root_init(panel) {
      this._panel = panel;
      // Load the necessary scripts after the UI update
      setTimeout(this._loadScripts);

      // Show NFC panel when supported
      var nfcItem = panel.querySelector('.nfc-settings');
      nfcItem.hidden = !navigator.mozNfc;

      // Show proper SIM panel
      this._showSimItems();
      // Show developer panel when necessary
      this._showDeveloperMenuItem();
    }
  };

  return function ctor_root() {
    return new Root();
  };
});
