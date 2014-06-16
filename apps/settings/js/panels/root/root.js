/* global TelephonySettingHelper, getSupportedLanguages */
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
    _refreshLocale: function root_refeshLocale() {
      // display the current locale in the main panel
      getSupportedLanguages(function displayLang(languages) {
        document.getElementById('language-desc').textContent =
          languages[navigator.mozL10n.language.code];
      });
    },

    // startup & language switching
    _initLocale: function root_initLocale() {
      navigator.mozL10n.ready(this._refreshLocale);
    },

    _initSimItems: function root_initSimItems() {
      // Show proper SIM items.
      if (navigator.mozMobileConnections) {
        if (navigator.mozMobileConnections.length == 1) { // single sim
          document.getElementById('simCardManager-settings').hidden = true;
        } else { // dsds
          document.getElementById('simSecurity-settings').hidden = true;
        }
      } else {
        // hide telephony panels
        var elements = ['call-settings',
                        'data-connectivity',
                        'messaging-settings',
                        'simSecurity-settings',
                        'simCardManager-settings'];
        elements.forEach(function(el) {
          document.getElementById(el).hidden = true;
        });
      }
    },

    _loadScripts: function root_loadScripts() {
      /**
       * Enable or disable the menu items related to the ICC card
       * relying on the card and radio state.
       */
      LazyLoader.load([
        'js/firefox_accounts/menu_loader.js',
        'shared/js/airplane_mode_helper.js',
        'js/airplane_mode.js',
        'js/storage.js',
        'js/try_show_homescreen_section.js',
        'js/security_privacy.js',
        'js/icc_menu.js',
        'js/nfc.js',
        'js/dsds_settings.js',
        'js/telephony_settings.js',
        'js/telephony_items_handler.js',
        'js/screen_lock.js'
      ], function() {
        TelephonySettingHelper
          .init()
          .then(function telephonySettingInitDone() {
            window.dispatchEvent(new CustomEvent('telephony-settings-loaded'));
          });
      });
    },

    init: function root_init() {
      this._initSimItems();
      this._initLocale();
      // Load the necessary scripts after the UI update.
      setTimeout(this._loadScripts);
    }
  };

  return function ctor_root() {
    return new Root();
  };
});
